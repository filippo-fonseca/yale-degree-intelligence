import { describe, it, expect } from "vitest";
import {
  parseIcsCalendar,
  detectTermFromEventDates,
  termFromYaleSeasonFilename,
  mergeIcsCoursesIntoSemesters,
  courseFromIcsImport,
  termNameFromParse,
} from "@/lib/icsImport";
import { resolveCanonicalCode } from "@/lib/courseCatalog";

/**
 * CourseTable's ICS shape, copied from frontend/src/utilities/calendar.ts
 * (`toICSEvent` + `ICSExportButton`). SUMMARY is the listing code; DESCRIPTION
 * is title then instructors; DTSTART is the first meeting of the term.
 */
function coursetableEvent(opts: {
  code: string;
  title: string;
  instructor?: string;
  start: string;
  end: string;
  until: string;
  byDay?: string;
}): string {
  const instructor = opts.instructor ?? "Jane Yale";
  return `BEGIN:VEVENT
DESCRIPTION:${opts.title}\\r\\nInstructor: ${instructor}
DTEND;TZID=America/New_York:${opts.end}
DTSTART;TZID=America/New_York:${opts.start}
LOCATION:AKW 200
RRULE:FREQ=WEEKLY;BYDAY=${opts.byDay ?? "TU,TH"};UNTIL=${opts.until}Z
SUMMARY:${opts.code}
TRANSP:OPAQUE
END:VEVENT`;
}

