import courses from "./courses.json";

/**
 * Yale College catalog (Fall 2023 → Spring 2027).
 *
 * - `codes`: every known alias; newest / modern code is first (e.g. CPSC 2230, ECE 2000).
 * - `offered`: human term labels this course appeared in (see CATALOG_TERMS).
 * - `isFall` / `isSpring`: ONLY Fall 2026 / Spring 2027 (simulator pool). Historical-only
 *   courses omit both flags.
 * - Distributionals are NOT in the catalog — they come from transcript / user override.
 */
export type CourseInfo = {
  codes: string[];
  name: string;
  credits: number;
  department: string;
  offered: string[];
  isFall?: boolean;
  isSpring?: boolean;
};

/** Exact term labels used in courses.json `offered`. */
export const CATALOG_TERMS = [
  "Fall 2023",
  "Spring 2024",
  "Fall 2024",
  "Spring 2025",
  "Fall 2025",
  "Spring 2026",
  "Fall 2026",
  "Spring 2027",
] as const;

export type CatalogTerm = (typeof CATALOG_TERMS)[number];

/** Simulator planning horizon encoded by isFall / isSpring flags. */
export const SIMULATOR_FALL_TERM: CatalogTerm = "Fall 2026";
export const SIMULATOR_SPRING_TERM: CatalogTerm = "Spring 2027";

/**
 * Collapse whitespace and uppercase for stable catalog map keys. Deliberately
 * NOT the exported normalizeCourseCode: that one resolves aliases through
 * getCanonicalCode, which reads the map this builds, so the lookup path has to
 * stay on a purely structural key or it would recurse.
 */
function normalizeCodeKey(code: string): string {
  return code.trim().replace(/\s+/g, " ").toUpperCase();
}

/**
 * Canonical department identity. EENG was renamed to ECE before Fall 2025;
 * the catalog always stores department as ECE, but callers may still pass EENG.
 */
export function normalizeDepartment(dept: string): string {
  const d = dept.trim().toUpperCase();
  return d === "EENG" ? "ECE" : d;
}

// Full catalog as a flat array (for search/listing)
export const ALL_COURSES: CourseInfo[] = (courses as CourseInfo[]).map((c) => ({
  ...c,
  department: normalizeDepartment(c.department),
  offered: Array.isArray(c.offered) ? c.offered : [],
}));

// Lookup map from every normalized code → course
const COURSE_CODE_MAP: Map<string, CourseInfo> = new Map();
const COURSES_BY_DEPARTMENT: Map<string, CourseInfo[]> = new Map();

for (const course of ALL_COURSES) {
  for (const code of course.codes ?? []) {
    COURSE_CODE_MAP.set(normalizeCodeKey(code), course);
  }
  const dept = normalizeDepartment(course.department);
  const list = COURSES_BY_DEPARTMENT.get(dept);
  if (list) list.push(course);
  else COURSES_BY_DEPARTMENT.set(dept, [course]);
}

/** Courses flagged for Fall 2026 simulator pool. */
export const SIMULATOR_FALL_COURSES: CourseInfo[] = ALL_COURSES.filter(
  (c) => c.isFall === true,
);

/** Courses flagged for Spring 2027 simulator pool. */
export const SIMULATOR_SPRING_COURSES: CourseInfo[] = ALL_COURSES.filter(
  (c) => c.isSpring === true,
);

export const getCourseInfo = (code: string): CourseInfo | undefined => {
  if (!code) return undefined;
  return COURSE_CODE_MAP.get(normalizeCodeKey(code));
};

/** Canonical / modern display code (codes[0]), or undefined if unknown. */
export const getCanonicalCode = (code: string): string | undefined => {
  const course = getCourseInfo(code);
  return course?.codes[0];
};

/**
 * Prefer canonical catalog code when known; otherwise return the normalized input.
 * Use on transcript ingest / plan writes to collapse 3-digit ↔ 4-digit and EENG ↔ ECE.
 */
export const resolveCanonicalCode = (code: string): string => {
  return getCanonicalCode(code) ?? normalizeCourseCode(code);
};

export const isValidCourseCode = (code: string): boolean => {
  return COURSE_CODE_MAP.has(normalizeCodeKey(code));
};

/**
 * Splits a course code into its subject prefix, an optional letter prefix on
 * the number (summer codes such as "CPSC S115"), the digits, and any trailing
 * letters ("MATH 1200L"). Returns null when the code has no numeric part.
 */
const COURSE_CODE_PATTERN = /^(.*?)\s+([A-Z]*)(\d+)([A-Z]*)$/;

