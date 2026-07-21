#!/usr/bin/env node
/**
 * One-shot repair for lib/courses.json: split the records that collapsed two
 * distinct courses into one.
 *
 * The Fall 2023 -> Spring 2027 catalog scrape keyed on course TITLE, so two
 * courses that share a title (typically the two halves of a year-long sequence,
 * "University Physics" I and II) were folded into a single record whose `codes`
 * array carries BOTH modern four-digit numbers. getCanonicalCode then rewrites
 * one number to the other, so progress math and the certificate policy engine
 * see one course where a student took two.
 *
 * Detection: a record is collapsed when two or more of its FOUR-digit codes
 * share subject, letter prefix, digit count and suffix but differ in digits.
 * Genuine renumberings (CPSC 2230 carrying the legacy alias CPSC 223) have only
 * one four-digit code and are left alone.
 *
 * Usage:
 *   node scripts/split-collapsed-courses.mjs [--reference <path>] [--dry-run]
 *
 * The reference catalog is the pre-merge lib/new_courses.json, which stored
 * these courses as separate records and is therefore the source of the distinct
 * per-course names. It is read straight out of git history so nothing extra has
 * to ship in the repo.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CATALOG_PATH = path.join(REPO_ROOT, "lib", "courses.json");
const REFERENCE_REVISION = "ef4b724^1:lib/new_courses.json";

// Same split as lib/courseCatalog.ts: subject, letter prefix, digits, suffix.
const COURSE_CODE_PATTERN = /^(.*?)\s+([A-Z]*)(\d+)([A-Z]*)$/;

const normalizeCode = (code) => code.toUpperCase().replace(/\s+/g, " ").trim();

const parseCode = (code) => {
  const match = normalizeCode(code).match(COURSE_CODE_PATTERN);
  if (!match) return null;
  const [, subject, numberPrefix, digits, suffix] = match;
  return { subject, numberPrefix, digits, suffix };
};

/** Codes are comparable only inside one subject / prefix / width / suffix family. */
const classKey = (parts) =>
  [parts.subject, parts.numberPrefix, parts.digits.length, parts.suffix].join("|");

/** Group a record's codes into those families, preserving the original order. */
const classifyCodes = (codes) => {
  const classes = new Map();
  for (const code of codes) {
    const parts = parseCode(code);
    if (!parts) continue;
    const key = classKey(parts);
    const bucket = classes.get(key);
    if (bucket) bucket.push(code);
    else classes.set(key, [code]);
  }
  return classes;
};

/** The four-digit family that holds more than one code, or null when healthy. */
const findCollapsedCodes = (record) => {
  for (const [key, codes] of classifyCodes(record.codes ?? [])) {
    if (key.split("|")[2] === "4" && codes.length > 1) return codes;
  }
  return null;
};

// ---------------------------------------------------------------------------
// Reference catalog (pre-merge lib/new_courses.json)
// ---------------------------------------------------------------------------

const loadReference = (referencePath) => {
  const raw = referencePath
    ? fs.readFileSync(referencePath, "utf8")
    : execFileSync("git", ["show", REFERENCE_REVISION], {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      });
  const records = JSON.parse(raw).filter((record) => Array.isArray(record?.codes));
  const byCode = new Map();
  for (const record of records) {
    for (const code of record.codes) {
      const key = normalizeCode(code);
      const bucket = byCode.get(key);
      if (bucket) bucket.push(record);
      else byCode.set(key, [record]);
    }
  }
  return byCode;
};

// ---------------------------------------------------------------------------
// Assigning the leftover (legacy / cross-listed) codes to a half
// ---------------------------------------------------------------------------

/**
 * Yale's renumbering only ever appends a zero ("PHYS 180" -> "PHYS 1800") or
 * re-pads the width ("SCIE 010" -> "SCIE 0010"), so a legacy code belongs to the
 * half whose number it expands to. This is exactly the structural rule
 * normalizeCourseCode already encodes, so it can never contradict the runtime.
 */
