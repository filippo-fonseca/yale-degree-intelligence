/**
 * Meeting times: the pure overlap logic, the conflict rule, and the shape the
 * catalog data has to keep.
 *
 * The data tests read lib/courses.json directly. They pick their example
 * courses by searching the catalog rather than hard-coding codes, so a fresh
 * scrape that shuffles sections does not break them; only a change in the
 * rules (or malformed data) will.
 */

import { describe, expect, it } from "vitest";
import courses from "@/lib/courses.json";
import registry from "@/lib/meetingPatterns.json";
import {
  ALL_COURSES,
  getCourseSectionsForTerm,
  SIMULATOR_FALL_TERM,
  SIMULATOR_SPRING_TERM,
  type CourseInfo,
  type CourseSection,
} from "@/lib/courseCatalog";
import {
  conflictingCodes,
  coursesConflict,
  describeMeetingTime,
  NO_TIME_LISTED_LABEL,
  findTermConflicts,
  formatMeetingSummary,
  getMeetingLabels,
  hasMeetingTimesForTerm,
  MEETING_TIME_TERMS,
  primarySections,
  sectionsOverlap,
  slotsOverlap,
} from "@/lib/meetingTimes";

const section = (
  meets: string,
  slots: CourseSection["slots"],
  type = "L",
  no = "01",
): CourseSection => ({ section: no, type, meets, slots });

describe("slot overlap", () => {
  it("overlaps only on the same day when the intervals intersect", () => {
    expect(slotsOverlap({ day: 1, start: 695, end: 770 }, { day: 1, start: 700, end: 720 })).toBe(true);
    expect(slotsOverlap({ day: 1, start: 695, end: 770 }, { day: 3, start: 700, end: 720 })).toBe(false);
  });

  it("treats a shared boundary minute as free", () => {
    expect(slotsOverlap({ day: 0, start: 540, end: 615 }, { day: 0, start: 615, end: 690 })).toBe(false);
  });

  it("compares every slot of both sections", () => {
    const mw = section("MW 9-10:15a", [
      { day: 0, start: 540, end: 615 },
      { day: 2, start: 540, end: 615 },
    ]);
    const wf = section("WF 10-11a", [
      { day: 2, start: 600, end: 660 },
      { day: 4, start: 600, end: 660 },
    ]);
    const tth = section("TTh 9-10:15a", [
      { day: 1, start: 540, end: 615 },
      { day: 3, start: 540, end: 615 },
    ]);
    expect(sectionsOverlap(mw, wf)).toBe(true);
    expect(sectionsOverlap(mw, tth)).toBe(false);
  });
});

describe("labels and summary", () => {
  it("summarises one label verbatim and counts the rest", () => {
    expect(formatMeetingSummary(undefined)).toBeUndefined();
    expect(formatMeetingSummary([])).toBeUndefined();
    expect(formatMeetingSummary(["TTh 11:35a-12:50p"])).toBe("TTh 11:35a-12:50p");
    expect(formatMeetingSummary(["MW 9-10:15a", "HTBA", "F 1-2p"])).toBe("MW 9-10:15a +2");
  });

  it("only knows the simulator terms", () => {
    expect(MEETING_TIME_TERMS).toEqual([SIMULATOR_FALL_TERM, SIMULATOR_SPRING_TERM]);
    expect(hasMeetingTimesForTerm("Fall 2026")).toBe(true);
    expect(hasMeetingTimesForTerm("Fall 2027")).toBe(false);
    expect(hasMeetingTimesForTerm("Spring 2026")).toBe(false);
  });

  it("drops discussion sections from the labels", () => {
    const sections: CourseSection[] = [
      section("TTh 11:35a-12:50p", [{ day: 1, start: 695, end: 770 }], "L"),
      section("Th 4-4:50p", [{ day: 3, start: 960, end: 1010 }], "DS", "A"),
    ];
    expect(primarySections(sections).map((s) => s.meets)).toEqual(["TTh 11:35a-12:50p"]);
  });
});