function coursetableCalendar(events: string[]): string {
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
${events.join("\n")}
END:VCALENDAR`;
}

const FALL_2025 = {
  start: "20250828T113500",
  end: "20250828T125000",
  until: "20251212T235900",
};

const SPRING_2026 = {
  start: "20260112T090000",
  end: "20260112T101500",
  until: "20260427T235900",
};

describe("termFromYaleSeasonFilename", () => {
  it("reads CourseTable's {season}_worksheet.ics names", () => {
    expect(termFromYaleSeasonFilename("202503_worksheet.ics")).toEqual({
      term: "Fall",
      year: 2025,
    });
    expect(termFromYaleSeasonFilename("202601_worksheet.ics")).toEqual({
      term: "Spring",
      year: 2026,
    });
  });

  it("ignores summer (02) because the simulator has no summer term", () => {
    expect(termFromYaleSeasonFilename("202502_worksheet.ics")).toBeNull();
  });

  it("returns null when the name has no season code", () => {
    expect(termFromYaleSeasonFilename("worksheet.ics")).toBeNull();
    expect(termFromYaleSeasonFilename(undefined)).toBeNull();
  });
});

describe("detectTermFromEventDates", () => {
  it("calls a late-August start Fall of that year", () => {
    expect(
      detectTermFromEventDates([{ year: 2025, month: 8, day: 28 }]),
    ).toEqual({ term: "Fall", year: 2025 });
  });

  it("calls a January start Spring of that year", () => {
    expect(
      detectTermFromEventDates([{ year: 2026, month: 1, day: 12 }]),
    ).toEqual({ term: "Spring", year: 2026 });
  });

  it("follows the majority when a term has many meetings", () => {
    expect(
      detectTermFromEventDates([
        { year: 2025, month: 8, day: 28 },
        { year: 2025, month: 9, day: 2 },
        { year: 2025, month: 9, day: 4 },
        { year: 2025, month: 12, day: 5 },
      ]),
    ).toEqual({ term: "Fall", year: 2025 });
  });
});

describe("parseIcsCalendar: CourseTable worksheet", () => {
  const ics = coursetableCalendar([
    coursetableEvent({
      code: "CPSC 3230",
      title: "Introduction to Systems Programming and Computer Organization",
      ...FALL_2025,
    }),
    // Same course, second meeting (discussion) — must collapse.
    coursetableEvent({
      code: "CPSC 3230",
      title: "Introduction to Systems Programming and Computer Organization",
      start: "20250829T131000",
      end: "20250829T140000",
      until: FALL_2025.until,
      byDay: "FR",
    }),
    coursetableEvent({
      code: "S&DS 2300",
      title: "Data Exploration and Analysis",
      start: "20250827T090000",
      end: "20250827T101500",
      until: FALL_2025.until,
      byDay: "MO,WE",
    }),
    coursetableEvent({
      code: "MATH 1200",
      title: "Calculus of Functions of One Variable II",
      ...FALL_2025,
    }),
  ]);

  it("extracts unique course codes from SUMMARY", () => {
    const result = parseIcsCalendar(ics, "202503_worksheet.ics");
    expect(result.courses.map((c) => c.code).sort()).toEqual([
      "CPSC 3230",
      "MATH 1200",
      "S&DS 2300",
    ]);
    expect(result.eventCount).toBe(4);
  });

  it("detects Fall from the August–December date range, not the filename", () => {
    const result = parseIcsCalendar(ics, "202601_worksheet.ics");
    expect(result.detectedTerm).toEqual({ term: "Fall", year: 2025 });
    expect(result.detectionSource).toBe("dates");
    expect(termNameFromParse(result)).toBe("Fall 2025");
  });

  it("resolves catalog titles and credits", () => {
    const result = parseIcsCalendar(ics);
    const cpsc = result.courses.find((c) => c.code === "CPSC 3230");
    expect(cpsc?.inCatalog).toBe(true);
    expect(cpsc?.title).toMatch(/Systems Programming/i);
    expect(cpsc?.credits).toBe(1);
  });

  it("detects Spring from a January start", () => {
    const spring = coursetableCalendar([
      coursetableEvent({
        code: "CPSC 2230",
        title: "Data Structures and Programming Techniques",
        ...SPRING_2026,
      }),
    ]);
    const result = parseIcsCalendar(spring, "202601_worksheet.ics");
    expect(result.detectedTerm).toEqual({ term: "Spring", year: 2026 });
    expect(result.courses[0].code).toBe(
      resolveCanonicalCode("CPSC 2230"),
    );
  });

  it("falls back to the CourseTable filename when events have no dates", () => {
    const dateless = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:CPSC 3230
DESCRIPTION:Systems Programming
END:VEVENT
END:VCALENDAR`;
    const result = parseIcsCalendar(dateless, "202503_worksheet.ics");
    expect(result.detectedTerm).toEqual({ term: "Fall", year: 2025 });
    expect(result.detectionSource).toBe("filename");
  });

  it("unfolds folded SUMMARY lines", () => {
    // RFC 5545 drops the leading space on a continuation line, so the
    // space that belongs in "CPSC 3230" has to live on the first line.
    const folded = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:CPSC 
 3230
DTSTART;TZID=America/New_York:20250828T113500
END:VEVENT
END:VCALENDAR`;
    const result = parseIcsCalendar(folded);
    expect(result.courses.map((c) => c.code)).toEqual(["CPSC 3230"]);
  });

  it("expands a three-digit listing to the canonical four-digit code", () => {
    const ics3 = coursetableCalendar([
      coursetableEvent({
        code: "CPSC 323",
        title: "Systems Programming",
        ...FALL_2025,
      }),
    ]);
    const result = parseIcsCalendar(ics3);
    expect(result.courses[0].code).toBe("CPSC 3230");
    expect(result.courses[0].inCatalog).toBe(true);
  });

  it("reports when the file is not a calendar", () => {
    const result = parseIcsCalendar("this is a pdf pretending to be ics");
    expect(result.courses).toEqual([]);
    expect(result.warnings[0]).toMatch(/does not look like a calendar/i);
  });

  it("skips VEVENTs whose SUMMARY is not a course code", () => {
    const ics = coursetableCalendar([
      coursetableEvent({
        code: "CPSC 3230",
        title: "Systems",
        ...FALL_2025,
      }),
      `BEGIN:VEVENT
SUMMARY:Reading period
DTSTART;TZID=America/New_York:20251208T090000
END:VEVENT`,
    ]);
    const result = parseIcsCalendar(ics);
    expect(result.courses.map((c) => c.code)).toEqual(["CPSC 3230"]);
    expect(result.warnings.some((w) => /skipped/i.test(w))).toBe(true);
  });
});

describe("mergeIcsCoursesIntoSemesters", () => {
  const grid = [
    { id: "Fall-2026", name: "Fall 2026", courses: [{ code: "MATH 1200" }] },
    { id: "Spring-2027", name: "Spring 2027", courses: [] },
  ];

  it("adds new courses onto the chosen semester", () => {
    const result = mergeIcsCoursesIntoSemesters(grid, "Fall 2026", [
      { code: "CPSC 3230" },
      { code: "S&DS 2300" },
    ]);
    expect(result.added.map((c) => c.code)).toEqual(["CPSC 3230", "S&DS 2300"]);
    expect(result.semesters[0].courses.map((c) => c.code)).toEqual([
      "MATH 1200",
      "CPSC 3230",
      "S&DS 2300",
    ]);
    expect(result.skippedDuplicate).toEqual([]);
  });

  it("skips a course that is already anywhere on the plan", () => {
    const result = mergeIcsCoursesIntoSemesters(grid, "Spring 2027", [
      { code: "MATH 1200" },
      { code: "CPSC 3230" },
    ]);
    expect(result.skippedDuplicate.map((c) => c.code)).toEqual(["MATH 1200"]);
    expect(result.added.map((c) => c.code)).toEqual(["CPSC 3230"]);
    expect(result.semesters[1].courses.map((c) => c.code)).toEqual(["CPSC 3230"]);
  });

  it("treats a three-digit alias as the same course already on the plan", () => {
    const result = mergeIcsCoursesIntoSemesters(grid, "Spring 2027", [
      { code: "MATH 120" },
    ]);
    expect(result.added).toEqual([]);
    expect(result.skippedDuplicate).toHaveLength(1);
  });

  it("inserts a missing semester in chronological order", () => {
    const result = mergeIcsCoursesIntoSemesters(grid, "Fall 2027", [
      { code: "CPSC 3230" },
    ]);
    expect(result.semesters.map((s) => s.name)).toEqual([
      "Fall 2026",
      "Spring 2027",
      "Fall 2027",
    ]);
    expect(result.semesters[2].id).toBe("Fall-2027");
    expect(result.semesters[2].courses.map((c) => c.code)).toEqual(["CPSC 3230"]);
  });

  it("does not mutate the input semesters", () => {
    mergeIcsCoursesIntoSemesters(grid, "Fall 2026", [{ code: "CPSC 3230" }]);
    expect(grid[0].courses.map((c) => c.code)).toEqual(["MATH 1200"]);
  });
});

describe("courseFromIcsImport", () => {
  it("builds a planned course on the detected term", () => {
    const course = courseFromIcsImport(
      {
        code: "CPSC 3230",
        title: "Systems",
        inCatalog: true,
        credits: 1,
      },
      { term: "Fall", year: 2026 },
      "user-1",
      "not-taken",
    );
    expect(course.code).toBe("CPSC 3230");
    expect(course.semester).toBe("Fall");
    expect(course.year).toBe(2026);
    expect(course.status).toBe("not-taken");
    expect(course.credits).toBe(1);
    expect(course.userId).toBe("user-1");
    expect(course.grade).toBeNull();
  });
});