const structuralMatch = (legacyParts, modernParts) => {
  if (
    legacyParts.subject !== modernParts.subject ||
    legacyParts.numberPrefix !== modernParts.numberPrefix ||
    legacyParts.suffix !== modernParts.suffix
  ) {
    return false;
  }
  const legacy = Number(legacyParts.digits);
  const modern = Number(modernParts.digits);
  if (legacy === modern) return true;
  return legacyParts.digits.length === 3 && legacy * 10 === modern;
};

/** Which half (0 or 1) the reference catalog files a code under, if exactly one. */
const referenceHalf = (byCode, code, halfRecordSets) => {
  const records = byCode.get(normalizeCode(code)) ?? [];
  const hits = halfRecordSets.map((set) => records.some((record) => set.has(record)));
  if (hits[0] && !hits[1]) return 0;
  if (hits[1] && !hits[0]) return 1;
  return null;
};

// ---------------------------------------------------------------------------
// Serialization: byte-for-byte the formatting lib/courses.json already uses
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

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const referenceFlag = argv.indexOf("--reference");
const referencePath = referenceFlag === -1 ? null : argv[referenceFlag + 1];

const source = fs.readFileSync(CATALOG_PATH, "utf8");
const catalog = JSON.parse(source);
const reference = loadReference(referencePath);

const output = [];
const splits = [];
const ambiguous = [];
const ruleCounts = { structural: 0, "reference-pair": 0, "reference-single": 0 };
let namesFromReference = 0;
let namesFromSharedTitle = 0;

for (const record of catalog) {
  const collapsed = findCollapsedCodes(record);
  if (!collapsed) {
    output.push(record);
    continue;
  }
  if (collapsed.length !== 2) {
    throw new Error(
      `Record "${record.name}" collapses ${collapsed.length} four-digit codes ` +
        `(${collapsed.join(", ")}); this script only handles pairs.`
    );
  }

  // Lower number first, so the record that keeps the original slot is the one a
  // reader expects to find there.
  const halves = [...collapsed].sort();
  const halfParts = halves.map((code) => parseCode(code));
  const halfRecordSets = halves.map(
    (code) => new Set(reference.get(normalizeCode(code)) ?? [])
  );

  // Names: only trust the reference when it actually tells the two halves apart.
  // A single reference name (or two identical ones) says nothing the shared
  // title does not already say, and the shared title is the fresher scrape.
  const referenceNames = halfRecordSets.map((set) => {
    const names = new Set([...set].map((entry) => entry.name));
    return names.size === 1 ? [...names][0] : null;
  });
  const nameSource =
    referenceNames[0] && referenceNames[1] && referenceNames[0] !== referenceNames[1]
      ? "reference"
      : "shared-title";
  const names =
    nameSource === "reference" ? referenceNames : [record.name, record.name];
  if (nameSource === "reference") namesFromReference += 1;
  else namesFromSharedTitle += 1;

  // Distribute every remaining code (legacy three-digit numbers, cross-listed
  // subjects) to the half it demonstrably belongs to. Anything we cannot pin
  // down is dropped and reported rather than guessed at, because a wrong alias
  // silently maps a student's course onto the other half.
  const leftovers = record.codes.filter((code) => !halves.includes(code));
  const assignedCodes = [[], []];
  const perRecordAmbiguous = [];
  const leftoverClasses = classifyCodes(leftovers);

  for (const code of leftovers) {
    const parts = parseCode(code);
    let half = null;
    let rule = null;

    if (parts) {
      const matches = halfParts.map((modern) => structuralMatch(parts, modern));
      if (matches[0] !== matches[1]) {
        half = matches[0] ? 0 : 1;
        rule = "structural";
      }
    }

    if (half === null && parts) {
      const siblings = leftoverClasses.get(classKey(parts)) ?? [];
      const referenceGuess = referenceHalf(reference, code, halfRecordSets);
      if (referenceGuess !== null) {
        if (siblings.length === 2) {
          // Trust the reference for a two-code family only when it maps the two
          // codes to different halves. The pre-merge scrape shifted the alias by
          // one on exactly this shape (it filed "PHYS 402" under PHYS 4010 and
          // left PHYS 4020 bare), and that failure always shows up as a partial
          // mapping, never as a complete pairing.
          const other = siblings.find((sibling) => sibling !== code);
          const otherGuess = referenceHalf(reference, other, halfRecordSets);
          if (otherGuess !== null && otherGuess !== referenceGuess) {
            half = referenceGuess;
            rule = "reference-pair";
          }
        } else if (siblings.length === 1) {
          // Nothing else in the family can be confused with it.
          half = referenceGuess;
          rule = "reference-single";
        }
      }
    }

    if (half === null) {
      perRecordAmbiguous.push(code);
      ambiguous.push({ code, halves, name: record.name });
      continue;
    }
    assignedCodes[half].push(code);
    ruleCounts[rule] += 1;
  }

  const built = halves.map((code, index) => {
    const next = {};
    for (const key of Object.keys(record)) {
      if (key === "codes") next.codes = [code, ...assignedCodes[index]];
      else if (key === "name") next.name = names[index];
      else next[key] = Array.isArray(record[key]) ? [...record[key]] : record[key];
    }
    return next;
  });

  output.push(...built);
  splits.push({
    halves,
    names,
    nameSource,
    codes: built.map((entry) => entry.codes),
    ambiguous: perRecordAmbiguous,
  });
}

