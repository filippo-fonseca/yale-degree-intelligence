// Reconciles a saved Simulator plan with the student's live transcript.
//
// A plan document stores a snapshot of every semester on the canvas, taken
// courses included, from the moment it was saved. The transcript keeps
// moving after that: a term ends, grades come in, a re-upload adds the
// courses the student is taking now. Replaying the stale snapshot leaves a
// locked past semester missing courses that My Courses plainly shows.
//
// The rule here: taken courses (completed or in progress) always come from
// the live transcript, and the plan contributes only its planned, not-taken
// placements. The semester grid is extended so it always covers every
// transcript term, the calendar's current term, and the last term before
// graduation, with no gaps in between.

import type { Course } from "./types";
import {
  compareTermNames,
  formatTerm,
  getCurrentTerm,
  parseTermName,
  type AcademicTerm,
} from "./academicTerm";

/** The structural shape of a canvas column; matches the Simulator's Semester. */
export interface PlanSemester {
  id: string;
  name: string;
  courses: Course[];
}

/** `"Fall 2026"` for a Fall or Spring course; null for summer and odd terms. */
export function courseTermName(course: Course): string | null {
  const parsed = parseTermName(`${course.semester} ${course.year}`);
  return parsed ? formatTerm(parsed) : null;
}

function nextTerm(term: AcademicTerm): AcademicTerm {
  return term.term === "Fall"
    ? { term: "Spring", year: term.year + 1 }
    : { term: "Fall", year: term.year };
}

/** Every Fall/Spring term from `from` through `to`, inclusive. */
function termRange(from: AcademicTerm, to: AcademicTerm): string[] {
  const names: string[] = [];
  let cursor = from;
  while (compareTermNames(formatTerm(cursor), formatTerm(to)) <= 0) {
    names.push(formatTerm(cursor));
    cursor = nextTerm(cursor);
  }
  return names;
}

/**
 * Rebuilds the canvas columns from the live transcript plus the plan's
 * planned placements. Idempotent: reconciling an already reconciled grid
 * against the same transcript returns the same grid.
 */
export function reconcilePlanSemesters(
  planSemesters: PlanSemester[],
  transcriptCourses: Course[],
  graduationYear: number,
  now: Date = new Date(),
): PlanSemester[] {
  const knownTerms: AcademicTerm[] = [];
  for (const sem of planSemesters) {
    const parsed = parseTermName(sem.name);
    if (parsed) knownTerms.push(parsed);
  }
  for (const course of transcriptCourses) {
    const parsed = parseTermName(`${course.semester} ${course.year}`);
    if (parsed) knownTerms.push(parsed);
  }

  const current = getCurrentTerm(now);
  const lastBeforeGraduation: AcademicTerm = {
    term: "Spring",
    year: graduationYear,
  };

  const sortedKnown = [...knownTerms].sort((a, b) =>
    compareTermNames(formatTerm(a), formatTerm(b)),
  );
  // With nothing known yet, start four years before graduation, the same
  // way the blank grid does.
  const first: AcademicTerm = sortedKnown[0] ?? {
    term: "Fall",
    year: graduationYear - 4,
  };
  const lastKnown = sortedKnown[sortedKnown.length - 1];
  const last = [lastKnown, current, lastBeforeGraduation]
    .filter((t): t is AcademicTerm => Boolean(t))
    .sort((a, b) => compareTermNames(formatTerm(b), formatTerm(a)))[0];

  const names = termRange(first, last);

  const planByName = new Map(planSemesters.map((s) => [s.name, s]));
  const transcriptCodes = new Set(transcriptCourses.map((c) => c.code));

  const reconciled = names.map<PlanSemester>((name) => {
    const stored = planByName.get(name);
    const parsed = parseTermName(name)!;
    const courses: Course[] = [];
    const seen = new Set<string>();

    for (const course of transcriptCourses) {
      if (courseTermName(course) !== name || seen.has(course.code)) continue;
      seen.add(course.code);
      courses.push(course);
    }

    for (const course of stored?.courses ?? []) {
      if (course.status !== "not-taken") continue;
      if (transcriptCodes.has(course.code) || seen.has(course.code)) continue;
      seen.add(course.code);
      courses.push(course);
    }

    return {
      id: stored?.id ?? `${parsed.term}-${parsed.year}`,
      name,
      courses,
    };
  });

  // A stored column whose name is not a Fall/Spring term has nowhere to go
  // in the range; keep it at the end rather than silently dropping its plan.
  for (const sem of planSemesters) {
    if (parseTermName(sem.name)) continue;
    reconciled.push({
      ...sem,
      courses: sem.courses.filter(
        (c) => c.status === "not-taken" && !transcriptCodes.has(c.code),
      ),
    });
  }

  return reconciled;
}
