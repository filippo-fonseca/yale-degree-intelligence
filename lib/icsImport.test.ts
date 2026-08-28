/**
 * CourseTable ICS → simulator semester.
 *
 * Fixtures follow the exact shape CourseTable writes in
 * frontend/src/utilities/calendar.ts (SUMMARY = listing code, DESCRIPTION =
 * title + instructors with `\r\n`, DTSTART/UNTIL spanning one season).
 */

import { describe, it, expect } from "vitest";
import {
  applyIcsCoursesToSemester,
  extractCourseCode,
  parseCourseTableIcs,
  parseIcsDateValue,
  parseYaleSeasonCode,
  parseYaleSeasonFilename,
  type IcsImportedCourse,
  type PlanSemester,
} from "./icsImport";
import type { Course } from "./types";
import { isCurrentTerm } from "./academicTerm";

function wrapCalendar(events: string): string {
  return `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
VERSION:2.0
BEGIN:VTIMEZONE
TZID:America/New_York
BEGIN:DAYLIGHT
DTSTART:20070311T020000
RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU
TZNAME:EDT
TZOFFSETFROM:-0500
TZOFFSETTO:-0400
END:DAYLIGHT
BEGIN:STANDARD
DTSTART:20071104T020000
RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU
TZNAME:EST
TZOFFSETFROM:-0400
TZOFFSETTO:-0500
END:STANDARD
END:VTIMEZONE
${events}
END:VCALENDAR`;
}

/** One CourseTable VEVENT. `foldedExdate` exercises RFC 5545 line folding. */
function vevent(opts: {
  summary: string;
  description: string;
  start: string;
  end: string;
  until: string;
  location?: string;
  foldedExdate?: boolean;
}): string {
  const exdate = opts.foldedExdate
    ? `EXDATE;TZID=America/New_York:20261125T103000,20261126T103000
 ,20261127T103000`
    : `EXDATE;TZID=America/New_York:20261125T103000`;
  return `BEGIN:VEVENT
DESCRIPTION:${opts.description}
DTEND;TZID=America/New_York:${opts.end}
DTSTART;TZID=America/New_York:${opts.start}
LOCATION:${opts.location ?? "AKW 200"}
RRULE:FREQ=WEEKLY;BYDAY=MW;UNTIL=${opts.until}
${exdate}
SUMMARY:${opts.summary}
TRANSP:OPAQUE
END:VEVENT`;
}

const FALL_2026 = {
  start: "20260831T103000",
  end: "20260831T114500",
  until: "20261211T235900Z",
};

const SPRING_2027 = {
  start: "20270120T103000",
  end: "20270120T114500",
  until: "20270430T235900Z",
};

const FALL_ICS = wrapCalendar(
  [
    vevent({
      summary: "CPSC 223",
      description:
        "Data Structures and Programming Techniques\\r\\nInstructor: James Aspnes",
      ...FALL_2026,
      foldedExdate: true,
    }),
    // Second meeting of the same course (discussion) — must dedupe.
    vevent({
      summary: "CPSC 223",
      description:
        "Data Structures and Programming Techniques\\r\\nInstructor: James Aspnes",
      start: "20260904T130000",
      end: "20260904T141500",
      until: FALL_2026.until,
      location: "WLH 113",
    }),
    vevent({
      summary: "MATH 120",
      description: "Calculus of Functions of Several Variables\\r\\nInstructor: Staff",
      ...FALL_2026,
    }),
    vevent({
      summary: "S&DS 230",
      description: "Data Exploration and Analysis\\r\\nInstructor: Staff",
      ...FALL_2026,
    }),
    vevent({
      summary: "ENGL 114",
      description: "Writing Seminars\\r\\nInstructor: Staff",
      ...FALL_2026,
    }),
  ].join("\n"),
);

const SPRING_ICS = wrapCalendar(
  vevent({
    summary: "CPSC 3230",
    description: "Introduction to Systems Programming and Computer Organization\\r\\nInstructor: Staff",
    ...SPRING_2027,
  }),
);

const course = (
  code: string,
  status: Course["status"],
  semester: string,
  year: number,
): Course => ({
  id: `${code}-${semester}-${year}`,
  code,
  grade: status === "completed" ? "A" : null,
  semester,
  year,
  userId: "u1",
  status,
  credits: 1,
});

const grid = (...semesters: PlanSemester[]): PlanSemester[] => semesters;

