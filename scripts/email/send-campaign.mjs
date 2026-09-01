#!/usr/bin/env node
/**
 * Send one class year's campaign email, as a Resend broadcast.
 *
 * A broadcast rather than a loop over /emails, for one reason that matters:
 * the unsubscribe link. The footer carries {{{RESEND_UNSUBSCRIBE_URL}}}, and
 * only broadcasts substitute it. Sent through the per-message endpoint, every
 * recipient would get that raw token as a dead link, which is both the wrong
 * thing to do to 1,600 students and the fastest way to teach a mail provider
 * that this sender should be filtered.
 *
 * The audience is built from the roster parse-list.mjs produces, so the only
 * addresses that can reach the API have already been validated and deduped.
 * Importing is resumable: every contact that lands is written to a ledger, and
 * a re-run skips what the ledger already holds rather than starting over.
 *
 * Nothing sends without --confirm. Without it this prints the plan and stops.
 *
 *   node scripts/email/send-campaign.mjs --year 2030 --variant frosh
 *   node scripts/email/send-campaign.mjs --year 2030 --variant frosh --confirm
 */

import fs from "node:fs";
import path from "node:path";

import { FROM_NAME, REPLY_TO, REPO_ROOT, parseArgs, resendRequest } from "./lib.mjs";

const FROM_ADDRESS = "filippo@degreeint.com";

/** Keyed by audience; the same three the builder emits. */
const VARIANTS = {
  existing: {
    file: "v3-existing.html",
    subject: "Are you sure you chose the right classes?",
  },
  frosh: { file: "v3-frosh.html", subject: "Welcome to Yale" },
  newcomers: {
    file: "v3-newcomers.html",
    subject: "1 in 6 Yalies use this. Why don't you?",
  },
};

function readRoster(year) {
  const rosterPath = path.join(REPO_ROOT, "lists", `${year}.roster.json`);
  if (!fs.existsSync(rosterPath)) {
    throw new Error(
      `missing ${rosterPath}. Run: node scripts/email/parse-list.mjs --year ${year} --in lists/${year}.txt`,
    );
  }
  const roster = JSON.parse(fs.readFileSync(rosterPath, "utf8"));
  const emails = Array.isArray(roster) ? roster : roster.emails;
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error(`${rosterPath} holds no addresses`);
  }
  return emails;
}

function ledgerPath(year) {
  return path.join(REPO_ROOT, "lists", `${year}.import-ledger.json`);
}

function readLedger(year) {
  const file = ledgerPath(year);
  if (!fs.existsSync(file)) return { audienceId: null, imported: [] };
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeLedger(year, ledger) {
  fs.writeFileSync(ledgerPath(year), JSON.stringify(ledger, null, 2));
}

async function main() {
  const args = parseArgs(process.argv.slice(2), {
    values: ["year", "variant"],
    flags: ["confirm"],
  });

  const year = args.year;
  const variantName = args.variant;
  if (!year) throw new Error("--year <class year> is required");
  if (!VARIANTS[variantName]) {
    throw new Error(`--variant must be one of ${Object.keys(VARIANTS).join(", ")}`);
  }

  const variant = VARIANTS[variantName];
  const htmlPath = path.join(REPO_ROOT, "emails", "dist", variant.file);
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`missing ${variant.file}. Run: node emails/build.mjs`);
  }
  const html = fs.readFileSync(htmlPath, "utf8");

  // The token has to survive into the broadcast: it is what makes the footer's
  // unsubscribe link real.
  if (!html.includes("{{{RESEND_UNSUBSCRIBE_URL}}}")) {
    throw new Error(
      `${variant.file} has no unsubscribe token. Rebuild it before sending.`,
    );
  }

  const emails = readRoster(year);
  const ledger = readLedger(year);

  console.log(`class of ${year}, variant ${variantName}`);
  console.log(`  recipients   ${emails.length}`);
  console.log(`  subject      ${variant.subject}`);
  console.log(`  from         ${FROM_NAME} <${FROM_ADDRESS}>`);
  console.log(`  reply-to     ${REPLY_TO}`);
  console.log(`  already in   ${ledger.imported.length} (ledger)`);

  if (!args.confirm) {
    console.log("\ndry run. Nothing was created or sent. Re-run with --confirm.");
    return;
  }

  let audienceId = ledger.audienceId;
  if (!audienceId) {
    const audience = await resendRequest("POST", "/audiences", {
      name: `Yale Class of ${year}`,
    });
    audienceId = audience.id;
    ledger.audienceId = audienceId;
    writeLedger(year, ledger);
    console.log(`\ncreated audience ${audienceId}`);
  } else {
    console.log(`\nreusing audience ${audienceId}`);
  }

  const done = new Set(ledger.imported);
  const pending = emails.filter((email) => !done.has(email));
  console.log(`importing ${pending.length} contacts...`);

  let n = 0;
  for (const email of pending) {
    await resendRequest("POST", `/audiences/${audienceId}/contacts`, {
      email,
      unsubscribed: false,
    });
    ledger.imported.push(email);
    n += 1;
    // Flush often: an interrupted run must not lose what it already did.
    if (n % 25 === 0) {
      writeLedger(year, ledger);
      console.log(`  ${n}/${pending.length}`);
    }
  }
  writeLedger(year, ledger);
  console.log(`imported ${n} contacts (${ledger.imported.length} total)`);

  const broadcast = await resendRequest("POST", "/broadcasts", {
    audience_id: audienceId,
    from: `${FROM_NAME} <${FROM_ADDRESS}>`,
    reply_to: [REPLY_TO],
    subject: variant.subject,
    html,
    name: `v3 ${variantName} — class of ${year}`,
  });
  console.log(`created broadcast ${broadcast.id}`);

  const sent = await resendRequest("POST", `/broadcasts/${broadcast.id}/send`, {});
  console.log(`sent: ${JSON.stringify(sent)}`);
}

main().catch((error) => {
  console.error(`send-campaign: ${error.message}`);
  process.exit(1);
});
