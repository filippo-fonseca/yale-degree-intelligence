import courses from './new_courses.json';

export type CourseInfo = {
  codes: string[]; // First code (i.e. codes[0]) is the canonical/default
  name: string;
  credits: number;
  department: string;
  distributionals?: string[];
  isFall?: boolean;
  isSpring?: boolean;
};

// Full catalog as a flat array (for search/listing)
export const ALL_COURSES: CourseInfo[] = courses as CourseInfo[];

// Create a lookup map from all codes to their canonical course info
const COURSE_CODE_MAP: Record<string, CourseInfo> = {};

ALL_COURSES.forEach(course => {
  course.codes?.forEach(code => {
    COURSE_CODE_MAP[code] = course;
  });
});

export const getCourseInfo = (code: string): CourseInfo | undefined => {
  return COURSE_CODE_MAP[code];
};

// Get the canonical code (first in array) for a given code
export const getCanonicalCode = (code: string): string | undefined => {
  const course = getCourseInfo(code);
  return course?.codes[0];
};

// Check if a code is valid (exists in our catalog)
export const isValidCourseCode = (code: string): boolean => {
  return code in COURSE_CODE_MAP;
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
}

export const getCourseCreditsFromCode = (code: string): number | undefined => { 
  const course = getCourseInfo(code);
  return course?.credits;
}

export const getCourseDistributionalsFromCode = (code: string): string[] | undefined => {
  const course = getCourseInfo(code);
  return course?.distributionals;
}

//get all OTHER codes for a course (excluding the canonical one)
export const getOtherCodesForCourse = (code: string): string[] => {
  const course = getCourseInfo(code);
  return course ? course.codes.slice(1) : [];
}

// Check if a course is offered next year (has isFall or isSpring)
export const isCourseOfferedNextYear = (code: string): boolean => {
  const course = getCourseInfo(code);
  return course ? (course.isFall === true || course.isSpring === true) : false;
}

// Check if a course is offered in Fall
export const isCourseOfferedInFall = (code: string): boolean => {
  const course = getCourseInfo(code);
  return course?.isFall === true;
}

// Check if a course is offered in Spring
export const isCourseOfferedInSpring = (code: string): boolean => {
  const course = getCourseInfo(code);
  return course?.isSpring === true;
}