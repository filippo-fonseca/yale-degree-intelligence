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

/** Collapse whitespace and uppercase for stable code lookups. */
export function normalizeCourseCode(code: string): string {
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
    COURSE_CODE_MAP.set(normalizeCourseCode(code), course);
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
  return COURSE_CODE_MAP.get(normalizeCourseCode(code));
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
  return COURSE_CODE_MAP.has(normalizeCourseCode(code));
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
