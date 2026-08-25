#!/usr/bin/env node
/**
 * Send one class year's campaign email, one message per recipient.
 *
 * The broadcast path (send-campaign.mjs) is the better product, but it bills on
 * audience size, so this is the same campaign over the transactional endpoint,
 * which bills on sends. Everything the recipient sees is identical: same From
 * on the verified domain, same Reply-To, same subject, same HTML. The two
 * things a broadcast gave us for free are rebuilt here:
 *
 *   - the unsubscribe link, which /emails does not substitute, is generated
 *     per recipient and signed, and also travels in List-Unsubscribe so the
 *     mail client's own button works;
 *   - the suppression list, which is pulled from Firestore before the run and
 *     re-checked, so anyone who opted out of an earlier send is skipped.
 *
 * NOBODY IS EMAILED TWICE. The ledger is written BEFORE the send, not after.
 * A crash between the two therefore drops one message rather than repeating
 * it, which is the right way round: a student who gets nothing is a smaller
 * failure than a student who gets the same mail twice, and the ledger tells us
 * exactly which address it was.
 *
 * Nothing sends without --confirm.
 *
 *   node scripts/email/send-transactional-campaign.mjs --year 2030 --variant frosh
 *   node scripts/email/send-transactional-campaign.mjs --year 2030 --variant frosh --confirm
 */

import fs from "node:fs";
import path from "node:path";
import { createHmac } from "node:crypto";

import { FROM_NAME, REPLY_TO, REPO_ROOT, loadEnv, parseArgs, requireEnv, resendRequest } from "./lib.mjs";

const FROM_ADDRESS = "filippo@degreeint.com";
const SITE_URL = "https://degreeint.com";

const VARIANTS = {
  existing: { file: "v3-existing.html", subject: "v3 is here" },
  frosh: { file: "v3-frosh.html", subject: "Welcome to Yale" },
  newcomers: {
    file: "v3-newcomers.html",
    subject: "1 in 6 Yalies use this. Why don't you?",
  },
};

/** Mirrors lib/emailUnsubscribe.ts. Both sides must agree or no link works. */
function signUnsubscribe(email, secret) {
  return createHmac("sha256", secret)
    .update(email.trim().toLowerCase())
    .digest("hex")
    .slice(0, 32);
}

function unsubscribeUrl(email, secret) {
  const normalized = email.trim().toLowerCase();
  const token = signUnsubscribe(normalized, secret);
  return `${SITE_URL}/unsubscribe?e=${encodeURIComponent(normalized)}&t=${token}`;
}

function rosterPath(year) {
  return path.join(REPO_ROOT, "lists", `${year}.roster.json`);
}

function sentLedgerPath(year, variant) {
  return path.join(REPO_ROOT, "lists", `${year}.${variant}.sent.json`);
}

function readRoster(year) {
  const file = rosterPath(year);
  if (!fs.existsSync(file)) {
    throw new Error(
      `missing ${file}. Run: node scripts/email/parse-list.mjs --year ${year} --in lists/${year}.txt`,
    );
  }
  const roster = JSON.parse(fs.readFileSync(file, "utf8"));
  const emails = Array.isArray(roster) ? roster : roster.emails;
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error(`${file} holds no addresses`);
  }
  // Second dedupe. parse-list already did this; the send is the last gate and
  // it is cheap to be certain.
  return [...new Set(emails.map((e) => e.trim().toLowerCase()))];
}