const emptyFall = (): PlanSemester => ({
  id: "Fall-2026",
  name: "Fall 2026",
  courses: [],
});

const emptySpring = (): PlanSemester => ({
  id: "Spring-2027",
  name: "Spring 2027",
  courses: [],
});

describe("parseYaleSeasonCode / filename", () => {
  it("reads CourseTable season codes", () => {
    expect(parseYaleSeasonCode("202601")).toEqual({ term: "Spring", year: 2026 });
    expect(parseYaleSeasonCode("202603")).toEqual({ term: "Fall", year: 2026 });
    expect(parseYaleSeasonCode("202701")).toEqual({ term: "Spring", year: 2027 });
    expect(parseYaleSeasonCode("202602")).toBeNull();
    expect(parseYaleSeasonCode("nope")).toBeNull();
  });

  it("pulls the season out of 202603_worksheet.ics", () => {
    expect(parseYaleSeasonFilename("202603_worksheet.ics")).toEqual({
      term: "Fall",
      year: 2026,
    });
    expect(parseYaleSeasonFilename("/tmp/202701_worksheet.ics")).toEqual({
      term: "Spring",
      year: 2027,
    });
  });
});

describe("extractCourseCode", () => {
  it("reads a bare listing code", () => {
    expect(extractCourseCode("CPSC 223")).toBe("CPSC 223");
    expect(extractCourseCode("CPSC 2230")).toBe("CPSC 2230");
  });

  it("reads S&DS and a trailing letter", () => {
    expect(extractCourseCode("S&DS 230")).toBe("S&DS 230");
    expect(extractCourseCode("MATH 1200L")).toBe("MATH 1200L");
  });

  it("takes the code off a longer SUMMARY", () => {
    expect(extractCourseCode("CPSC 223 - Lecture")).toBe("CPSC 223");
  });

  it("returns null when nothing looks like a code", () => {
    expect(extractCourseCode("Office hours")).toBeNull();
  });
});

describe("parseIcsDateValue", () => {
  it("reads YYYYMMDDTHHMMSS as a local calendar day", () => {
    const date = parseIcsDateValue("20260831T103000");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(7);
    expect(date?.getDate()).toBe(31);
  });
});

describe("parseCourseTableIcs", () => {
  it("extracts unique courses from a Fall CourseTable export", () => {
    const result = parseCourseTableIcs(FALL_ICS, "202603_worksheet.ics");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detectedTerm).toEqual({ term: "Fall", year: 2026 });
    expect(result.detectedTermName).toBe("Fall 2026");
    expect(result.filenameTerm).toEqual({ term: "Fall", year: 2026 });
    const codes = result.courses.map((c) => c.code).sort();
    expect(codes).toEqual([
      "CPSC 2230",
      "ENGL 114",
      "MATH 1200",
      "S&DS 2300",
    ]);
    const cpsc = result.courses.find((c) => c.code === "CPSC 2230");
    expect(cpsc?.rawCode).toBe("CPSC 223");
    expect(cpsc?.title).toBe("Data Structures and Programming Techniques");
    expect(cpsc?.inCatalog).toBe(true);
  });

  it("detects Spring from January date ranges", () => {
    const result = parseCourseTableIcs(SPRING_ICS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detectedTermName).toBe("Spring 2027");
    expect(result.courses.map((c) => c.code)).toEqual(["CPSC 3230"]);
  });

  it("prefers event dates over a mismatched filename", () => {
    const result = parseCourseTableIcs(FALL_ICS, "202701_worksheet.ics");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detectedTermName).toBe("Fall 2026");
    expect(result.filenameTerm).toEqual({ term: "Spring", year: 2027 });
  });

  it("falls back to the filename when events have no dates", () => {
    const ics = wrapCalendar(`BEGIN:VEVENT
DESCRIPTION:Data Structures
SUMMARY:CPSC 2230
TRANSP:OPAQUE
END:VEVENT`);
    const result = parseCourseTableIcs(ics, "202603_worksheet.ics");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.detectedTermName).toBe("Fall 2026");
  });

  it("rejects an empty file", () => {
    expect(parseCourseTableIcs("").error).toBe("empty");
  });

  it("rejects a file that is not a calendar", () => {
    expect(parseCourseTableIcs("this is a pdf").error).toBe("not-calendar");
  });

  it("rejects a calendar with no events", () => {
    expect(parseCourseTableIcs(wrapCalendar("")).error).toBe("no-events");
  });

  it("rejects events that carry no course codes", () => {
    const ics = wrapCalendar(`BEGIN:VEVENT
SUMMARY:Office hours
DTSTART;TZID=America/New_York:20260902T103000
END:VEVENT`);
    expect(parseCourseTableIcs(ics).error).toBe("no-courses");
  });
});