// ---------------------------------------------------------------------------
// Live catalog
// ---------------------------------------------------------------------------

type CatalogRecord = CourseInfo;
const records = courses as CatalogRecord[];
const withMeetings = records.filter((r) => r.meetings);

const timedPrimary = (r: CatalogRecord, term: string): CourseSection[] =>
  primarySections(r.meetings?.[term] ?? []).filter((s) => s.slots.length > 0);

const slotKey = (s: CourseSection) => s.slots.map((x) => `${x.day}:${x.start}-${x.end}`).join("|");

describe("catalog meeting data", () => {
  it("carries meeting times for a meaningful share of the simulator pool", () => {
    expect(withMeetings.length).toBeGreaterThan(2000);
  });

  it("only carries the simulator terms", () => {
    for (const r of withMeetings) {
      for (const term of Object.keys(r.meetings!)) {
        expect(MEETING_TIME_TERMS).toContain(term);
      }
    }
  });

  it("stores well-formed sections: minutes within a day, end after start, day Mon-Sun", () => {
    for (const r of withMeetings) {
      for (const sections of Object.values(r.meetings!)) {
        expect(sections!.length).toBeGreaterThan(0);
        for (const s of sections!) {
          expect(typeof s.section).toBe("string");
          expect(typeof s.type).toBe("string");
          expect(typeof s.meets).toBe("string");
          if (s.meets === "HTBA") expect(s.slots).toEqual([]);
          for (const slot of s.slots) {
            expect(slot.day).toBeGreaterThanOrEqual(0);
            expect(slot.day).toBeLessThanOrEqual(6);
            expect(slot.start).toBeGreaterThanOrEqual(0);
            expect(slot.end).toBeLessThanOrEqual(24 * 60);
            expect(slot.end).toBeGreaterThan(slot.start);
          }
        }
      }
    }
  });

  it("uses only meeting patterns the registry knows, with matching slots", () => {
    const known = registry.patterns as { [meets: string]: { slots: CourseSection["slots"] } };
    const unknown = new Set<string>();
    const mismatched = new Set<string>();
    for (const r of withMeetings) {
      for (const sections of Object.values(r.meetings!)) {
        for (const s of sections!) {
          if (s.meets === "HTBA" || s.meets === "") continue;
          const entry = known[s.meets];
          if (!entry) {
            unknown.add(s.meets);
            continue;
          }
          if (JSON.stringify(entry.slots) !== JSON.stringify(s.slots)) mismatched.add(s.meets);
        }
      }
    }
    expect(Array.from(unknown), "patterns missing from lib/meetingPatterns.json").toEqual([]);
    expect(Array.from(mismatched), "patterns whose slots differ from the registry").toEqual([]);
  });

  it("exposes sections through the catalog lookup by any alias", () => {
    const sample = withMeetings.find((r) => r.codes.length > 1 && r.meetings![SIMULATOR_FALL_TERM]);
    expect(sample).toBeDefined();
    for (const code of sample!.codes) {
      expect(getCourseSectionsForTerm(code, SIMULATOR_FALL_TERM)).toEqual(
        sample!.meetings![SIMULATOR_FALL_TERM],
      );
    }
    expect(getCourseSectionsForTerm(sample!.codes[0], "Fall 2027")).toBeUndefined();
  });
});

