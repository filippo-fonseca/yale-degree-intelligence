#!/usr/bin/env node
/**
 * Read the YCPS bulletin pages cached by scripts/fetch-ycps-pages.mjs and
 * derive, deterministically, the distributional designation set of every course
 * the bulletin lists. No model is involved: the bulletin marks designations up
 * as <span font="YaleDesign Small Caps">HU</span> inside each course block, so
 * the answer is a parse, not a judgment.
 *
 * The script then reconciles that parse against lib/courses.json:
 *
 *   - agreement, over every catalog record that already carries tags, is the
 *     trust metric that says whether the parse can be believed at all;
 *   - records with an EMPTY tag array whose bulletin entry has designations
 *     become corrections, written to the committed data file that
 *     scripts/apply-ycps-distributionals.mjs replays;
 *   - disagreements on records that already carry tags are only reported,
 *     never applied.
 *
 * Usage:
 *   node scripts/parse-ycps-designations.mjs [--write] [--json <path>]
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { EDITIONS } from "./fetch-ycps-pages.mjs";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_ROOT = path.join(REPO_ROOT, "ycps-cache");
const CATALOG_PATH = path.join(REPO_ROOT, "lib", "courses.json");
const CORRECTIONS_PATH = path.join(REPO_ROOT, "scripts", "data", "ycps-distributional-corrections.json");

/**
 * Bulletin designation code -> the vocabulary lib/courses.json uses. RP
 * (reading period) and the legacy Tr are bulletin annotations rather than
 * distributional requirements and appear nowhere in the catalog, so they are
 * dropped instead of mapped.
 */
const DESIGNATION_MAP = {
  HU: "Hu",
  SO: "So",
  SC: "Sc",
  QR: "QR",
  WR: "WR",
  L1: "L1",
  L2: "L2",
  L3: "L3",
  L4: "L4",
  L5: "L5",
};

/** Stable order for a designation set, so two sets compare as strings. */
const TAG_ORDER = ["Hu", "So", "Sc", "QR", "WR", "L1", "L2", "L3", "L4", "L5"];
const sortTags = (tags) =>
  [...new Set(tags)].sort((a, b) => TAG_ORDER.indexOf(a) - TAG_ORDER.indexOf(b));

// ---------------------------------------------------------------------------
// HTML -> course blocks
// ---------------------------------------------------------------------------

const decodeEntities = (text) =>
  text
    .replace(/&nbsp;/g, " ")
    .replace(/ /g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

const BLOCK_SPLIT = /<div class="courseblock[^"]*">/;
const TITLE_PATTERN = /courseblocktitle[^>]*>\s*<strong>([\s\S]*?)<\/strong>/;
const DESIGNATION_PATTERN = /<span[^>]*font="YaleDesign Small Caps"[^>]*>([\s\S]*?)<\/span>/g;

/** The course name a block title carries, i.e. everything past the codes. */
export const parseNameFromTitle = (title) => title.slice(title.indexOf(",") + 1).trim();

