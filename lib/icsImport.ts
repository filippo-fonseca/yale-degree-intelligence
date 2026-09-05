/**
 * CourseTable worksheet → Simulator semester.
 *
 * CourseTable's ICS export (frontend/src/utilities/calendar.ts) writes one
 * VEVENT per meeting, with SUMMARY set to the listing code (`CPSC 2230`) and
 * DTSTART / RRULE UNTIL spanning that season only. This module reads that
 * file, dedupes meetings into courses, and detects Fall/Spring from the
 * dates (January–May is Spring, June–December is Fall — same rule as
 * lib/academicTerm.ts). Filename season codes like `202603_worksheet.ics`
 * are a fallback when the calendar has no dates.
 */

import type { Course } from "@/lib/types";
import {
  formatTerm,
  getCurrentTerm,
  isCurrentTerm,
  parseTermName,
  type AcademicTerm,
} from "@/lib/academicTerm";
import {
  getCourseCreditsFromCode,
  getCourseInfo,
  getCourseNameFromCode,
  normalizeCourseCode,
  resolveCanonicalCode,
} from "@/lib/courseCatalog";

/** One distinct course pulled out of a CourseTable (or CourseTable-like) ICS. */
export type IcsImportedCourse = {
  /** Code as it appeared in SUMMARY, cleaned. */
  rawCode: string;
  /** Catalog canonical code when known, otherwise the normalized raw code. */
  code: string;
  title: string;
  inCatalog: boolean;
};

export type IcsParseFailure = {
  ok: false;
  error: "empty" | "not-calendar" | "no-events" | "no-courses";
};

export type IcsParseSuccess = {
  ok: true;
  courses: IcsImportedCourse[];
  /** Term implied by event dates. Null only if every event lacked a date. */
  detectedTerm: AcademicTerm | null;
  detectedTermName: string | null;
  /**
   * Term implied by a CourseTable filename (`202603_worksheet.ics` → Fall
   * 2026). Dates always win when both are present.
   */
  filenameTerm: AcademicTerm | null;
};

export type IcsParseResult = IcsParseSuccess | IcsParseFailure;

export type PlanSemester = {
  id: string;
  name: string;
  courses: Course[];
};

export type ApplyIcsSkipReason =
  | "already-on-semester"
  | "already-taken"
  | "already-in-progress";

export type ApplyIcsSuccess = {
  ok: true;
  semesters: PlanSemester[];
  added: IcsImportedCourse[];
  moved: Array<{ course: IcsImportedCourse; from: string }>;
  skipped: Array<{ course: IcsImportedCourse; reason: ApplyIcsSkipReason }>;
};

export type ApplyIcsFailure = {
  ok: false;
  error: "semester-missing";
};

export type ApplyIcsResult = ApplyIcsSuccess | ApplyIcsFailure;

/**
 * Yale season codes as CourseTable writes them into the download name:
 * `YYYY01` Spring, `YYYY02` Summer (ignored), `YYYY03` Fall.
 */
export function parseYaleSeasonCode(code: string): AcademicTerm | null {
  const match = (code || "").trim().match(/^(\d{4})(01|02|03)$/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const season = match[2];
  if (season === "01") return { term: "Spring", year };
  if (season === "03") return { term: "Fall", year };
  return null;
}

/** `202603_worksheet.ics` → Fall 2026. */
export function parseYaleSeasonFilename(
  filename: string | undefined,
): AcademicTerm | null {
  if (!filename) return null;
  const match = filename.match(/(\d{6})/);
  if (!match) return null;
  return parseYaleSeasonCode(match[1]);
}

/**
 * First Yale-looking course code in a SUMMARY/DESCRIPTION line.
 * Accepts CPSC 223, CPSC 2230, S&DS 230, MATH 1200L, MB&B 300.
 */
export function extractCourseCode(text: string): string | null {
  const match = (text || "")
    .trim()
    .match(/([A-Z]{1,6}(?:&[A-Z]{1,4})?)\s+([A-Z]*\d{3,4}[A-Z]*)/i);
  if (!match) return null;
  return `${match[1].toUpperCase()} ${match[2].toUpperCase()}`;
}

function unfoldIcs(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n[ \t]/g, "");
}

function unescapeIcs(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\r/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

/** Calendar date at local noon so timezone conversion cannot shift the day. */
export function parseIcsDateValue(value: string): Date | null {
  const match = (value || "").match(/^(\d{4})(\d{2})(\d{2})/);
  if (!match) return null;
  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(year, month - 1, day, 12, 0, 0);
}

function splitProperty(line: string): { name: string; value: string } | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const name = line.slice(0, colon).split(";")[0].trim().toUpperCase();
  const value = line.slice(colon + 1);
  if (!name) return null;
  return { name, value };
}

type RawEvent = {
  summary: string;
  description: string;
  dates: Date[];
};

function parseEvents(ics: string): RawEvent[] {
  const lines = unfoldIcs(ics).split("\n");
  const events: RawEvent[] = [];
  let current: RawEvent | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    const prop = splitProperty(line);
    if (!prop) continue;

    if (prop.name === "BEGIN" && prop.value.trim().toUpperCase() === "VEVENT") {
      current = { summary: "", description: "", dates: [] };
      continue;
    }
    if (prop.name === "END" && prop.value.trim().toUpperCase() === "VEVENT") {
      if (current) events.push(current);
      current = null;
      continue;
    }
    if (!current) continue;

    if (prop.name === "SUMMARY") {
      current.summary = unescapeIcs(prop.value).trim();
    } else if (prop.name === "DESCRIPTION") {
      current.description = unescapeIcs(prop.value).trim();
    } else if (prop.name === "DTSTART" || prop.name === "DTEND") {
      const date = parseIcsDateValue(prop.value);
      if (date) current.dates.push(date);
    } else if (prop.name === "RRULE") {
      const until = prop.value.match(/UNTIL=([^;]+)/i);
      if (until) {
        const date = parseIcsDateValue(until[1]);
        if (date) current.dates.push(date);
      }
    }
  }

  return events;
}

