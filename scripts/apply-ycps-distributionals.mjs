#!/usr/bin/env node
/**
 * Replay the YCPS bulletin corrections onto lib/courses.json.
 *
 * scripts/parse-ycps-designations.mjs does the reading and the judging; this
 * script does nothing but write, from the committed data file, so the catalog
 * edit is reproducible without the multi-hundred-page HTML cache the parse
 * needs. Its only rule beyond that: a correction may only ever fill an EMPTY
 * `distributionals` array. A record that already carries tags is left exactly
 * as it is, and disagreements go to the report for a human, because the
 * bulletin edition a course was last listed in is not automatically newer
 * information than whatever put the stored tags there.
 *
 * Usage:
 *   node scripts/apply-ycps-distributionals.mjs [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(REPO_ROOT, "lib", "courses.json");
const CORRECTIONS_PATH = path.join(REPO_ROOT, "scripts", "data", "ycps-distributional-corrections.json");

const normalizeCode = (code) => code.trim().replace(/\s+/g, " ").toUpperCase();

// ---------------------------------------------------------------------------
// Serialization: byte-for-byte the formatting lib/courses.json already uses
// (identical to scripts/split-collapsed-courses.mjs)
// ---------------------------------------------------------------------------

const formatNumber = (value) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

const serializeCatalog = (records) => {
  const lines = ["["];
  records.forEach((record, index) => {
    lines.push("  {");
    const keys = Object.keys(record);
    keys.forEach((key, keyIndex) => {
      const value = record[key];
      const comma = keyIndex === keys.length - 1 ? "" : ",";
      if (Array.isArray(value)) {
        if (value.length === 0) {
          lines.push(`    ${JSON.stringify(key)}: []${comma}`);
        } else {
          lines.push(`    ${JSON.stringify(key)}: [`);
          value.forEach((entry, entryIndex) => {
            lines.push(`      ${JSON.stringify(entry)}${entryIndex === value.length - 1 ? "" : ","}`);
          });
          lines.push(`    ]${comma}`);
        }
      } else if (typeof value === "number") {
        lines.push(`    ${JSON.stringify(key)}: ${formatNumber(value)}${comma}`);
      } else {
        lines.push(`    ${JSON.stringify(key)}: ${JSON.stringify(value)}${comma}`);
      }
    });
    lines.push(`  }${index === records.length - 1 ? "" : ","}`);
  });
  lines.push("]");
  return lines.join("\n");
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const dryRun = process.argv.slice(2).includes("--dry-run");

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const { corrections } = JSON.parse(fs.readFileSync(CORRECTIONS_PATH, "utf8"));

const byCode = new Map();
for (const record of catalog) {
  for (const code of record.codes ?? []) byCode.set(normalizeCode(code), record);
}

const applied = [];
const skipped = [];

for (const correction of corrections) {
  const record = byCode.get(normalizeCode(correction.code));
  if (!record) {
    skipped.push({ ...correction, reason: "no catalog record for this code" });
    continue;
  }
  if (!Array.isArray(record.distributionals) || record.distributionals.length > 0) {
    skipped.push({ ...correction, reason: "record no longer has an empty distributionals array" });
    continue;
  }
  record.distributionals = [...correction.distributionals];
  applied.push(correction);
}

if (!dryRun) fs.writeFileSync(CATALOG_PATH, serializeCatalog(catalog));

console.log("apply-ycps-distributionals");
console.log(`  corrections in data file: ${corrections.length}`);
console.log(`  applied:                  ${applied.length}`);
console.log(`  skipped:                  ${skipped.length}`);
console.log(`  catalog ${dryRun ? "NOT written (--dry-run)" : "rewritten"}`);

console.log("");
console.log("applied (code | tags | bulletin edition | name)");
for (const entry of applied) {
  console.log(
    `  ${entry.code} | ${entry.distributionals.join(", ")} | ${entry.edition} | ${entry.name}`
  );
}

if (skipped.length > 0) {
  console.log("");
  console.log("skipped (code | reason)");
  for (const entry of skipped) console.log(`  ${entry.code} | ${entry.reason}`);
}
