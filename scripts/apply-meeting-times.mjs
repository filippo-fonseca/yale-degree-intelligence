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
 * Projections. Yale has not published terms after Spring 2027, so for later
 * Fall / Spring columns the simulator reuses a course's most recent
 * same-season offering. This script writes a `projected` key per season
 * saying which published term that is and how many consecutive same-season
 * years (ending there) the course held the same slot, judged against the
 * scraper's meetings_history.json with a small tolerance because Yale moved
 * most blocks by five minutes when it re-gridded for 2026-27. A course with
 * no timed primary section in the 2026-27 offering gets no projection.
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
const HISTORY_PATH = path.join(SOURCE_DIR, "meetings_history.json");

/** Terms the simulator plans against; must match lib/courseCatalog.ts. */
const SIMULATOR_TERMS = ["Fall 2026", "Spring 2027"];

/** Same-season terms, oldest first, ending at the published offering. */
const SEASON_TERMS = {
  Fall: ["Fall 2023", "Fall 2024", "Fall 2025", "Fall 2026"],
  Spring: ["Spring 2024", "Spring 2025", "Spring 2026", "Spring 2027"],
};

/** Minutes of drift still counted as "the same slot" across the 2026-27 re-grid. */
const SLOT_TOLERANCE = 15;

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

const serializeProjected = (lines, projected, comma) => {
  lines.push(`    "projected": {`);
  const seasons = Object.keys(projected);
  seasons.forEach((season, index) => {
    const seasonComma = index === seasons.length - 1 ? "" : ",";
    lines.push(`      ${JSON.stringify(season)}: ${JSON.stringify(projected[season])}${seasonComma}`);
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
      } else if (key === "projected") {
        serializeProjected(lines, value, comma);
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

const history = fs.existsSync(HISTORY_PATH)
  ? JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"))
  : null;
if (!history) {
  console.warn(`no ${HISTORY_PATH}; projections will report stableYears = 1 only`);
}
const historyByCode = new Map();
for (const [code, byTerm] of Object.entries(history?.courses ?? {})) {
  historyByCode.set(normalizeCode(code), byTerm);
}

// ---------------------------------------------------------------------------
// Projections
// ---------------------------------------------------------------------------

/** Timed primary sections of one offering as sorted slot tuples. */
const timedPrimarySlots = (sections) =>
  (sections ?? [])
    .filter((s) => s.type !== "DS" && s.slots.length > 0)
    .map((s) =>
      s.slots
        .map((x) => [x.day, x.start, x.end])
        .sort((p, q) => p[0] - q[0] || p[1] - q[1] || p[2] - q[2])
    );

const sameSlot = (a, b) =>
  a.length === b.length &&
  a.every(
    (x, i) =>
      x[0] === b[i][0] &&
      Math.abs(x[1] - b[i][1]) <= SLOT_TOLERANCE &&
      Math.abs(x[2] - b[i][2]) <= SLOT_TOLERANCE
  );

/** Every section in one offering has a near-identical partner in the other. */
const sameOffering = (a, b) => {
  if (a.length !== b.length) return false;
  const used = new Set();
  return a.every((x) => {
    const hit = b.findIndex((y, i) => !used.has(i) && sameSlot(x, y));
    if (hit < 0) return false;
    used.add(hit);
    return true;
  });
};

/** Sections for a course (any alias) in a term, from the current scrape or history. */
const offeringFor = (record, term) => {
  for (const code of record.codes) {
    const key = normalizeCode(code);
    const hit = sectionsByCode.get(key)?.[term] ?? historyByCode.get(key)?.[term];
    if (hit) return hit;
  }
  return undefined;
};

/**
 * Projection for one season: reuse the published offering if it has a timed
 * primary section, and count how many consecutive earlier same-season
 * offerings held the same slot. A year the course was not offered breaks
 * the streak; a year it ran at a different time does too.
 */
const projectionFor = (record, season) => {
  const terms = SEASON_TERMS[season];
  const from = terms[terms.length - 1];
  const current = timedPrimarySlots(offeringFor(record, from));
  if (current.length === 0) return undefined;
  let stableYears = 1;
  for (let i = terms.length - 2; i >= 0; i -= 1) {
    const earlier = timedPrimarySlots(offeringFor(record, terms[i]));
    if (earlier.length === 0 || !sameOffering(current, earlier)) break;
    stableYears += 1;
  }
  return { from, stableYears };
};

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

const stats = {
  withMeetings: 0,
  sections: 0,
  flaggedWithoutSections: [],
  matchedCodes: 0,
  projected: { Fall: [0, 0, 0, 0], Spring: [0, 0, 0, 0] },
};

for (const record of catalog) {
  delete record.meetings;
  delete record.projected;
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
    const projected = {};
    for (const season of Object.keys(SEASON_TERMS)) {
      const projection = projectionFor(record, season);
      if (projection) {
        projected[season] = projection;
        stats.projected[season][Math.min(projection.stableYears, 4) - 1] += 1;
      }
    }
    if (Object.keys(projected).length > 0) record.projected = projected;
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
for (const season of Object.keys(SEASON_TERMS)) {
  const [y1, y2, y3, y4] = stats.projected[season];
  console.log(
    `  ${season} projections:            ${y1 + y2 + y3 + y4} (held 1y: ${y1}, 2y: ${y2}, 3y: ${y3}, 4y: ${y4})`
  );
}
console.log(`  catalog ${dryRun ? "NOT written (--dry-run)" : "rewritten"}`);
if (stats.flaggedWithoutSections.length > 0) {
  console.log("");
  console.log("flagged for a simulator term but no section found (first 40):");
  console.log(`  ${stats.flaggedWithoutSections.slice(0, 40).join(", ")}`);
}