function looksLikeCalendar(ics: string): boolean {
  const upper = ics.toUpperCase();
  return upper.includes("BEGIN:VCALENDAR") || upper.includes("BEGIN:VEVENT");
}

function termFromDates(dates: Date[]): AcademicTerm | null {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const mid = sorted[Math.floor(sorted.length / 2)];
  return getCurrentTerm(mid);
}

function titleFromDescription(description: string, code: string): string {
  const firstLine = (description.split("\n")[0] || "").trim();
  if (firstLine && !extractCourseCode(firstLine)) return firstLine;
  return getCourseNameFromCode(code) || "Course";
}

export function parseCourseTableIcs(
  icsText: string,
  filename?: string,
): IcsParseResult {
  const text = (icsText || "").trim();
  if (!text) return { ok: false, error: "empty" };
  if (!looksLikeCalendar(text)) return { ok: false, error: "not-calendar" };

  const events = parseEvents(text);
  if (events.length === 0) return { ok: false, error: "no-events" };

  const filenameTerm = parseYaleSeasonFilename(filename);
  const allDates: Date[] = [];
  const byCode = new Map<string, IcsImportedCourse>();

  for (const event of events) {
    allDates.push(...event.dates);
    const raw =
      extractCourseCode(event.summary) || extractCourseCode(event.description);
    if (!raw) continue;
    const code = resolveCanonicalCode(raw);
    if (byCode.has(code)) continue;
    const info = getCourseInfo(raw) || getCourseInfo(code);
    byCode.set(code, {
      rawCode: raw,
      code,
      title: titleFromDescription(event.description, code),
      inCatalog: !!info,
    });
  }

  if (byCode.size === 0) return { ok: false, error: "no-courses" };

  const detectedTerm = termFromDates(allDates) ?? filenameTerm;
  return {
    ok: true,
    courses: Array.from(byCode.values()),
    detectedTerm,
    detectedTermName: detectedTerm ? formatTerm(detectedTerm) : null,
    filenameTerm,
  };
}

function codesMatch(a: string, b: string): boolean {
  return normalizeCourseCode(a) === normalizeCourseCode(b);
}

function parseSemesterName(name: string): { term: string; year: number } | null {
  const parsed = parseTermName(name);
  if (!parsed) return null;
  return { term: parsed.term, year: parsed.year };
}

function buildPlannedCourse(
  imported: IcsImportedCourse,
  termName: string,
  userId: string,
): Course {
  const parsed = parseSemesterName(termName);
  const status: Course["status"] = isCurrentTerm(termName)
    ? "in-progress"
    : "not-taken";
  return {
    id: `${imported.code}-ics-${termName.replace(/\s+/g, "-")}`,
    code: imported.code,
    grade: null,
    semester: parsed?.term ?? "Fall",
    year: parsed?.year ?? 0,
    userId,
    status,
    credits: getCourseCreditsFromCode(imported.code) ?? 1,
    skipped: false,
  };
}

/**
 * Merge ICS courses onto one semester of a plan.
 *
 * Completed and in-progress transcript courses stay where they are. A planned
 * (`not-taken`) copy on another semester is moved here, because the calendar
 * is the schedule of record for this term. Duplicates already on the target
 * semester are left alone.
 */
export function applyIcsCoursesToSemester(
  semesters: PlanSemester[],
  termName: string,
  courses: IcsImportedCourse[],
  userId: string,
): ApplyIcsResult {
  const targetIndex = semesters.findIndex((s) => s.name === termName);
  if (targetIndex < 0) return { ok: false, error: "semester-missing" };

  const next = semesters.map((s) => ({ ...s, courses: [...s.courses] }));
  const added: IcsImportedCourse[] = [];
  const moved: ApplyIcsSuccess["moved"] = [];
  const skipped: ApplyIcsSuccess["skipped"] = [];

  const findOnPlan = (code: string) => {
    for (let i = 0; i < next.length; i++) {
      const courseIndex = next[i].courses.findIndex((c) =>
        codesMatch(c.code, code),
      );
      if (courseIndex >= 0) {
        return { semesterIndex: i, courseIndex, course: next[i].courses[courseIndex] };
      }
    }
    return null;
  };

  for (const imported of courses) {
    const existing = findOnPlan(imported.code);
    if (existing) {
      if (existing.semesterIndex === targetIndex) {
        skipped.push({ course: imported, reason: "already-on-semester" });
        continue;
      }
      if (existing.course.status === "completed") {
        skipped.push({ course: imported, reason: "already-taken" });
        continue;
      }
      if (existing.course.status === "in-progress") {
        skipped.push({ course: imported, reason: "already-in-progress" });
        continue;
      }

      const [planned] = next[existing.semesterIndex].courses.splice(
        existing.courseIndex,
        1,
      );
      const parsed = parseSemesterName(termName);
      next[targetIndex].courses.push({
        ...planned,
        semester: parsed?.term ?? planned.semester,
        year: parsed?.year ?? planned.year,
        status: isCurrentTerm(termName) ? "in-progress" : "not-taken",
      });
      moved.push({ course: imported, from: next[existing.semesterIndex].name });
      continue;
    }

    next[targetIndex].courses.push(
      buildPlannedCourse(imported, termName, userId),
    );
    added.push(imported);
  }

  return { ok: true, semesters: next, added, moved, skipped };
}
