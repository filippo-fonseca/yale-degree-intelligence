#!/usr/bin/env node
/**
 * One-off migration for the friends privacy split.
 *
 * Run this BEFORE deploying the tightened rules. Two jobs:
 *
 * 1. friends_directory: every account with friends enabled gets a discovery
 *    entry. The app writes one on its next sync, but an account whose owner
 *    does not open DI would silently vanish from everyone's search until they
 *    did, so we seed them all up front.
 *
 * 2. friends_lookup: the new read rule on friends_public_data calls
 *    areFriends(), which checks for a friends_lookup document. Those have been
 *    written on accept for a while, but any friendship predating that route
 *    has no lookup doc, and after the rules land those two people would stop
 *    being able to open each other's pages. This reconciles friends ->
 *    friends_lookup so nobody loses access they already had.
 *
 * Idempotent: it writes only what is missing or stale, and prints what it did.
 * Pass --dry-run first.
 *
 *   node scripts/backfill-friends-directory.mjs --dry-run
 *   node scripts/backfill-friends-directory.mjs
 *
 * Needs FIREBASE_SERVICE_ACCOUNT_KEY in .env.local, the same credential the
 * API routes use.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const DRY_RUN = process.argv.includes("--dry-run");

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
  const credentials = JSON.parse(raw);
  if (getApps().length === 0) {
    initializeApp({ credential: cert(credentials) });
  }
  return getFirestore();
}

function directoryIsCurrent(existing, next) {
  return (
    existing?.enabled === true &&
    existing?.displayName === next.displayName &&
    existing?.photoURL === next.photoURL &&
    existing?.graduationYear === next.graduationYear &&
    JSON.stringify(existing?.majors ?? []) === JSON.stringify(next.majors)
  );
}

async function backfillDirectory(firestore) {
  const snapshot = await firestore.collection("friends_public_data").get();
  let written = 0;
  let current = 0;
  let skipped = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    if (!data?.enabled) {
      skipped += 1;
      continue;
    }

    const next = {
      userId: docSnap.id,
      enabled: true,
      displayName: data.displayName ?? null,
      photoURL: data.photoURL ?? null,
      majors: data.majors ?? [],
      graduationYear: data.graduationYear ?? null,
    };

    const ref = firestore.collection("friends_directory").doc(docSnap.id);
    const existing = (await ref.get()).data();
    if (directoryIsCurrent(existing, next)) {
      current += 1;
      continue;
    }

    if (!DRY_RUN) {
      await ref.set({ ...next, updatedAt: FieldValue.serverTimestamp() });
    }
    written += 1;
  }

  console.log(
    `directory: ${written} ${DRY_RUN ? "would be written" : "written"}, ${current} already current, ${skipped} not enabled`,
  );
}

async function backfillLookups(firestore) {
  const snapshot = await firestore.collection("friends").get();
  let written = 0;
  let current = 0;
  let malformed = 0;

  for (const docSnap of snapshot.docs) {
    const users = docSnap.data()?.users;
    if (!Array.isArray(users) || users.length !== 2) {
      malformed += 1;
      continue;
    }

    // Same id the rules compute in getFriendshipId(): sorted, underscore-joined.
    const [a, b] = [...users].sort();
    const ref = firestore.collection("friends_lookup").doc(`${a}_${b}`);
    if ((await ref.get()).exists) {
      current += 1;
      continue;
    }

    if (!DRY_RUN) {
      await ref.set({
        users: [a, b],
        createdAt: docSnap.data()?.createdAt ?? FieldValue.serverTimestamp(),
      });
    }
    written += 1;
  }

  console.log(
    `lookups:   ${written} ${DRY_RUN ? "would be written" : "written"}, ${current} already present, ${malformed} malformed friendship docs`,
  );
}

async function main() {
  loadEnv();
  const firestore = db();

  if (DRY_RUN) console.log("dry run: nothing will be written\n");

  await backfillLookups(firestore);
  await backfillDirectory(firestore);

  console.log(
    DRY_RUN
      ? "\nre-run without --dry-run to apply, then deploy the rules"
      : "\ndone. safe to deploy firestore.rules now",
  );
}

main().catch((error) => {
  console.error(`backfill: ${error.message}`);
  process.exit(1);
});