/** Loose comparison key for course names, so punctuation drift is not a mismatch. */
export const nameKey = (name) =>
  (name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/**
 * Every course code a block's title claims. Titles carry the codes up to the
 * first comma, cross-listings separated by " / ", the two halves of a yearlong
 * course separated by " and ", an optional leading "*", and a term suffix
 * ("3125a", "3323a or b") that is not part of the code.
 */
export const parseCodesFromTitle = (title) => {
  const codeSection = title.split(",")[0];
  const codes = [];
  for (const crossListing of codeSection.split(" / ")) {
    for (const half of crossListing.split(" and ")) {
      const cleaned = half
        .replace(/^\s*\*/, "")
        .trim()
        .replace(/\s+or\s+[ab]\s*$/, "")
        .replace(/\s+/g, " ");
      const match = cleaned.match(/^([A-Z][A-Z&_]*) (\d+)([A-Za-z]*)$/);
      if (!match) continue;
      const [, subject, digits, suffix] = match;
      // A trailing lowercase a/b is the term the course runs in, not the code.
      const codeSuffix = suffix.replace(/[ab]$/, "");
      codes.push(`${subject} ${digits}${codeSuffix}`);
    }
  }
  return codes;
};

/** code -> sorted designation tags, for one cached edition directory. */
export const parseEdition = (dir) => {
  const byCode = new Map();
  const stats = { pages: 0, blocks: 0, blocksWithoutCode: 0, conflicts: [] };
  const files = fs
    .readdirSync(dir)
    .filter((file) => file.endsWith(".html") && file !== "index.html")
    .sort();

  for (const file of files) {
    stats.pages += 1;
    const html = fs.readFileSync(path.join(dir, file), "utf8");
    for (const block of html.split(BLOCK_SPLIT).slice(1)) {
      stats.blocks += 1;
      const titleMatch = block.match(TITLE_PATTERN);
      if (!titleMatch) continue;
      const title = decodeEntities(titleMatch[1].replace(/<[^>]+>/g, "")).trim();
      const codes = parseCodesFromTitle(title);
      if (codes.length === 0) {
        stats.blocksWithoutCode += 1;
        continue;
      }
      const tags = sortTags(
        [...block.matchAll(DESIGNATION_PATTERN)]
          .map((match) => DESIGNATION_MAP[match[1].trim().toUpperCase()])
          .filter(Boolean)
      );
      for (const code of codes) {
        const existing = byCode.get(code);
        if (!existing) {
          byCode.set(code, { tags, titles: [title], pages: [file] });
          continue;
        }
        // The same block is republished on every cross-listed department page,
        // so repeats are expected and should be identical. Union anything that
        // is not, and report it.
        if (existing.tags.join("|") !== tags.join("|")) {
          stats.conflicts.push({ code, a: existing.tags, b: tags, title });
          existing.tags = sortTags([...existing.tags, ...tags]);
        }
        if (!existing.titles.includes(title)) existing.titles.push(title);
        if (!existing.pages.includes(file)) existing.pages.push(file);
      }
    }
  }
  return { byCode, stats };
};

// ---------------------------------------------------------------------------
// Catalog side
// ---------------------------------------------------------------------------

const COURSE_CODE_PATTERN = /^(.*?)\s+([A-Z]*)(\d+)([A-Z]*)$/;

const normalizeCodeKey = (code) => code.trim().replace(/\s+/g, " ").toUpperCase();

/** Structural half of normalizeCourseCode: 3-digit legacy numbers grow a zero. */
const structuralCode = (code) => {
  const cleaned = normalizeCodeKey(code);
  const match = cleaned.match(COURSE_CODE_PATTERN);
  if (!match) return cleaned;
  const [, subject, numberPrefix, digits, suffix] = match;
  const expanded = digits.length === 3 ? String(Number(digits) * 10) : digits;
  return `${subject} ${numberPrefix}${expanded}${suffix}`;
};

/**
 * Bulletin codes are matched to catalog records on the EXACT alias first, not
 * on the 3->4 digit expansion lib/courseCatalog.ts applies at runtime. The
 * catalog already stores both numberings in `codes`, and each bulletin edition
 * is internally consistent about which one it prints, so exact matching covers
 * almost everything. Expanding first would actively misfile: the catalog holds
 * legacy-only records such as MUSI 320 (Composition Seminar I) whose expansion,
 * MUSI 3200, is a live and completely unrelated course (The Performance of
 * Contemporary Music).
 *
 * The expansion is still worth a second pass for records the exact match cannot
 * reach, but only when the block's printed title independently confirms it is
 * the same course. That gate is what makes the tier safe.
 */
const buildStructuralIndex = (byCode) => {
  const index = new Map();
  const ambiguous = new Set();
  for (const [code, entry] of byCode) {
    const key = structuralCode(code);
    if (key === code) continue;
    const existing = index.get(key);
    if (existing && existing !== entry) ambiguous.add(key);
    else index.set(key, entry);
  }
  for (const key of ambiguous) index.delete(key);
  return index;
};

// ---------------------------------------------------------------------------
// Reconciliation
// ---------------------------------------------------------------------------

const main = () => {
  const argv = process.argv.slice(2);
  const write = argv.includes("--write");
  const jsonFlag = argv.indexOf("--json");
  const jsonPath = jsonFlag === -1 ? null : argv[jsonFlag + 1];

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));

  const editions = [];
  for (const edition of EDITIONS) {
    const dir = path.join(CACHE_ROOT, edition);
    if (!fs.existsSync(dir)) continue;
    const parsed = parseEdition(dir);
    editions.push({ edition, ...parsed });
    console.log(
      `${edition}: ${parsed.stats.pages} pages, ${parsed.stats.blocks} course blocks, ` +
        `${parsed.byCode.size} distinct codes, ${parsed.stats.conflicts.length} intra-edition conflicts`
    );
  }

  /**
   * Attach the bulletin's answer to catalog records, not to code strings: a
   * record is settled by the NEWEST edition that lists any of its codes, and
   * within that edition by the union over its codes (cross-listings publish
   * the same designations, so the union is a no-op in the healthy case).
   */
  for (const edition of editions) {
    edition.byStructural = buildStructuralIndex(edition.byCode);
  }

  const settled = new Map();
  const nameDrift = [];
  const renumberedRejected = [];
  for (const record of catalog) {
    for (const { edition, byCode, byStructural } of editions) {
      let tier = "exact";
      let hits = [];
      for (const code of record.codes ?? []) {
        const entry = byCode.get(normalizeCodeKey(code));
        if (entry) hits.push({ code, entry });
      }
      if (hits.length === 0) {
        tier = "renumbered";
        for (const code of record.codes ?? []) {
          const entry = byStructural.get(structuralCode(code));
          if (!entry) continue;
          const confirmed = entry.titles.some(
            (title) => nameKey(parseNameFromTitle(title)) === nameKey(record.name)
          );
          if (confirmed) hits.push({ code, entry });
          else {
            renumberedRejected.push({
              code: record.codes?.[0] ?? "(no code)",
              catalogName: record.name,
              expandedTo: structuralCode(code),
              bulletinNames: entry.titles.map(parseNameFromTitle),
              edition,
            });
          }
        }
      }
      if (hits.length === 0) continue;
      const tags = sortTags(hits.flatMap((hit) => hit.entry.tags));
      const split = hits.some((hit) => hit.entry.tags.join("|") !== tags.join("|"));
      const bulletinNames = [
        ...new Set(hits.flatMap((hit) => hit.entry.titles.map(parseNameFromTitle))),
      ];
      // Independent check that the code match landed on the same course: the
      // bulletin repeats the title next to the codes, so a name that does not
      // line up means the match itself is suspect, not just the designations.
      const nameAgrees = bulletinNames.some((name) => nameKey(name) === nameKey(record.name));
      if (!nameAgrees) {
        nameDrift.push({
          code: record.codes?.[0] ?? "(no code)",
          catalogName: record.name,
          bulletinNames,
          edition,
          matchedCodes: hits.map((hit) => hit.code),
        });
      }
      settled.set(record, {
        edition,
        tier,
        tags,
        matchedCodes: hits.map((hit) => hit.code),
        bulletinNames,
        nameAgrees,
        crossListingSplit: split && hits.length > 1,
      });
      break;
    }
  }

  const canonical = (record) => record.codes?.[0] ?? "(no code)";

  const agreements = [];
  const mismatches = [];
  const corrections = [];
  const withheld = [];
  const confirmedEmpty = [];
  const uncoverable = [];

  for (const record of catalog) {
    const stored = Array.isArray(record.distributionals) ? record.distributionals : null;
    const parsed = settled.get(record);
    if (stored === null) continue;

    if (stored.length > 0) {
      if (!parsed) continue;
      const storedKey = sortTags(stored).join("|");
      const parsedKey = parsed.tags.join("|");
      if (storedKey === parsedKey) agreements.push(record);
      else {
        mismatches.push({
          code: canonical(record),
          name: record.name,
          stored: sortTags(stored),
          parsed: parsed.tags,
          edition: parsed.edition,
          matchedCodes: parsed.matchedCodes,
        });
      }
      continue;
    }

    if (!parsed) {
      uncoverable.push({ code: canonical(record), name: record.name });
    } else if (parsed.tags.length > 0) {
      const entry = {
        code: canonical(record),
        name: record.name,
        codes: record.codes,
        distributionals: parsed.tags,
        edition: parsed.edition,
        tier: parsed.tier,
        matchedCodes: parsed.matchedCodes,
        bulletinNames: parsed.bulletinNames,
      };
      // Yale reuses a retired number on a new course, so a code match alone can
      // land on a different course entirely (catalog PHIL 312 is "African
      // Political Philosophy"; the 2023-2024 bulletin's PHIL 312 is "Aristotle's
      // Philosophy of Mind and Action"). Writing a designation across that gap
      // is exactly the silent error this unit exists to avoid, so the title has
      // to line up before anything is written.
      if (parsed.nameAgrees) corrections.push(entry);
      else withheld.push(entry);
    } else {
      confirmedEmpty.push({
        code: canonical(record),
        name: record.name,
        edition: parsed.edition,
      });
    }
  }

  const compared = agreements.length + mismatches.length;
  const rate = compared === 0 ? 0 : (agreements.length / compared) * 100;

  console.log("");
  console.log("trust metric (catalog records that already carry tags and appear in the bulletin)");
  console.log(`  compared:  ${compared}`);
  console.log(`  agree:     ${agreements.length}`);
  console.log(`  mismatch:  ${mismatches.length}`);
  console.log(`  agreement: ${rate.toFixed(2)}%`);
  console.log(`  matched records whose bulletin title differs: ${nameDrift.length}`);
  console.log(`  renumbering-tier candidates rejected on title: ${renumberedRejected.length}`);
  console.log("");
  console.log(`empty records corrected by the bulletin: ${corrections.length}`);
  console.log(`empty records withheld on a title mismatch: ${withheld.length}`);
  console.log(`empty records the bulletin also shows as bare: ${confirmedEmpty.length}`);
  console.log(`empty records the bulletin does not list at all: ${uncoverable.length}`);

  const analysis = {
    editions: editions.map(({ edition, byCode, byStructural, stats }) => ({
      edition,
      codes: byCode.size,
      renumberedKeys: byStructural.size,
      ...stats,
    })),
    trust: { compared, agree: agreements.length, mismatch: mismatches.length, rate },
    nameDrift,
    renumberedRejected,
    mismatches,
    corrections,
    withheld,
    confirmedEmpty,
    uncoverable,
  };
  if (jsonPath) fs.writeFileSync(jsonPath, `${JSON.stringify(analysis, null, 2)}\n`);

  if (rate < 90) {
    console.log("");
    console.log("agreement is below 90%: refusing to write corrections.");
    process.exitCode = 1;
    return;
  }

  if (write) {
    const payload = {
      source: "catalog.yale.edu YCPS bulletin, parsed by scripts/parse-ycps-designations.mjs",
      editions: EDITIONS,
      agreementRate: Number(rate.toFixed(4)),
      corrections: corrections
        .map(({ code, name, distributionals, edition }) => ({ code, name, distributionals, edition }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    };
    fs.mkdirSync(path.dirname(CORRECTIONS_PATH), { recursive: true });
    fs.writeFileSync(CORRECTIONS_PATH, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`wrote ${path.relative(REPO_ROOT, CORRECTIONS_PATH)}`);
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
