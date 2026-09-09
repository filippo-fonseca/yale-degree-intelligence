/**
 * Meeting times for the simulator.
 *
 * Everything here is deterministic and derived from the registrar's own
 * structured section data in lib/courses.json (see scripts/apply-meeting-times.mjs).
 *
 * Two kinds of term:
 * - ACTUAL: Fall 2026 / Spring 2027, where the catalog carries the registrar's
 *   published sections.
 * - PROJECTED: any later Fall or Spring. Yale has not published those, so a
 *   course shows the slot it holds in its most recent same-season offering
 *   (Fall 2026 for a Fall term, Spring 2027 for a Spring term), if it has one
 *   with a real time. The catalog's `projected` key says which offering that
 *   is and how many consecutive years the course has held the same slot, so
 *   the UI can say how much to trust it. Historically about two in three Yale
 *   courses keep an identical slot the following year.
 *
 * Vocabulary:
 * - A section a student enrolls in is a "primary" section. Discussion
 *   sections (registrar type "DS") are chosen after enrolling and are ignored
 *   for conflicts, since a student can usually pick one that fits.
 * - HTBA ("hours to be arranged") sections have no slots and never conflict.
 * - Two courses CONFLICT in a term when every way of choosing one primary
 *   section of each overlaps in time. If any pairing is free, there is a
 *   schedule that works, so it is not reported as a conflict. In a projected
 *   term the same rule runs over projected sections and the conflict is
 *   flagged as projected.
 */

import { parseTermName } from "./academicTerm";
import {
  getCourseInfo,
  getCourseSectionsForTerm,
  SIMULATOR_FALL_TERM,
  SIMULATOR_SPRING_TERM,
  type CourseSection,
  type MeetingProjection,
  type MeetingSlot,
  type Season,
} from "./courseCatalog";

export const DISCUSSION_SECTION_TYPE = "DS";

/** Terms the catalog carries the registrar's published meeting times for. */
export const MEETING_TIME_TERMS: readonly string[] = [
  SIMULATOR_FALL_TERM,
  SIMULATOR_SPRING_TERM,
];

/** The most recent published offering a projected term borrows from. */
export const PROJECTION_SOURCE_TERM: Record<Season, string> = {
  Fall: SIMULATOR_FALL_TERM,
  Spring: SIMULATOR_SPRING_TERM,
};

export const hasMeetingTimesForTerm = (term: string): boolean =>
  MEETING_TIME_TERMS.includes(term);

export const seasonOfTerm = (term: string): Season | undefined => {
  const parsed = parseTermName(term);
  return parsed?.term === "Fall" || parsed?.term === "Spring" ? parsed.term : undefined;
};

/** A Fall or Spring term after the last published one. */
export const isProjectedTerm = (term: string): boolean => {
  const parsed = parseTermName(term);
  const season = seasonOfTerm(term);
  if (!parsed || !season) return false;
  const source = parseTermName(PROJECTION_SOURCE_TERM[season]);
  return !!source && parsed.year > source.year;
};

export type MeetingTimeMode = "actual" | "projected" | "none";

export const meetingTimeMode = (term: string): MeetingTimeMode =>
  hasMeetingTimesForTerm(term) ? "actual" : isProjectedTerm(term) ? "projected" : "none";

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

export type ResolvedMeetings = {
  sections: CourseSection[];
  /** The published term the sections belong to. */
  from: string;
  /** Set when `term` is later than `from` and the sections are a projection. */
  projection?: MeetingProjection;
};

/**
 * The sections to use for a course in a term: the registrar's own for an
 * actual term, the most recent same-season offering for a projected term
 * (only when the catalog's `projected` key vouches for it), nothing otherwise.
 */
export const resolveMeetings = (code: string, term: string): ResolvedMeetings | undefined => {
  const mode = meetingTimeMode(term);
  if (mode === "actual") {
    const sections = getCourseSectionsForTerm(code, term);
    return sections ? { sections, from: term } : undefined;
  }
  if (mode !== "projected") return undefined;
  const season = seasonOfTerm(term)!;
  const projection = getCourseInfo(code)?.projected?.[season];
  if (!projection) return undefined;
  const sections = getCourseSectionsForTerm(code, projection.from);
  if (!sections) return undefined;
  return { sections, from: projection.from, projection };
};

/**
 * Display strings for a course's primary sections in a term, deduplicated
 * and in section order, e.g. ["TTh 11:35a-12:50p"] or ["MW 9-10:15a", "HTBA"].
 * Projected terms resolve to the source offering's labels. Undefined when
 * there is nothing to show.
 */
