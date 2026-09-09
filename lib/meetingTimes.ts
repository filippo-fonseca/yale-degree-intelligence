/**
 * Meeting times for the simulator.
 *
 * Everything here is deterministic and derived from the registrar's own
 * structured section data in lib/courses.json (see scripts/apply-meeting-times.mjs).
 * The catalog only carries meeting times for the simulator terms
 * (Fall 2026 / Spring 2027); every other term returns "unknown".
 *
 * Vocabulary:
 * - A section a student enrolls in is a "primary" section. Discussion
 *   sections (registrar type "DS") are chosen after enrolling and are ignored
 *   for conflicts, since a student can usually pick one that fits.
 * - HTBA ("hours to be arranged") sections have no slots and never conflict.
 * - Two courses CONFLICT in a term when every way of choosing one primary
 *   section of each overlaps in time. If any pairing is free, there is a
 *   schedule that works, so it is not reported as a conflict.
 */

import {
  getCourseSectionsForTerm,
  SIMULATOR_FALL_TERM,
  SIMULATOR_SPRING_TERM,
  type CourseSection,
  type MeetingSlot,
} from "./courseCatalog";

export const DISCUSSION_SECTION_TYPE = "DS";

/** Terms the catalog carries meeting times for. */
export const MEETING_TIME_TERMS: readonly string[] = [
  SIMULATOR_FALL_TERM,
  SIMULATOR_SPRING_TERM,
];

export const hasMeetingTimesForTerm = (term: string): boolean =>
  MEETING_TIME_TERMS.includes(term);

export const isDiscussionSection = (section: CourseSection): boolean =>
  section.type === DISCUSSION_SECTION_TYPE;

export const primarySections = (sections: CourseSection[]): CourseSection[] =>
  sections.filter((s) => !isDiscussionSection(s));

/** True when two weekly slots share a day and overlap in time. */
export const slotsOverlap = (a: MeetingSlot, b: MeetingSlot): boolean =>
  a.day === b.day && a.start < b.end && b.start < a.end;

/** True when any slot of one section overlaps any slot of the other. */
export const sectionsOverlap = (a: CourseSection, b: CourseSection): boolean =>
  a.slots.some((sa) => b.slots.some((sb) => slotsOverlap(sa, sb)));

/**
 * Display strings for a course's primary sections in a term, deduplicated
 * and in section order, e.g. ["TTh 11:35a-12:50p"] or ["MW 9-10:15a", "HTBA"].
 * Undefined when the catalog has no sections for that course and term.
 */
export const getMeetingLabels = (
  code: string,
  term: string,
): string[] | undefined => {
  const sections = getCourseSectionsForTerm(code, term);
  if (!sections) return undefined;
  const labels: string[] = [];
  for (const section of primarySections(sections)) {
    const label = section.meets || "HTBA";
    if (!labels.includes(label)) labels.push(label);
  }
  return labels.length > 0 ? labels : undefined;
};

/** Short summary for a chip: first label plus a count when there are more. */
export const formatMeetingSummary = (labels: string[] | undefined): string | undefined => {
  if (!labels || labels.length === 0) return undefined;
  if (labels.length === 1) return labels[0];
  return `${labels[0]} +${labels.length - 1}`;
};

export type MeetingConflict = {
  /** Canonical codes as given, in input order. */
  a: string;
  b: string;
  term: string;
};

/**
 * Two courses conflict in a term when no pairing of their primary sections
 * is free of overlap. Courses with no section data, or only HTBA sections,
 * never conflict (unknown is not the same as clashing).
 */
export const coursesConflict = (a: string, b: string, term: string): boolean => {
  const sa = getCourseSectionsForTerm(a, term);
  const sb = getCourseSectionsForTerm(b, term);
  if (!sa || !sb) return false;
  const pa = primarySections(sa).filter((s) => s.slots.length > 0);
  const pb = primarySections(sb).filter((s) => s.slots.length > 0);
  if (pa.length === 0 || pb.length === 0) return false;
  // Any timed primary section of A that clears every timed section of B is a
  // workable schedule. HTBA primary sections were filtered out above, but if
  // a course has one, it is also a workable choice.
  const aHasHtba = primarySections(sa).some((s) => s.slots.length === 0);
  const bHasHtba = primarySections(sb).some((s) => s.slots.length === 0);
  if (aHasHtba || bHasHtba) return false;
  return pa.every((x) => pb.every((y) => sectionsOverlap(x, y)));
};

/**
 * Every conflicting pair among the courses planned in one term. Codes are
 * compared as given; callers should pass canonical codes. Each unordered pair
 * is reported once.
 */
export const findTermConflicts = (codes: string[], term: string): MeetingConflict[] => {
  if (!hasMeetingTimesForTerm(term)) return [];
  const conflicts: MeetingConflict[] = [];
  for (let i = 0; i < codes.length; i += 1) {
    for (let j = i + 1; j < codes.length; j += 1) {
      if (codes[i] === codes[j]) continue;
      if (coursesConflict(codes[i], codes[j], term)) {
        conflicts.push({ a: codes[i], b: codes[j], term });
      }
    }
  }
  return conflicts;
};

/** Codes that appear in at least one conflict, for per-chip highlighting. */
export const conflictingCodes = (conflicts: MeetingConflict[]): Set<string> => {
  const set = new Set<string>();
  for (const c of conflicts) {
    set.add(c.a);
    set.add(c.b);
  }
  return set;
};
