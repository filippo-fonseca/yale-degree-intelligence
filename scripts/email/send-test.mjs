#!/usr/bin/env node
/**
 * Send a built campaign email to one address, for eyeballing before a real send.
 *
 * Until degreeint.com is verified in Resend this falls back to Resend's shared
 * onboarding domain, which is fine for checking layout and light/dark rendering
 * but tells you nothing useful about spam filtering: that only becomes a real
 * signal once the mail is going out over the verified degreeint.com domain with
 * its own SPF and DKIM.
 *
 *   node scripts/email/send-test.mjs --to filippo.fonseca@yale.edu
 *   node scripts/email/send-test.mjs --to me@x.com --only newcomers
 */

import fs from "node:fs";
import path from "node:path";

import { FROM_NAME, REPLY_TO, REPO_ROOT, parseArgs, resendRequest } from "./lib.mjs";

/** Preferred sender; used automatically as soon as the domain verifies. */
const VERIFIED_FROM = "filippo@degreeint.com";
const FALLBACK_FROM = "onboarding@resend.dev";

const VARIANTS = {
  existing: {
    file: "v3-existing.html",
    subject: "v3 is here",
  },
  newcomers: {
    file: "v3-newcomers.html",
    subject: "The control plane for your Yale degree",
  },
};

async function verifiedSendingDomains() {
  try {
    const response = await resendRequest("GET", "/domains");
    return new Set(
      (response?.data ?? [])
        .filter((domain) => domain.status === "verified")
        .map((domain) => domain.name),
    );
  } catch (error) {
    // A send-only key cannot read /domains. That is not fatal here: fall back to
    // the shared onboarding domain and say so, rather than aborting the preview.
    if (error.status === 401) return null;
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2), { values: ["to", "only"], flags: [] });
  const to = args.to;
  if (!to) throw new Error("--to <address> is required");

  const selected = args.only ? [args.only] : Object.keys(VARIANTS);
  for (const name of selected) {
    if (!VARIANTS[name]) {
      throw new Error(`--only must be one of ${Object.keys(VARIANTS).join(", ")}`);
    }
  }

  const verified = await verifiedSendingDomains();
  const canUseRealFrom = verified?.has("degreeint.com") ?? false;
  const fromAddress = canUseRealFrom ? VERIFIED_FROM : FALLBACK_FROM;

  if (!canUseRealFrom) {
    console.log(
      verified === null
        ? "note: key is send-only, cannot check domain status — using the onboarding domain."
        : "note: degreeint.com is not verified yet — using the onboarding domain.",
    );
    console.log("      layout is representative; spam placement is not.\n");
  }

  for (const name of selected) {
    const variant = VARIANTS[name];
    const htmlPath = path.join(REPO_ROOT, "emails", "dist", variant.file);

    if (!fs.existsSync(htmlPath)) {
      throw new Error(`missing ${variant.file}. Run: node emails/build.mjs`);
    }

    // The unsubscribe placeholder is only substituted by broadcasts, so for a
    // one-off preview point it somewhere harmless instead of shipping the raw
    // template token into the rendered email.
    const html = fs
      .readFileSync(htmlPath, "utf8")
      .replaceAll("{{{RESEND_UNSUBSCRIBE_URL}}}", "https://degreeint.com/unsubscribe-preview");

    const result = await resendRequest("POST", "/emails", {
      from: `${FROM_NAME} <${fromAddress}>`,
      to: [to],
      reply_to: REPLY_TO,
      subject: `[test] ${variant.subject}`,
      html,
    });

    console.log(`sent ${name.padEnd(9)} -> ${to}   id ${result.id}`);
  }

  console.log(`\nfrom     ${FROM_NAME} <${fromAddress}>`);
  console.log(`reply-to ${REPLY_TO}`);
}

main().catch((error) => {
  console.error(`send-test: ${error.message}`);
  process.exit(1);
});
