/**
 * CourseTable worksheet → simulator import.
 *
 * CourseTable's ICS export is one file per semester. Each meeting becomes a
 * VEVENT whose SUMMARY is the listing code ("CPSC 3230") and whose DTSTART
 * range is that term's academic calendar. We only need the unique courses and
 * which Yale term the dates fall in; meeting times are discarded.
 *
 * The stored plan shape is untouched. This module is parse + merge only.
 */

import {
  formatTerm,
  getCurrentTerm,
  parseTermName,
  compareTermNames,
  type AcademicTerm,
} from "@/lib/academicTerm";
import {
  codesReferToSameCourse,
  getCourseCreditsFromCode,
  getCourseDistributionalsFromCode,
  getCourseInfo,
  resolveCanonicalCode,
} from "@/lib/courseCatalog";
import type { Course } from "@/lib/types";

/** One distinct course pulled out of a calendar, ready to drop on a plan. */
export type IcsImportedCourse = {
  /** Canonical catalog code when known, otherwise the structural form. */
  code: string;
  /** First line of DESCRIPTION, usually the CourseTable title. */
  title: string | null;
  inCatalog: boolean;
  credits: number;
};

export type IcsDetectionSource = "dates" | "filename";

export type IcsParseResult = {
  courses: IcsImportedCourse[];
  detectedTerm: AcademicTerm | null;
  detectionSource: IcsDetectionSource | null;
  /** How many VEVENTs we saw before collapsing meetings of the same course. */
  eventCount: number;
  warnings: string[];
};

export type IcsSemesterLike<C extends { code: string }> = {
  id: string;
  name: string;
  courses: C[];
};

export type IcsMergeResult<C extends { code: string }> = {
  semesters: IcsSemesterLike<C>[];
  added: C[];
  skippedDuplicate: C[];
};

const COURSE_CODE_IN_SUMMARY =
  /^([A-Z][&A-Z]{1,8})\s+(\d{3,4}[A-Z]?)\b/i;

/**
 * Yale season codes as CourseTable writes them into the download name
 * (`202503_worksheet.ics`): 01 Spring, 02 Summer, 03 Fall.
 */
export function termFromYaleSeasonFilename(
  filename: string | undefined,
): AcademicTerm | null {
  if (!filename) return null;
  const match = filename.match(/(?:^|[^\d])(\d{4})(01|02|03)(?:[^\d]|$)/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const season = match[2];
  if (season === "01") return { term: "Spring", year };
  if (season === "03") return { term: "Fall", year };
  return null;
}

function unfoldIcs(text: string): string[] {
  const raw = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");
  const lines = raw.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out.filter((line) => line.length > 0);
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\r/gi, "")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseProperty(line: string): {
  name: string;
  value: string;
} {
  const colon = line.indexOf(":");
  if (colon === -1) return { name: line.toUpperCase(), value: "" };
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const semi = head.indexOf(";");
  const name = (semi === -1 ? head : head.slice(0, semi)).toUpperCase();
  return { name, value };
}

function parseIcsDate(value: string): {
  year: number;
  month: number;
  day: number;
} | null {
  const match = value.trim().match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month, day };
}

function extractCourseCode(summary: string): string | null {
  const cleaned = unescapeIcs(summary).trim();
  const match = cleaned.match(COURSE_CODE_IN_SUMMARY);
  if (!match) return null;
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

function titleFromDescription(description: string): string | null {
  const first = unescapeIcs(description)
    .split(/\n/)
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  if (!first) return null;
  // CourseTable prefixes the title, then "Instructor: …". Drop that suffix
  // if it landed on the same line after unescape.
  const withoutInstructor = first.replace(/\s*Instructor:.*$/i, "").trim();
  return withoutInstructor || null;
}

/**
 * Fall = August–December of that year, Spring = January–May. June/July
 * meetings are treated as Fall so a late-spring exam date cannot flip the
 * term; CourseTable worksheets do not include summer session.
 */
export function detectTermFromEventDates(
  dates: Array<{ year: number; month: number; day: number }>,
): AcademicTerm | null {
  if (dates.length === 0) return null;

  const spring = dates.filter((d) => d.month >= 1 && d.month <= 5);
  const fall = dates.filter((d) => d.month >= 8 && d.month <= 12);

  if (fall.length > spring.length) {
    return { term: "Fall", year: fall[0].year };
  }
  if (spring.length > fall.length) {
    return { term: "Spring", year: spring[0].year };
  }

  const earliest = [...dates].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.month !== b.month) return a.month - b.month;
    return a.day - b.day;
  })[0];
  return getCurrentTerm(new Date(earliest.year, earliest.month - 1, earliest.day));
}

function toImportedCourse(rawCode: string, title: string | null): IcsImportedCourse {
  const code = resolveCanonicalCode(rawCode);
  const info = getCourseInfo(code) ?? getCourseInfo(rawCode);
  return {
    code,
    title: title || info?.name || null,
    inCatalog: !!info,
    credits: info?.credits ?? getCourseCreditsFromCode(code) ?? 1,
  };
}

/**
 * Parse a CourseTable (or any iCalendar) file into unique courses and the
 * Yale term those events belong to. `filename` is only a fallback when the
 * events have no dates — CourseTable names the download `{season}_worksheet.ics`.
 */
