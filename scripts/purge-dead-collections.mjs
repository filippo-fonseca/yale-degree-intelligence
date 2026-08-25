#!/usr/bin/env node
/**
 * Deletes the data left behind by the Dan advisor and the per-user MCP server,
 * both removed in July 2026.
 *
 * firestore.rules now denies clients every one of these collections, but rules
 * do not delete anything and the Admin SDK bypasses them, so the documents are
 * still sitting there. Two reasons to be rid of them:
 *
 * - dan_keys and mcp_tokens held per-user credentials: BYOK API keys and MCP
 *   tokens. Stale third-party secrets are the worst thing to keep, because
 *   nobody is watching them and the user has no way to see they still exist.
 * - ai_responses, cleoai_conversations and conversations are chat history for
 *   a feature that no longer exists. It is PII we have no reason to hold, and
 *   the repo is about to be public, which invites people to go looking for
 *   exactly this.
 *
 * Idempotent, batched, and --dry-run by default in the sense that it will tell
 * you what it would delete before you let it. Run the dry run first.
 *
 *   node scripts/purge-dead-collections.mjs --dry-run
 *   node scripts/purge-dead-collections.mjs --confirm
 *
 * Needs FIREBASE_SERVICE_ACCOUNT_KEY in .env.local.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

/** Everything the removed features wrote. */
const DEAD_COLLECTIONS = [
  "dan_keys",
  "mcp_tokens",
  "ai_responses",
  "cleoai_conversations",
  "conversations",
];

const DRY_RUN = !process.argv.includes("--confirm");
const BATCH_SIZE = 400;

function loadEnv() {
  const envPath = path.join(REPO_ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) continue;
    process.env[key] = rawValue.trim().replace(/^["']|["']$/g, "");
  }
}

function db() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env.local (gitignored).",
    );
  }
  if (getApps().length === 0) {
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getFirestore();
}

/**
 * Delete a collection in batches.
 *
 * Paged by document rather than held in one list: these collections are small
 * now, but a delete script that assumes it can fit a collection in memory is
 * the kind of thing that gets reused later on one that cannot.
 */
async function purge(firestore, name) {
  let deleted = 0;

  for (;;) {
    const snapshot = await firestore.collection(name).limit(BATCH_SIZE).get();
    if (snapshot.empty) break;

    if (DRY_RUN) {
      // Count the whole collection once, then stop: without deleting, the same
      // page would come back forever.
      const total = (await firestore.collection(name).count().get()).data()
        .count;
      console.log(`  ${name}: ${total} document(s) would be deleted`);
      return total;
    }

    const batch = firestore.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    deleted += snapshot.size;
    console.log(`  ${name}: deleted ${deleted}...`);
  }

  if (!DRY_RUN) {
    console.log(`  ${name}: ${deleted} document(s) deleted`);
  }
  return deleted;
}

async function main() {
  loadEnv();
  const firestore = db();

  console.log(
    DRY_RUN
      ? "dry run: nothing will be deleted\n"
      : "DELETING. This cannot be undone.\n",
  );

  let total = 0;
  for (const name of DEAD_COLLECTIONS) {
    total += await purge(firestore, name);
  }

  console.log(
    DRY_RUN
      ? `\n${total} document(s) in total. Re-run with --confirm to delete them.`
      : `\ndone: ${total} document(s) deleted`,
  );
}

main().catch((error) => {
  console.error(`purge: ${error.message}`);
  process.exit(1);
});
