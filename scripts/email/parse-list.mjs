#!/usr/bin/env node
/**
 * Normalize a raw class-year email list into a clean, deduped roster.
 *
 * The raw lists arrive as .txt dumps, one address per line but not reliably:
 * some lines carry a display name, some are comma or semicolon separated, and
 * duplicates are common where a student appears in more than one export. This
 * turns any of that into a sorted JSON roster the send scripts can trust, and
 * refuses to guess when an address looks malformed.
 *
 * Provider-agnostic on purpose. The output feeds either the Resend or the
 * Mailchimp importer.
 *
 *   node scripts/email/parse-list.mjs --year 2030 --in lists/2030.txt
 *   node scripts/email/parse-list.mjs --year 2030 --in lists/2030.txt --allow-external
 *
 * Writes lists/<year>.roster.json (gitignored) and prints a summary.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Deliberately conservative. This is the last gate before an address reaches a
 * sending API, and a malformed address costs reputation, so anything unusual is
 * reported rather than silently normalized into something plausible.
 */
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/;

/** Recipients are Yale students; anything else is a paste error until proven otherwise. */
const EXPECTED_DOMAIN = "yale.edu";

const CLASS_YEARS = new Set(["2027", "2028", "2029", "2030"]);

function parseArgs(argv) {
  const args = { allowExternal: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--year") args.year = argv[++i];
    else if (arg === "--in") args.input = argv[++i];
    else if (arg === "--out") args.output = argv[++i];
    else if (arg === "--allow-external") args.allowExternal = true;
    else throw new Error(`unknown argument: ${arg}`);
  }
  return args;
}

/**
 * Pull every address out of one raw line.
 *
 * Handles `a@b.edu`, `Name <a@b.edu>`, and delimiter-separated runs of either.
 * A line that yields nothing is returned as a rejection so the caller can show
 * the operator exactly which input lines were dropped.
 */
function extractFromLine(line) {
  const withoutComment = line.replace(/#.*$/, "");
  const stripped = withoutComment.trim();
  if (!stripped) return [];

  // `Name <addr>` — keep only what's inside the angle brackets.
  const angled = [...stripped.matchAll(/<([^>]+)>/g)].map((m) => m[1]);
  const source = angled.length > 0 ? angled.join(",") : stripped;

  return source
    .split(/[,;\s]+/)
    .map((token) => token.replace(/^["'<]+|["'>]+$/g, "").trim())
    .filter(Boolean);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.year || !CLASS_YEARS.has(args.year)) {
    throw new Error(`--year must be one of ${[...CLASS_YEARS].join(", ")}`);
  }
  if (!args.input) throw new Error("--in <path to .txt> is required");

  const inputPath = path.resolve(REPO_ROOT, args.input);
  if (!fs.existsSync(inputPath)) throw new Error(`no such file: ${inputPath}`);

  const raw = fs.readFileSync(inputPath, "utf8");
  const lines = raw.split(/\r?\n/);

  /** address -> first line number it appeared on, so duplicates keep their origin. */
  const accepted = new Map();
  const invalid = [];
  const external = [];
  let duplicates = 0;

  lines.forEach((line, index) => {
    const lineNo = index + 1;
    const tokens = extractFromLine(line);

    if (tokens.length === 0) {
      // A line with content but no recoverable address is worth surfacing.
      if (line.trim() && !line.trim().startsWith("#")) {
        invalid.push({ lineNo, value: line.trim() });
      }
      return;
    }

    for (const token of tokens) {
      const address = token.toLowerCase();

      if (!EMAIL_RE.test(address)) {
        invalid.push({ lineNo, value: token });
        continue;
      }

      const domain = address.slice(address.indexOf("@") + 1);
      if (domain !== EXPECTED_DOMAIN) {
        external.push({ lineNo, value: address });
        if (!args.allowExternal) continue;
      }

      if (accepted.has(address)) {
        duplicates += 1;
        continue;
      }
      accepted.set(address, lineNo);
    }
  });

  const roster = [...accepted.keys()].sort();
  const outputPath = args.output
    ? path.resolve(REPO_ROOT, args.output)
    : path.join(REPO_ROOT, "lists", `${args.year}.roster.json`);

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `${JSON.stringify({ year: Number(args.year), count: roster.length, emails: roster }, null, 2)}\n`,
  );

  console.log(`class of ${args.year}: ${roster.length} unique addresses`);
  console.log(`  source lines     ${lines.length}`);
  console.log(`  duplicates       ${duplicates}`);
  console.log(`  non-yale.edu     ${external.length}${args.allowExternal ? " (kept)" : " (dropped)"}`);
  console.log(`  unparseable      ${invalid.length}`);
  console.log(`  wrote            ${path.relative(REPO_ROOT, outputPath)}`);

  // Show a sample rather than the whole list; the operator needs enough to spot
  // a systematic formatting problem without scrolling past hundreds of lines.
  for (const [label, rows] of [["unparseable", invalid], ["non-yale.edu", external]]) {
    if (rows.length === 0) continue;
    console.log(`\n  ${label}:`);
    for (const row of rows.slice(0, 10)) console.log(`    line ${row.lineNo}: ${row.value}`);
    if (rows.length > 10) console.log(`    ... and ${rows.length - 10} more`);
  }

  if (invalid.length > 0) {
    console.log("\nfix the unparseable lines and re-run before importing.");
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(`parse-list: ${error.message}`);
  process.exit(1);
}