export function parseIcsCalendar(
  text: string,
  filename?: string,
): IcsParseResult {
  const warnings: string[] = [];
  if (!text || !text.trim()) {
    return {
      courses: [],
      detectedTerm: null,
      detectionSource: null,
      eventCount: 0,
      warnings: ["The file was empty."],
    };
  }

  const lines = unfoldIcs(text);
  const looksLikeCalendar = lines.some((line) =>
    line.toUpperCase().startsWith("BEGIN:VCALENDAR"),
  );
  if (!looksLikeCalendar && !lines.some((line) => line.toUpperCase().startsWith("BEGIN:VEVENT"))) {
    return {
      courses: [],
      detectedTerm: null,
      detectionSource: null,
      eventCount: 0,
      warnings: ["That file does not look like a calendar (.ics)."],
    };
  }

  const coursesByCode = new Map<string, IcsImportedCourse>();
  const dates: Array<{ year: number; month: number; day: number }> = [];
  let eventCount = 0;
  let skippedEvents = 0;

  let inEvent = false;
  let summary = "";
  let description = "";
  let dtstart = "";
  let until = "";

  const flush = () => {
    if (!inEvent) return;
    eventCount += 1;
    const date = parseIcsDate(dtstart) ?? parseIcsDate(until);
    if (date) dates.push(date);
    const rawCode = extractCourseCode(summary);
    if (!rawCode) {
      skippedEvents += 1;
      summary = "";
      description = "";
      dtstart = "";
      until = "";
      inEvent = false;
      return;
    }
    const imported = toImportedCourse(rawCode, titleFromDescription(description));
    if (!coursesByCode.has(imported.code)) {
      coursesByCode.set(imported.code, imported);
    }
    summary = "";
    description = "";
    dtstart = "";
    until = "";
    inEvent = false;
  };

  for (const line of lines) {
    const { name, value } = parseProperty(line);
    if (name === "BEGIN" && value.toUpperCase() === "VEVENT") {
      flush();
      inEvent = true;
      continue;
    }
    if (name === "END" && value.toUpperCase() === "VEVENT") {
      flush();
      continue;
    }
    if (!inEvent) continue;
    if (name === "SUMMARY") summary = value;
    else if (name === "DESCRIPTION") description = value;
    else if (name === "DTSTART") dtstart = value;
    else if (name === "RRULE") {
      const untilMatch = value.match(/UNTIL=([0-9T]+)/i);
      if (untilMatch) until = untilMatch[1];
    }
  }
  flush();

  if (skippedEvents > 0) {
    warnings.push(
      `${skippedEvents} calendar event${skippedEvents === 1 ? "" : "s"} had no course code and ${skippedEvents === 1 ? "was" : "were"} skipped.`,
    );
  }

  const fromDates = detectTermFromEventDates(dates);
  const fromFilename = termFromYaleSeasonFilename(filename);
  const detectedTerm = fromDates ?? fromFilename;
  const detectionSource: IcsDetectionSource | null = fromDates
    ? "dates"
    : fromFilename
      ? "filename"
      : null;

  if (coursesByCode.size === 0) {
    warnings.push("No Yale course codes were found in that calendar.");
  }

  return {
    courses: [...coursesByCode.values()],
    detectedTerm,
    detectionSource,
    eventCount,
    warnings,
  };
}

export function termNameFromParse(result: IcsParseResult): string | null {
  return result.detectedTerm ? formatTerm(result.detectedTerm) : null;
}

/**
 * Drop imported courses onto one semester of a plan. Duplicates already on
 * any semester are skipped. If the named semester is missing, it is inserted
 * in chronological order so a worksheet for a term the grid did not yet
 * include still has somewhere to land.
 */
export function mergeIcsCoursesIntoSemesters<C extends { code: string }>(
  semesters: IcsSemesterLike<C>[],
  semesterName: string,
  courses: C[],
): IcsMergeResult<C> {
  const added: C[] = [];
  const skippedDuplicate: C[] = [];

  const alreadyOnPlan = (code: string, list: IcsSemesterLike<C>[]) =>
    list.some((sem) =>
      sem.courses.some((c) => codesReferToSameCourse(c.code, code)),
    );

  let next = semesters.map((sem) => ({
    ...sem,
    courses: [...sem.courses],
  }));

  const parsed = parseTermName(semesterName);
  if (!parsed) {
    return { semesters: next, added, skippedDuplicate };
  }

  let targetIndex = next.findIndex((sem) => sem.name === semesterName);
  if (targetIndex === -1) {
    const fresh: IcsSemesterLike<C> = {
      id: `${parsed.term}-${parsed.year}`,
      name: semesterName,
      courses: [],
    };
    next = [...next, fresh].sort((a, b) => compareTermNames(a.name, b.name));
    targetIndex = next.findIndex((sem) => sem.name === semesterName);
  }

  for (const course of courses) {
    if (alreadyOnPlan(course.code, next)) {
      skippedDuplicate.push(course);
      continue;
    }
    next[targetIndex] = {
      ...next[targetIndex],
      courses: [...next[targetIndex].courses, course],
    };
    added.push(course);
  }

  return { semesters: next, added, skippedDuplicate };
}

/** Build the Course object the simulator stores on a planned semester. */
export function courseFromIcsImport(
  imported: IcsImportedCourse,
  term: AcademicTerm,
  userId: string,
  status: Course["status"],
): Course {
  const distributionals = getCourseDistributionalsFromCode(imported.code);
  return {
    id: `${imported.code}-ics-${term.term}-${term.year}`,
    code: imported.code,
    grade: null,
    semester: term.term,
    year: term.year,
    userId,
    status,
    credits: imported.credits,
    skipped: false,
    ...(distributionals ? { distributionals } : {}),
  };
}