function readLedger(year, variant) {
  const file = sentLedgerPath(year, variant);
  if (!fs.existsSync(file)) return { attempted: [], failed: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeLedger(year, variant, ledger) {
  fs.writeFileSync(sentLedgerPath(year, variant), JSON.stringify(ledger, null, 2));
}

/**
 * Everyone who has opted out, straight from Firestore. Read through the Admin
 * SDK rather than the public route: there is no endpoint that lists opt-outs,
 * deliberately, and there should not be one.
 */
async function readSuppressions() {
  loadEnv();
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!key) return null;

  // Initialized here rather than imported from config/firebaseAdmin.ts, which
  // is TypeScript behind a path alias and does not resolve from a plain script.
  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");
  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert(JSON.parse(key)),
        projectId: "yale-degree-intelligence",
      });

  const snapshot = await getFirestore(app).collection("email_unsubscribes").get();
  return new Set(snapshot.docs.map((doc) => doc.id.trim().toLowerCase()));
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    values: ["year", "variant", "to"],
    flags: ["confirm", "skip-suppression-check"],
  });

  const { year, variant: variantName } = args;
  if (!year) throw new Error("--year <class year> is required");
  if (!VARIANTS[variantName]) {
    throw new Error(`--variant must be one of ${Object.keys(VARIANTS).join(", ")}`);
  }

  const secret = requireEnv("EMAIL_UNSUBSCRIBE_SECRET");
  const variant = VARIANTS[variantName];
  const htmlPath = path.join(REPO_ROOT, "emails", "dist", variant.file);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`missing ${variant.file}. Run: node emails/build.mjs`);
  }

  const template = fs.readFileSync(htmlPath, "utf8");
  if (!template.includes("{{{RESEND_UNSUBSCRIBE_URL}}}")) {
    throw new Error(`${variant.file} has no unsubscribe token. Rebuild it.`);
  }

  // --to sends the real campaign, through this exact code path, to one
  // address. It is how the flow gets checked before it is pointed at a class.
  const roster = args.to ? [args.to.trim().toLowerCase()] : readRoster(year);
  const ledgerKey = args.to ? `${variantName}.test` : variantName;
  const ledger = readLedger(year, ledgerKey);
  const attempted = new Set(ledger.attempted);

  let suppressed = new Set();
  if (!args["skip-suppression-check"]) {
    const fromDb = await readSuppressions();
    if (fromDb === null) {
      throw new Error(
        "could not read email_unsubscribes (no admin credentials). Pass --skip-suppression-check only if you know the list is empty.",
      );
    }
    suppressed = fromDb;
  }

  const pending = roster.filter(
    (email) => !attempted.has(email) && !suppressed.has(email),
  );

  console.log(`class of ${year}, variant ${variantName}`);
  console.log(`  roster           ${roster.length}`);
  console.log(`  already sent     ${attempted.size}`);
  console.log(`  unsubscribed     ${suppressed.size}`);
  console.log(`  to send now      ${pending.length}`);
  console.log(`  subject          ${variant.subject}`);
  console.log(`  from             ${FROM_NAME} <${FROM_ADDRESS}>`);
  console.log(`  reply-to         ${REPLY_TO}`);

  if (!args.confirm) {
    console.log("\ndry run. Nothing was sent. Re-run with --confirm.");
    return;
  }

  let sent = 0;
  for (const email of pending) {
    // Written first, on purpose. See the note at the top of this file.
    ledger.attempted.push(email);
    writeLedger(year, ledgerKey, ledger);

    const url = unsubscribeUrl(email, secret);
    const html = template.replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", url);

    try {
      await resendRequest("POST", "/emails", {
        from: `${FROM_NAME} <${FROM_ADDRESS}>`,
        to: [email],
        reply_to: REPLY_TO,
        subject: variant.subject,
        html,
        headers: {
          // RFC 8058: the client's own Unsubscribe button posts to this URL.
          "List-Unsubscribe": `<${url}>, <mailto:${REPLY_TO}?subject=Unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });
      sent += 1;
    } catch (error) {
      ledger.failed.push({ email, error: error.message });
      writeLedger(year, ledgerKey, ledger);
      console.log(`  ! ${email}: ${error.message}`);
    }

    if (sent % 50 === 0 && sent > 0) {
      console.log(`  ${sent}/${pending.length}`);
    }
  }

  writeLedger(year, ledgerKey, ledger);
  console.log(`\nsent ${sent}, failed ${ledger.failed.length}`);
  console.log(`ledger: ${sentLedgerPath(year, ledgerKey)}`);
}

main().catch((error) => {
  console.error(`send-transactional-campaign: ${error.message}`);
  process.exit(1);
});