describe("applyIcsCoursesToSemester", () => {
  const imported = (code: string, raw = code): IcsImportedCourse => ({
    rawCode: raw,
    code,
    title: code,
    inCatalog: true,
  });

  it("adds new courses onto an empty semester", () => {
    const result = applyIcsCoursesToSemester(
      grid(emptyFall(), emptySpring()),
      "Fall 2026",
      [imported("CPSC 2230", "CPSC 223"), imported("MATH 1200", "MATH 120")],
      "u1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.added.map((c) => c.code)).toEqual(["CPSC 2230", "MATH 1200"]);
    const fall = result.semesters.find((s) => s.name === "Fall 2026");
    expect(fall?.courses.map((c) => c.code)).toEqual(["CPSC 2230", "MATH 1200"]);
    const expectedStatus = isCurrentTerm("Fall 2026")
      ? "in-progress"
      : "not-taken";
    expect(fall?.courses.every((c) => c.status === expectedStatus)).toBe(true);
    expect(fall?.courses[0].semester).toBe("Fall");
    expect(fall?.courses[0].year).toBe(2026);
  });

  it("skips a course already sitting on that semester", () => {
    const result = applyIcsCoursesToSemester(
      grid(
        {
          ...emptyFall(),
          courses: [course("CPSC 2230", "not-taken", "Fall", 2026)],
        },
        emptySpring(),
      ),
      "Fall 2026",
      [imported("CPSC 2230")],
      "u1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped).toEqual([
      { course: imported("CPSC 2230"), reason: "already-on-semester" },
    ]);
    expect(result.added).toEqual([]);
  });

  it("moves a planned course from another semester onto this one", () => {
    const result = applyIcsCoursesToSemester(
      grid(
        emptyFall(),
        {
          ...emptySpring(),
          courses: [course("CPSC 2230", "not-taken", "Spring", 2027)],
        },
      ),
      "Fall 2026",
      [imported("CPSC 2230")],
      "u1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.moved).toEqual([
      { course: imported("CPSC 2230"), from: "Spring 2027" },
    ]);
    expect(
      result.semesters.find((s) => s.name === "Spring 2027")?.courses,
    ).toEqual([]);
    const moved = result.semesters.find((s) => s.name === "Fall 2026")
      ?.courses[0];
    expect(moved?.code).toBe("CPSC 2230");
    expect(moved?.semester).toBe("Fall");
    expect(moved?.year).toBe(2026);
  });

  it("does not move a completed transcript course", () => {
    const result = applyIcsCoursesToSemester(
      grid(
        {
          id: "Fall-2025",
          name: "Fall 2025",
          courses: [course("CPSC 2230", "completed", "Fall", 2025)],
        },
        emptyFall(),
      ),
      "Fall 2026",
      [imported("CPSC 2230")],
      "u1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped[0].reason).toBe("already-taken");
    expect(
      result.semesters.find((s) => s.name === "Fall 2026")?.courses,
    ).toEqual([]);
  });

  it("does not move an in-progress course off the current term", () => {
    const result = applyIcsCoursesToSemester(
      grid(
        {
          ...emptyFall(),
          courses: [course("CPSC 2230", "in-progress", "Fall", 2026)],
        },
        emptySpring(),
      ),
      "Spring 2027",
      [imported("CPSC 2230")],
      "u1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped[0].reason).toBe("already-in-progress");
  });

  it("treats a 3-digit ICS code as the same course as a 4-digit plan code", () => {
    const result = applyIcsCoursesToSemester(
      grid(
        {
          ...emptyFall(),
          courses: [course("CPSC 2230", "not-taken", "Fall", 2026)],
        },
      ),
      "Fall 2026",
      [imported("CPSC 2230", "CPSC 223")],
      "u1",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.skipped[0].reason).toBe("already-on-semester");
  });

  it("returns semester-missing when the term is not on the plan", () => {
    const result = applyIcsCoursesToSemester(
      grid(emptyFall()),
      "Fall 2028",
      [imported("CPSC 2230")],
      "u1",
    );
    expect(result).toEqual({ ok: false, error: "semester-missing" });
  });
});