describe("conflict rule on live data", () => {
  const term = SIMULATOR_FALL_TERM;
  const single = ALL_COURSES.filter((r) => {
    const timed = timedPrimary(r as CatalogRecord, term);
    return timed.length === 1 && primarySections(r.meetings?.[term] ?? []).length === 1;
  }) as CatalogRecord[];

  const bySlot = new Map<string, CatalogRecord[]>();
  for (const r of single) {
    const key = slotKey(timedPrimary(r, term)[0]);
    bySlot.set(key, [...(bySlot.get(key) ?? []), r]);
  }
  const sharedSlot = Array.from(bySlot.values()).find((list) => list.length >= 2);

  it("reports two single-section courses in the same slot as a conflict", () => {
    expect(sharedSlot).toBeDefined();
    const [a, b] = sharedSlot!;
    expect(coursesConflict(a.codes[0], b.codes[0], term)).toBe(true);
    const found = findTermConflicts([a.codes[0], b.codes[0]], term);
    expect(found).toEqual([{ a: a.codes[0], b: b.codes[0], term }]);
    expect(Array.from(conflictingCodes(found)).sort()).toEqual([a.codes[0], b.codes[0]].sort());
  });

  it("does not report courses that meet on disjoint days", () => {
    const monday = single.find((r) => timedPrimary(r, term)[0].slots.every((s) => s.day === 0));
    const tuesday = single.find((r) => timedPrimary(r, term)[0].slots.every((s) => s.day === 1));
    expect(monday).toBeDefined();
    expect(tuesday).toBeDefined();
    expect(coursesConflict(monday!.codes[0], tuesday!.codes[0], term)).toBe(false);
  });

  it("never conflicts when either course is HTBA or unknown", () => {
    const htba = withMeetings.find((r) =>
      primarySections(r.meetings?.[term] ?? []).some((s) => s.meets === "HTBA"),
    );
    expect(htba).toBeDefined();
    const [a] = sharedSlot!;
    expect(coursesConflict(a.codes[0], htba!.codes[0], term)).toBe(false);
    expect(coursesConflict(a.codes[0], "NOPE 9999", term)).toBe(false);
    expect(findTermConflicts([a.codes[0], "NOPE 9999"], term)).toEqual([]);
  });

  it("labels a course by its enroll-able sections and nothing for other terms", () => {
    const [a] = sharedSlot!;
    expect(getMeetingLabels(a.codes[0], term)).toEqual([timedPrimary(a, term)[0].meets]);
    expect(getMeetingLabels(a.codes[0], "Fall 2027")).toBeUndefined();
    expect(getMeetingLabels("NOPE 9999", term)).toBeUndefined();
  });

  it("never describes a course with an empty string", () => {
    const [a] = sharedSlot!;
    const timed = describeMeetingTime(a.codes[0], term);
    expect(timed.text).toBe(timedPrimary(a, term)[0].meets);
    expect(timed.listed).toBe(true);
    const htba = withMeetings.find((r) => {
      const primary = primarySections(r.meetings?.[term] ?? []);
      return primary.length > 0 && primary.every((s) => s.meets === "HTBA");
    })!;
    const arranged = describeMeetingTime(htba.codes[0], term);
    expect(arranged.text).toBe("HTBA");
    expect(arranged.detail).toMatch(/to be arranged/);
    const missing = describeMeetingTime("NOPE 9999", term);
    expect(missing.text).toBe(NO_TIME_LISTED_LABEL);
    expect(missing.listed).toBe(false);
    expect(missing.detail).toContain(term);
  });

  it("does nothing for terms without meeting data", () => {
    const [a, b] = sharedSlot!;
    expect(findTermConflicts([a.codes[0], b.codes[0]], "Fall 2027")).toEqual([]);
  });

  it("is not a conflict when one course offers a section that clears the other", () => {
    const [a] = sharedSlot!;
    const clash = timedPrimary(a, term)[0];
    const multi = ALL_COURSES.find((r) => {
      const timed = timedPrimary(r as CatalogRecord, term);
      if (timed.length < 2) return false;
      const overlapping = timed.filter((s) => sectionsOverlap(s, clash));
      return overlapping.length >= 1 && overlapping.length < timed.length;
    });
    expect(multi, "a multi-section course with one section clashing and one free").toBeDefined();
    expect(coursesConflict(a.codes[0], multi!.codes[0], term)).toBe(false);
  });

  it("only reports each unordered pair once and skips self-pairs", () => {
    const [a, b] = sharedSlot!;
    expect(findTermConflicts([a.codes[0], b.codes[0], a.codes[0]], term)).toHaveLength(2);
    expect(findTermConflicts([a.codes[0], a.codes[0]], term)).toEqual([]);
  });
});
