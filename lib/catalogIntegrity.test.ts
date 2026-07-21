/**
 * Catalog integrity: the shape lib/courses.json has to keep.
 *
 * The Fall 2023 -> Spring 2027 scrape keyed on course TITLE, so two distinct
 * courses that share a title (the two halves of a year-long sequence, most
 * often) landed in a single record carrying both modern four-digit numbers.
 * getCanonicalCode then rewrote one number to the other, and the policy engine
 * counted a student's two courses as one. scripts/split-collapsed-courses.mjs
 * repaired the 110 records that were still merged; this file is the guard that
 * stops a future re-scrape from quietly putting them back.
 */

import { describe, it, expect } from "vitest";
import courses from "@/lib/courses.json";
import {
  getCourseInfo,
  getCanonicalCode,
  normalizeCourseCode,
} from "@/lib/courseCatalog";

/** Same split lib/courseCatalog.ts uses: subject, letter prefix, digits, suffix. */
const COURSE_CODE_PATTERN = /^(.*?)\s+([A-Z]*)(\d+)([A-Z]*)$/;

type CodeParts = {
  subject: string;
  numberPrefix: string;
  digits: string;
  suffix: string;
};

const parseCode = (code: string): CodeParts | null => {
  const match = code.toUpperCase().replace(/\s+/g, " ").trim().match(COURSE_CODE_PATTERN);
  if (!match) return null;
  const [, subject, numberPrefix, digits, suffix] = match;
  return { subject, numberPrefix, digits, suffix };
};

/**
 * Every set of four-digit codes in one record that share subject, prefix and
 * suffix. More than one code in such a set means two distinct modern courses
 * were collapsed into a single record. A legacy alias (CPSC 223 alongside
 * CPSC 2230) has three digits, so it never trips this.
 */
const collapsedFourDigitCodes = (codes: string[]): string[] => {
  const families = new Map<string, string[]>();
  for (const code of codes) {
    const parts = parseCode(code);
    if (!parts || parts.digits.length !== 4) continue;
    const key = [parts.subject, parts.numberPrefix, parts.suffix].join("|");
    const bucket = families.get(key);
    if (bucket) bucket.push(code);
    else families.set(key, [code]);
  }
  const collapsed = Array.from(families.values()).find((bucket) => bucket.length > 1);
  return collapsed ?? [];
};

const catalog = courses as { codes: string[]; name: string }[];

describe("courses.json holds one course per record", () => {
  it("has no record carrying two modern four-digit numbers", () => {
    const collapsed = catalog
      .map((record) => ({ record, codes: collapsedFourDigitCodes(record.codes) }))
      .filter((entry) => entry.codes.length > 0)
      .map((entry) => `${entry.codes.join(" + ")} (${entry.record.name})`);

    expect(collapsed).toEqual([]);
  });

  it("never lists the same code under two records", () => {
    const seen = new Set<string>();
    const duplicates: string[] = [];
    for (const record of catalog) {
      for (const code of record.codes) {
        const key = code.toUpperCase().replace(/\s+/g, " ").trim();
        if (seen.has(key)) duplicates.push(key);
        else seen.add(key);
      }
    }

    expect(duplicates).toEqual([]);
  });
});

describe("the two halves of a sequence stay separate courses", () => {
  it("keeps PHYS 1800 and PHYS 1810 on different canonical codes", () => {
    expect(getCanonicalCode("PHYS 1800")).toBe("PHYS 1800");
    expect(getCanonicalCode("PHYS 1810")).toBe("PHYS 1810");
    expect(getCanonicalCode("PHYS 1800")).not.toBe(getCanonicalCode("PHYS 1810"));
  });

  it("gives each half its own name", () => {
    expect(getCourseInfo("PHYS 1800")?.name).toBe("University Physics I");
    expect(getCourseInfo("PHYS 1810")?.name).toBe("University Physics II");
  });

  it("routes each legacy number to its own half", () => {
    expect(normalizeCourseCode("PHYS 180")).toBe("PHYS 1800");
    expect(normalizeCourseCode("PHYS 181")).toBe("PHYS 1810");
  });

  it("shows the policy engine two courses, not one", () => {
    // normalizeCourseCode is what every comparison in the certificate engine
    // comes down to, so distinct output here is distinct courses there.
    expect(normalizeCourseCode("PHYS 1800")).not.toBe(normalizeCourseCode("PHYS 1810"));
    expect(normalizeCourseCode("PHYS 180")).not.toBe(normalizeCourseCode("PHYS 181"));
  });

  it("keeps the labs unit 10 split apart", () => {
    expect(normalizeCourseCode("PHYS 205L")).toBe("PHYS 2050L");
    expect(normalizeCourseCode("PHYS 206L")).toBe("PHYS 2060L");
  });
});

describe("genuine renumberings still alias", () => {
  it("resolves CPSC 223 to CPSC 2230", () => {
    expect(normalizeCourseCode("CPSC 223")).toBe("CPSC 2230");
    expect(getCanonicalCode("CPSC 223")).toBe("CPSC 2230");
    expect(getCourseInfo("CPSC 223")).toBe(getCourseInfo("CPSC 2230"));
  });

  it("resolves S&DS 265 to S&DS 2650", () => {
    expect(normalizeCourseCode("S&DS 265")).toBe("S&DS 2650");
  });
});