const splitCourseCode = (
  code: string
): { subject: string; numberPrefix: string; digits: string; suffix: string } | null => {
  const cleaned = code.toUpperCase().replace(/\s+/g, " ").trim();
  const match = cleaned.match(COURSE_CODE_PATTERN);
  if (!match) return null;
  const [, subject, numberPrefix, digits, suffix] = match;
  return { subject, numberPrefix, digits, suffix };
};

/**
 * Canonical form used by EVERY course comparison in the certificate policy
 * engine. Two steps, in order:
 *
 * 1. Structural: uppercase, collapse whitespace, and expand Yale's legacy
 *    3-digit numbers to the 4-digit renumbering ("CPSC 223" becomes
 *    "CPSC 2230"). Trailing letters are preserved.
 * 2. Catalog: resolve cross-listed aliases through getCanonicalCode, so
 *    "S&DS 2650" and its CPSC alias collapse to one string.
 *
 * Codes the catalog has never heard of fall through to the structural form,
 * which is still stable enough to compare against itself.
 */
export const normalizeCourseCode = (code: string): string => {
  const cleaned = (code || "").toUpperCase().replace(/\s+/g, " ").trim();
  const parts = splitCourseCode(cleaned);
  const structural = parts
    ? `${parts.subject} ${parts.numberPrefix}${
        parts.digits.length === 3 ? String(Number(parts.digits) * 10) : parts.digits
      }${parts.suffix}`
    : cleaned;
  return getCanonicalCode(structural) || getCanonicalCode(cleaned) || structural;
};

/**
 * Level band of a course, floored to the thousand: courseLevel("CPSC 2230")
 * is 2000. Returns null when the code carries no parseable number.
 */
export const courseLevel = (code: string): number | null => {
  const parts = splitCourseCode(normalizeCourseCode(code));
  if (!parts) return null;
  const value = Number(parts.digits);
  if (!Number.isFinite(value)) return null;
  return Math.floor(value / 1000) * 1000;
};

/**
 * Subject prefix of a course, used for the per-certificate department caps:
 * courseSubject("S&DS 2650") is "S&DS". Returns null when the code has no
 * separable subject.
 */
export const courseSubject = (code: string): string | null => {
  const parts = splitCourseCode(normalizeCourseCode(code));
  return parts?.subject || null;
};

export const getCourseNameFromCode = (code: string): string | undefined => {
  const course = getCourseInfo(code);
  return course ? course.name : "Course";
};

export const getCourseCreditsFromCode = (code: string): number | undefined => {
  const course = getCourseInfo(code);
  return course?.credits;
};

export const getCourseDepartmentFromCode = (
  code: string,
): string | undefined => {
  const course = getCourseInfo(code);
  return course ? normalizeDepartment(course.department) : undefined;
};

/**
 * Catalog no longer ships distributionals. Kept for API compatibility —
 * always returns undefined. Distributionals come from transcript / user override.
 */
export const getCourseDistributionalsFromCode = (
  _code: string,
): string[] | undefined => {
  return undefined;
};

/** All other known codes for a course (excluding the canonical codes[0]). */
export const getOtherCodesForCourse = (code: string): string[] => {
  const course = getCourseInfo(code);
  return course ? course.codes.slice(1) : [];
};

/** True if the course appears in the given catalog term label (e.g. "Fall 2024"). */
export const wasCourseOfferedInTerm = (
  code: string,
  term: string,
): boolean => {
  const course = getCourseInfo(code);
  return course ? course.offered.includes(term) : false;
};

/** True if offered Fall 2026 and/or Spring 2027 (simulator pool). */
export const isCourseOfferedNextYear = (code: string): boolean => {
  const course = getCourseInfo(code);
  return course
    ? course.isFall === true || course.isSpring === true
    : false;
};

/** True if offered Fall 2026 (simulator). */
export const isCourseOfferedInFall = (code: string): boolean => {
  const course = getCourseInfo(code);
  return course?.isFall === true;
};

/** True if offered Spring 2027 (simulator). */
export const isCourseOfferedInSpring = (code: string): boolean => {
  const course = getCourseInfo(code);
  return course?.isSpring === true;
};

export const getCoursesByDepartment = (dept: string): CourseInfo[] => {
  return COURSES_BY_DEPARTMENT.get(normalizeDepartment(dept)) ?? [];
};

/**
 * True if two course codes refer to the same catalog entry
 * (handles 3↔4 digit and EENG↔ECE aliases).
 */
export const codesReferToSameCourse = (a: string, b: string): boolean => {
  const ca = getCourseInfo(a);
  const cb = getCourseInfo(b);
  if (ca && cb) return ca === cb;
  return normalizeCourseCode(a) === normalizeCourseCode(b);
};