export const getMeetingLabels = (
  code: string,
  term: string,
): string[] | undefined => {
  const resolved = resolveMeetings(code, term);
  if (!resolved) return undefined;
  const labels: string[] = [];
  for (const section of primarySections(resolved.sections)) {
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

export const HTBA_LABEL = "HTBA";
export const NO_TIME_LISTED_LABEL = "No time listed";
export const NO_TIME_TO_PROJECT_LABEL = "No recent time";

export type MeetingTimeDescription = {
  text: string;
  detail: string;
  /** False only when there is no section at all to show. */
  listed: boolean;
  /** Set when the text is a projection from an earlier offering. */
  projection?: MeetingProjection;
};

const stabilityPhrase = (projection: MeetingProjection): string =>
  projection.stableYears >= 2
    ? `It has held this slot for ${projection.stableYears} years running.`
    : "That is its only recent offering with a set time.";

/**
 * What to print next to a course in a term that carries meeting times. Never
 * empty: a course with no section says so explicitly, HTBA is explained, and
 * a projection says where it comes from and that it may change.
 */
export const describeMeetingTime = (
  code: string,
  term: string,
): MeetingTimeDescription => {
  const mode = meetingTimeMode(term);
  const resolved = resolveMeetings(code, term);
  const labels = getMeetingLabels(code, term);
  if (!resolved || !labels) {
    if (mode === "projected") {
      const season = seasonOfTerm(term);
      return {
        text: NO_TIME_TO_PROJECT_LABEL,
        detail: `Yale has not published ${term} yet, and this course had no ${season} section with a set time in 2026-27, so there is nothing to project.`,
        listed: false,
      };
    }
    return {
      text: NO_TIME_LISTED_LABEL,
      detail: `Yale Course Search lists no section for this course in ${term}. Check the registrar before counting on it.`,
      listed: false,
    };
  }
  const text = formatMeetingSummary(labels) ?? NO_TIME_LISTED_LABEL;
  if (labels.length === 1 && labels[0] === HTBA_LABEL) {
    return {
      text,
      detail: "Hours to be arranged: the registrar has not set a meeting time, so this course cannot be checked for conflicts.",
      listed: true,
      projection: resolved.projection,
    };
  }
  if (resolved.projection) {
    return {
      text,
      detail: `Projected from ${resolved.from}. ${stabilityPhrase(resolved.projection)} Yale has not published ${term}; times often change, so treat this as a guide only.`,
      listed: true,
      projection: resolved.projection,
    };
  }
  return { text, detail: labels.join("\n"), listed: true };
};

export type MeetingConflict = {
  /** Canonical codes as given, in input order. */
  a: string;
  b: string;
  term: string;
  /** True when the term's times are projections rather than published times. */
  projected: boolean;
};

const timedPrimary = (resolved: ResolvedMeetings | undefined): CourseSection[] | undefined => {
  if (!resolved) return undefined;
  const primary = primarySections(resolved.sections);
  // An HTBA primary section is always a workable choice, so nothing to check.
  if (primary.some((s) => s.slots.length === 0)) return undefined;
  const timed = primary.filter((s) => s.slots.length > 0);
  return timed.length > 0 ? timed : undefined;
};

/**
 * Two courses conflict in a term when no pairing of their primary sections
 * is free of overlap. Courses with no section data, or with an HTBA option,
 * never conflict (unknown is not the same as clashing).
 */
export const coursesConflict = (a: string, b: string, term: string): boolean => {
  const pa = timedPrimary(resolveMeetings(a, term));
  const pb = timedPrimary(resolveMeetings(b, term));
  if (!pa || !pb) return false;
  return pa.every((x) => pb.every((y) => sectionsOverlap(x, y)));
};

/**
 * Every conflicting pair among the courses planned in one term. Codes are
 * compared as given; callers should pass canonical codes. Each unordered pair
 * is reported once. Nothing is reported for terms with neither published nor
 * projectable times.
 */
export const findTermConflicts = (codes: string[], term: string): MeetingConflict[] => {
  const mode = meetingTimeMode(term);
  if (mode === "none") return [];
  const conflicts: MeetingConflict[] = [];
  for (let i = 0; i < codes.length; i += 1) {
    for (let j = i + 1; j < codes.length; j += 1) {
      if (codes[i] === codes[j]) continue;
      if (coursesConflict(codes[i], codes[j], term)) {
        conflicts.push({ a: codes[i], b: codes[j], term, projected: mode === "projected" });
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
