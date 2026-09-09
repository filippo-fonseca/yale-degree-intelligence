#!/usr/bin/env node
/**
 * Write section meeting times onto lib/courses.json.
 *
 * Source: meetings.json produced by scrape_meetings.py in
 * github.com/filippo-fonseca/scraper-courses (the FOSE search API's own
 * structured meet_day / start_time / end_time per section, plus the display
 * string verbatim). Nothing here infers a time; this script only joins the
 * scraper's records onto our catalog records by course code.
 *
 * Only the simulator terms carry meeting times (Fall 2026 / Spring 2027).
 * Every record's `meetings` key is rebuilt from scratch, so re-running with a
 * fresh scrape is idempotent and drops sections that no longer exist.
 *
 * The scraper's registry of known meeting patterns is copied to
 * lib/meetingPatterns.json; lib/meetingTimes.test.ts asserts that every
 * pattern in the catalog is in that registry, so a new pattern can only land
 * together with the registry entry that documents it.
 *
 * Usage:
 *   node scripts/apply-meeting-times.mjs [--from ../scraper-courses] [--dry-run]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(REPO_ROOT, "lib", "courses.json");
const PATTERNS_OUT = path.join(REPO_ROOT, "lib", "meetingPatterns.json");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const fromIndex = args.indexOf("--from");
const SOURCE_DIR = path.resolve(
  REPO_ROOT,
  fromIndex >= 0 ? args[fromIndex + 1] : path.join("..", "scraper-courses")
);
const MEETINGS_PATH = path.join(SOURCE_DIR, "meetings.json");
const PATTERNS_PATH = path.join(SOURCE_DIR, "meeting_patterns.json");

/** Terms the simulator plans against; must match lib/courseCatalog.ts. */
const SIMULATOR_TERMS = ["Fall 2026", "Spring 2027"];

// ---------------------------------------------------------------------------
// Serialization: byte-for-byte the formatting lib/courses.json already uses
// (identical to scripts/apply-ycps-distributionals.mjs) plus one nested shape
// for `meetings`: one line per section under each term.
// ---------------------------------------------------------------------------

const formatNumber = (value) => (Number.isInteger(value) ? value.toFixed(1) : String(value));

const serializeMeetings = (lines, meetings, comma) => {
  lines.push(`    "meetings": {`);
  const terms = Object.keys(meetings);
  terms.forEach((term, termIndex) => {
    const sections = meetings[term];
    const termComma = termIndex === terms.length - 1 ? "" : ",";
    lines.push(`      ${JSON.stringify(term)}: [`);
    sections.forEach((section, sectionIndex) => {
      const sectionComma = sectionIndex === sections.length - 1 ? "" : ",";
      lines.push(`        ${JSON.stringify(section)}${sectionComma}`);
    });
    lines.push(`      ]${termComma}`);
  });
  lines.push(`    }${comma}`);
};

const serializeCatalog = (records) => {
  const lines = ["["];
  records.forEach((record, index) => {
    lines.push("  {");
    const keys = Object.keys(record);
    keys.forEach((key, keyIndex) => {
      const value = record[key];
      const comma = keyIndex === keys.length - 1 ? "" : ",";
      if (key === "meetings") {
        serializeMeetings(lines, value, comma);
      } else if (Array.isArray(value)) {
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

const normalizeCode = (code) => code.replace(/\s+/g, " ").trim().toUpperCase();

const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
const source = JSON.parse(fs.readFileSync(MEETINGS_PATH, "utf8"));
const patterns = JSON.parse(fs.readFileSync(PATTERNS_PATH, "utf8"));

for (const term of SIMULATOR_TERMS) {
  if (!source.terms[term]) throw new Error(`meetings.json has no ${term}; refusing to apply`);
}
const unparsed = Object.keys(patterns.unparsed ?? {});
if (unparsed.length > 0) {
  throw new Error(
    `meeting_patterns.json lists unparsed patterns (${unparsed.join(", ")}); fix the scrape first`
  );
}

const sectionsByCode = new Map();
for (const [code, byTerm] of Object.entries(source.courses)) {
  sectionsByCode.set(normalizeCode(code), byTerm);
}

/**
 * Section as stored in the catalog. The CRN is used to dedupe across aliases
 * here but not persisted: the catalog ships to the browser and nothing renders it.
 */
const toCatalogSection = (section) => ({
  section: section.section,
  type: section.type,
  meets: section.meets,
  slots: section.slots.map((slot) => ({ day: slot.day, start: slot.start, end: slot.end })),
});

const stats = { withMeetings: 0, sections: 0, flaggedWithoutSections: [], matchedCodes: 0 };

for (const record of catalog) {
  delete record.meetings;
  const meetings = {};
  for (const term of SIMULATOR_TERMS) {
    const seen = new Set();
    const sections = [];
    for (const code of record.codes) {
      const byTerm = sectionsByCode.get(normalizeCode(code));
      for (const section of byTerm?.[term] ?? []) {
        if (seen.has(section.crn)) continue;
        seen.add(section.crn);
        sections.push(toCatalogSection(section));
      }
    }
    if (sections.length > 0) meetings[term] = sections;
  }
  const flagged =
    (record.isFall && SIMULATOR_TERMS[0]) || (record.isSpring && SIMULATOR_TERMS[1]);
  if (Object.keys(meetings).length > 0) {
    record.meetings = meetings;
    stats.withMeetings += 1;
    stats.sections += Object.values(meetings).reduce((n, list) => n + list.length, 0);
  } else if (flagged) {
    stats.flaggedWithoutSections.push(record.codes[0]);
  }
}

const registry = {
  source: "github.com/filippo-fonseca/scraper-courses meeting_patterns.json",
  patterns: patterns.patterns,
};

if (!dryRun) {
  fs.writeFileSync(CATALOG_PATH, serializeCatalog(catalog));
  fs.writeFileSync(PATTERNS_OUT, `${JSON.stringify(registry, null, 2)}\n`);
}

console.log("apply-meeting-times");
console.log(`  scrape generated:              ${source.generatedAt}`);
console.log(`  catalog records:               ${catalog.length}`);
console.log(`  records with meetings:         ${stats.withMeetings}`);
console.log(`  sections written:              ${stats.sections}`);
console.log(`  known meeting patterns:        ${Object.keys(patterns.patterns).length}`);
console.log(`  isFall/isSpring but no section: ${stats.flaggedWithoutSections.length}`);
console.log(`  catalog ${dryRun ? "NOT written (--dry-run)" : "rewritten"}`);
if (stats.flaggedWithoutSections.length > 0) {
  console.log("");
  console.log("flagged for a simulator term but no section found (first 40):");
  console.log(`  ${stats.flaggedWithoutSections.slice(0, 40).join(", ")}`);
}