// Safety net: splitting must never invent, duplicate, or silently lose a code.
const before = new Set(catalog.flatMap((record) => record.codes.map(normalizeCode)));
const after = new Set(output.flatMap((record) => record.codes.map(normalizeCode)));
const droppedCodes = [...before].filter((code) => !after.has(code));
const inventedCodes = [...after].filter((code) => !before.has(code));
if (inventedCodes.length > 0) {
  throw new Error(`Invented codes that were not in the catalog: ${inventedCodes.join(", ")}`);
}
const expectedDropped = new Set(ambiguous.map((entry) => normalizeCode(entry.code)));
const unexpectedDropped = droppedCodes.filter((code) => !expectedDropped.has(code));
if (unexpectedDropped.length > 0) {
  throw new Error(`Dropped codes that were not reported ambiguous: ${unexpectedDropped.join(", ")}`);
}
for (const record of output) {
  if (findCollapsedCodes(record)) {
    throw new Error(`Record "${record.name}" is still collapsed after the split.`);
  }
}

const serialized = serializeCatalog(output);
if (!dryRun) fs.writeFileSync(CATALOG_PATH, serialized);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log("split-collapsed-courses");
console.log(`  records before:        ${catalog.length}`);
console.log(`  records after:         ${output.length}`);
console.log(`  collapsed pairs split: ${splits.length}`);
console.log(`  names from reference:  ${namesFromReference}`);
console.log(`  names from shared title: ${namesFromSharedTitle}`);
console.log(`  legacy codes assigned: ${Object.values(ruleCounts).reduce((a, b) => a + b, 0)}`);
console.log(`    by renumbering rule:   ${ruleCounts.structural}`);
console.log(`    by reference pairing:  ${ruleCounts["reference-pair"]}`);
console.log(`    by reference lookup:   ${ruleCounts["reference-single"]}`);
console.log(`  legacy codes left unassigned (ambiguous): ${ambiguous.length}`);
console.log(`  catalog ${dryRun ? "NOT written (--dry-run)" : "rewritten"}`);

console.log("");
console.log("split pairs (code A | code B | name A | name B | name source)");
for (const split of splits) {
  console.log(
    `  ${split.codes[0].join(" ")} | ${split.codes[1].join(" ")} | ` +
      `${split.names[0]} | ${split.names[1]} | ${split.nameSource}`
  );
}

console.log("");
console.log("ambiguous legacy codes left unassigned (code | candidate halves | title)");
for (const entry of ambiguous) {
  console.log(`  ${entry.code} | ${entry.halves.join(" or ")} | ${entry.name}`);
}
