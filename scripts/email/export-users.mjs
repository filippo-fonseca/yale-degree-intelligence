#!/usr/bin/env node
/**
 * Export every address that already has a DegreeIntelligence account.
 *
 * This is the file that keeps the two campaigns disjoint. The newcomer email
 * opens with "you haven't signed up yet" and the returning email opens with
 * "thank you for signing up", so sending either one to the wrong half is worse
 * than not sending at all.
 *
 * Read from Firebase Auth rather than the users collection. A users doc is only
 * written once someone finishes major selection (MajorSelectionFlow), so a
 * student who signed in and stopped has an account but no doc. Auth is the
 * record of who has an account; the collection is a record of who onboarded.
 *
 * Writes lists/existing-users.txt (gitignored), one address per line, so it can
 * be handed straight to parse-list.mjs as --exclude or --intersect.
 *
 *   node scripts/email/export-users.mjs
 *   node scripts/email/export-users.mjs --out lists/existing-users.txt
 */

import fs from "node:fs";
import path from "node:path";

import { REPO_ROOT, loadEnv, parseArgs } from "./lib.mjs";

async function authClient() {
  loadEnv();
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY is not set. Add it to .env.local and re-run.",
    );
  }

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(JSON.parse(key)),
        projectId: "yale-degree-intelligence",
      });

  return getAuth(app);
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { values: ["out"], flags: [] });
  const outPath = path.join(REPO_ROOT, args.out ?? "lists/existing-users.txt");

  const auth = await authClient();

  // listUsers pages at 1000. Follow the cursor to the end rather than taking
  // the first page, which would silently under-report and push real users into
  // the newcomer list.
  const emails = new Set();
  let accounts = 0;
  let noEmail = 0;
  let pageToken;

  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      accounts += 1;
      if (!user.email) {
        noEmail += 1;
        continue;
      }
      emails.add(user.email.trim().toLowerCase());
    }
    pageToken = page.pageToken;
  } while (pageToken);

  const sorted = [...emails].sort();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${sorted.join("\n")}\n`);

  console.log(`accounts        ${accounts}`);
  console.log(`without email   ${noEmail}`);
  console.log(`unique emails   ${sorted.length}`);
  console.log(`wrote           ${path.relative(REPO_ROOT, outPath)}`);
}

main().catch((error) => {
  console.error(`export-users: ${error.message}`);
  process.exit(1);
});
