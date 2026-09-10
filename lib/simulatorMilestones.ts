/**
 * The Simulator's distributional feed: one plan-wide view of a student's
 * courses, built once and read by both surfaces that need it.
 *
 * Two things go wrong if the canvas is fed to those surfaces raw.
 *
 * 1. A course may only count toward ONE of the five area/skill requirements,
 *    which is what `allocateDistributionals` decides. Feeding planned courses
 *    their raw tag list let a planned "Hu, WR" course count toward both, while
 *    the same course on the transcript counted once.
 * 2. Credits are real numbers. A half-credit planned course fed as a bare tag
 *    list was tallied as a full credit, because that is the only thing a bare
 *    tag list can mean.
 *
 * Both are fixed by routing planned coursework through exactly the allocation
 * the transcript already uses, with the course's real credits attached.
 *
 * The milestone feed is the same course set shaped for
 * `evaluateDistributionalMilestones`, which needs the TERM a course sits in:
 * promotion milestones are cumulative deadlines, so a course planned for
 * senior spring cannot fill a sophomore-year slot.
 */

import type { Course } from "@/lib/types";
import { getCourseCreditsFromCode } from "@/lib/courseCatalog";
import { allocateDistributionals } from "@/lib/distributionalAllocation";
import type { DistTallyInput } from "@/lib/distributionalTally";
import {
  toMilestoneCourseInputs,
  type MilestoneCourseInput,
} from "@/lib/distributionalMilestones";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";
import { parseTermName } from "@/lib/academicTerm";

/** The shape of a canvas column. Structurally the Simulator's `Semester`. */
export type PlanSemesterLike = {
  name: string;
  courses: Course[];
};

/**
 * Language levels are a separate axis from the five allocated requirements, so
 * they survive allocation untouched and are reported alongside whatever
 * requirement the course was allocated to.
 */
const LANGUAGE_LEVELS = new Set(["L1", "L2", "L3", "L4", "L5"]);

/**
 * A course's real credit value: what the student stored, else what the catalog
 * says about the code, else one credit.
 */
export function planCourseCredits(course: Course): number {
  if (typeof course.credits === "number" && course.credits > 0) {
    return course.credits;
  }
  const fromCatalog = getCourseCreditsFromCode(course.code);
  return typeof fromCatalog === "number" && fromCatalog > 0 ? fromCatalog : 1;
}

/** A canvas course together with the term column it sits in. */
export type PlannedPlacement = { course: Course; term: string };

function isRealCourse(course: Course | null | undefined): course is Course {
  return !!course?.code && !course.skipped && course.status !== "skipped";
}

/**
 * The courses the plan schedules but the student has not taken.
 *
 * A code already on the transcript is dropped: the transcript wins, because it
 * carries a grade and a settled term. First placement wins for a code that
 * somehow appears in two columns, matching the rest of the Simulator.
 */
export function collectPlannedPlacements(
  semesters: PlanSemesterLike[],
  takenCodes: Iterable<string> = [],
): PlannedPlacement[] {
  const seen = new Set<string>(takenCodes);
  const out: PlannedPlacement[] = [];
  (semesters ?? []).forEach((sem) => {
    (sem?.courses ?? []).forEach((course) => {
      if (!isRealCourse(course)) return;
      if (course.status !== "not-taken") return;
      if (seen.has(course.code)) return;
      seen.add(course.code);
      out.push({ course, term: sem.name });
    });
  });
  return out;
}

/** Term name a course sits in on the canvas, keyed by code. */
function termByCode(semesters: PlanSemesterLike[]): Record<string, string> {
  const map: Record<string, string> = {};
  (semesters ?? []).forEach((sem) => {
    (sem?.courses ?? []).forEach((course) => {
      if (
        isRealCourse(course) &&
        !(course.code in map) &&
        parseTermName(sem.name)
      ) {
        map[course.code] = sem.name;
      }
    });
  });
  return map;
}

/**
 * Every course in the plan, shaped for the milestone engine: the transcript
 * (completed and in-progress) plus everything on the canvas that is still
 * ahead of the student.
 */
export function buildMilestoneCourseInputs(args: {
  /** Completed and in-progress courses, the Simulator's `takenForProjection`. */
  taken: Course[];
  semesters: PlanSemesterLike[];
}): MilestoneCourseInput[] {
  const { taken, semesters } = args;
  const columnTerm = termByCode(semesters);

  const takenInputs = toMilestoneCourseInputs(taken ?? []).map((input) => ({
    ...input,
    credits: input.credits > 0 ? input.credits : 1,
    // A course held only by the plan has no stored semester/year, so fall back
    // to the column it sits in rather than treating it as undated.
    term: input.term ?? columnTerm[input.code] ?? null,
  }));

  const takenCodes = new Set((taken ?? []).filter(isRealCourse).map((c) => c.code));

  const plannedInputs: MilestoneCourseInput[] = collectPlannedPlacements(
    semesters,
    takenCodes,
  ).map(({ course, term }) => ({
    id: course.id || `${term}:${course.code}`,
    code: course.code,
    credits: planCourseCredits(course),
    distributionals: effectiveDistributionals(course),
    status: "planned" as const,
    grade: course.grade ?? null,
    term: parseTermName(term) ? term : null,
  }));

  return [...takenInputs, ...plannedInputs];
}

/**
 * The distributional tally feed: one entry per course, carrying the single
 * requirement it was allocated to (plus any language level) and its real
 * credits.
 */
export function buildDistributionalTallyInputs(args: {
  taken: Course[];
  semesters: PlanSemesterLike[];
  auto: boolean;
  overrides: Record<string, string>;
}): DistTallyInput[] {
  const { taken, semesters, auto, overrides } = args;

  const takenCourses = (taken ?? []).filter(isRealCourse);
  const takenCodes = new Set(takenCourses.map((c) => c.code));
  const plannedCourses = collectPlannedPlacements(semesters, takenCodes).map(
    (p) => p.course,
  );

  // Credits are resolved before allocation so the allocator and the tally
  // agree on what a half-credit course is worth.
  const courses: Course[] = [...takenCourses, ...plannedCourses].map((c) => ({
    ...c,
    credits: planCourseCredits(c),
  }));

  const allocation = allocateDistributionals(courses, { auto, overrides });

  const entries: DistTallyInput[] = [];
  courses.forEach((course) => {
    const req = allocation.reqByCourseKey[allocation.keyOf(course)];
    const languages = effectiveDistributionals(course).filter((t) =>
      LANGUAGE_LEVELS.has(t),
    );
    const codes = [...(req ? [req] : []), ...languages];
    if (codes.length === 0) return;
    entries.push({ codes, credits: course.credits });
  });
  return entries;
}
