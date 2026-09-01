#!/usr/bin/env node
/**
 * Give a course its post-renumbering number.
 *
 * lib/courses.json was scraped term by term from Fall 2023, and Yale renumbered
 * to four digits partway through that window. A course last offered before the
 * cutover therefore sits in the file under its three-digit number only, with no
 * modern alias — and because lib/majors.ts matches a student's courses to a
 * requirement through getCanonicalCode (that is, codes[0]), a requirement that
 * names the modern number silently matches nothing while one that names the old
 * number silently misses every current transcript.
 *
 * Every mapping below is one the 2025-2026 YCPS major page states itself: the
 * page names the four-digit course as a requirement, and lib/courses.json holds
 * exactly that title under the three-digit number. Renumbering was not a
 * uniform "add a zero" (PLSC 118 became PLSC 1335), so nothing here is derived
 * arithmetically, and courses whose modern number no Yale page states are left
 * alone rather than guessed at.
 *
 *   node scripts/add-renumbered-course-aliases.mjs [--check]
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = join(root, "lib/courses.json");

/** legacy code -> [modern code, the YCPS page that states it]. */
const RENUMBERED = {
  "CHEM 163": ["CHEM 1630", "chemistry"],
  "CHEM 167": ["CHEM 1670", "chemistry"],
  "CSLI 490": ["CSLI 4900", "computing and linguistics"],
  "ENVE 448": ["ENVE 4480", "environmental engineering"],
  "AMTH 431": ["AMTH 4310", "applied mathematics"],
  "S&DS 262": ["S&DS 2620", "statistics and data science"],
  "FREN 191": ["FREN 3010", "french"],
  "EPS 210": ["EPS 2100", "earth and planetary sciences"],
  "EPS 255": ["EPS 2550", "earth and planetary sciences"],
  "PLSC 118": ["PLSC 1335", "political science"],
  "MMES 491": ["MMES 4491", "modern middle east studies"],
  "MMES 493": ["MMES 4493", "modern middle east studies"],
};

const norm = (code) => code.trim().replace(/\s+/g, " ").toUpperCase();

/**
 * Edited as text, not parsed and re-serialised: the file is 116k pretty-printed
 * lines that JSON.stringify would reformat wholesale (`1.0` becomes `1`), which
 * would bury twelve one-line additions in a 116k-line diff.
 */
let text = readFileSync(TARGET, "utf8");
const courses = JSON.parse(text);
const byCode = new Map();
for (const course of courses) {
  for (const code of course.codes ?? []) byCode.set(norm(code), course);
}

const problems = [];
let changed = 0;
for (const [legacy, [modern, source]] of Object.entries(RENUMBERED)) {
  const course = byCode.get(norm(legacy));
  if (!course) {
    problems.push(`${legacy} is not in lib/courses.json`);
    continue;
  }
  if (byCode.has(norm(modern))) {
    const holder = byCode.get(norm(modern));
    if (holder !== course) {
      problems.push(`${modern} already belongs to ${holder.codes.join("/")} (${holder.name})`);
    } else {
      console.log(`${legacy} -> ${modern}  already present, skipped`);
    }
    continue;
  }

  // Every code in the file belongs to exactly one record, so the quoted legacy
  // code is a unique anchor. Bail out rather than edit the wrong record.
  const anchor = new RegExp(`^([ \\t]*)"${legacy.replace(/&/g, "&")}"(,?)$`, "gm");
  const hits = text.match(anchor);
  if (!hits || hits.length !== 1) {
    problems.push(`"${legacy}" appears ${hits?.length ?? 0} times in the file; expected exactly 1`);
    continue;
  }
  text = text.replace(anchor, (_m, indent, comma) =>
    `${indent}"${modern}",\n${indent}"${legacy}"${comma}`,
  );
  byCode.set(norm(modern), course);
  changed++;
  console.log(`${legacy} -> ${modern}  (${course.name}; stated on the ${source} page)`);
}

if (problems.length) {
  console.error("\n" + problems.map((p) => `PROBLEM: ${p}`).join("\n"));
  process.exit(1);
}

// The modern number goes first because getCanonicalCode returns codes[0], which
// is what the whole app displays and compares against.
JSON.parse(text);

if (process.argv.includes("--check")) {
  console.log(`\n${changed} record(s) would change; nothing written`);
} else {
  writeFileSync(TARGET, text);
  console.log(`\n${changed} record(s) updated in lib/courses.json`);
}
