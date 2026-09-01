#!/usr/bin/env node
/**
 * Structural audit of lib/data/all_reqs.json against lib/courses.json.
 *
 * Reports, per major requirement:
 *  - option codes the catalog cannot resolve (calculateMajorProgress drops them
 *    silently, so a requirement whose `required` still counts them is
 *    unsatisfiable)
 *  - `required` greater than the number of resolvable options
 *  - flat course lists with required > 1 whose description reads like a choice
 *  - creditRequirements.total vs the sum of `required` across requirements
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");

const reqs = JSON.parse(readFileSync(join(root, "lib/data/all_reqs.json"), "utf8"));
const courses = JSON.parse(readFileSync(join(root, "lib/courses.json"), "utf8"));

const codeMap = new Map();
for (const course of courses) {
  for (const code of course.codes ?? []) {
    codeMap.set(code.trim().replace(/\s+/g, " ").toUpperCase(), course);
  }
}
const resolve = (code) => codeMap.get(String(code).trim().replace(/\s+/g, " ").toUpperCase());

const CHOICE_WORDS = /\b(select one|choose one|one of|either|any one|or other|or an? approved|or approved)\b/i;

const findings = [];
const add = (major, req, kind, detail) =>
  findings.push({ major, req, kind, detail });

for (const [id, major] of Object.entries(reqs)) {
  let sumRequired = 0;
  for (const req of major.requirements ?? []) {
    sumRequired += req.required ?? 0;
    let resolvable = 0;
    const unknown = [];
    const groupSlots = [];
    for (const opt of req.options ?? []) {
      if (opt.type === "course") {
        if (resolve(opt.code)) resolvable += 1;
        else unknown.push(opt.code);
      } else if (opt.type === "group") {
        let groupResolvable = 0;
        for (const code of opt.options ?? []) {
          if (resolve(code)) groupResolvable += 1;
          else unknown.push(code);
        }
        groupSlots.push({ required: opt.required, resolvable: groupResolvable });
        resolvable += Math.min(opt.required ?? 0, groupResolvable);
        if ((opt.required ?? 0) > groupResolvable) {
          add(id, req.name, "GROUP_UNSATISFIABLE",
            `group requires ${opt.required} but only ${groupResolvable} of ${(opt.options ?? []).length} options resolve`);
        }
      }
    }
    if (unknown.length) {
      add(id, req.name, "UNKNOWN_CODES", unknown.join(", "));
    }
    const hasOptions = (req.options ?? []).length > 0;
    if (hasOptions && (req.required ?? 0) > resolvable) {
      add(id, req.name, "UNSATISFIABLE",
        `required ${req.required} > ${resolvable} countable option(s)`);
    }
    const flatCourses = (req.options ?? []).filter((o) => o.type === "course").length;
    const groups = (req.options ?? []).filter((o) => o.type === "group").length;
    if (
      groups === 0 &&
      (req.required ?? 0) > 1 &&
      flatCourses > (req.required ?? 0) &&
      CHOICE_WORDS.test(req.description ?? "")
    ) {
      add(id, req.name, "CHOICE_AS_FLAT_LIST",
        `required ${req.required} of ${flatCourses} flat options; description: ${req.description}`);
    }
    if (!hasOptions && (req.required ?? 0) > 0) {
      add(id, req.name, "NO_OPTIONS", `required ${req.required}, no options (needs manual entry)`);
    }
  }
  const total = major.creditRequirements?.total;
  if (typeof total === "number" && total !== sumRequired) {
    add(id, "(major)", "CREDIT_TOTAL_MISMATCH",
      `creditRequirements.total ${total} vs sum of required ${sumRequired}`);
  }
}

const filter = process.argv[2];
const shown = filter ? findings.filter((f) => f.kind === filter) : findings;

const byKind = shown.reduce((acc, f) => {
  acc[f.kind] = (acc[f.kind] ?? 0) + 1;
  return acc;
}, {});
console.log("=== counts by kind ===");
for (const [kind, n] of Object.entries(byKind).sort((a, b) => b[1] - a[1])) {
  console.log(`${String(n).padStart(4)}  ${kind}`);
}
console.log();
let lastMajor = null;
for (const f of shown) {
  if (f.major !== lastMajor) {
    console.log(`\n## ${f.major}`);
    lastMajor = f.major;
  }
  console.log(`  [${f.kind}] ${f.req}: ${f.detail}`);
}
