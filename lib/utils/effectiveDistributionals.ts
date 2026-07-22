import { getCourseDistributionalsFromCode } from "@/lib/courseCatalog";

/**
 * The minimum a course-shaped object has to carry for its distributionals to be
 * resolved: the code the catalog is keyed on, and whatever was stored on it.
 * `Course`, `PublicCourse`, and the trimmed course objects the detail modals
 * pass around all satisfy this structurally.
 */
export interface DistributionalCourseLike {
  code: string;
  distributionals?: string[] | null;
}

/**
 * The distributional tags a course actually has, app-wide.
 *
 * Precedence, highest first:
 *   1. What is stored on the course. An empty array counts: a transcript that
 *      spelled the tags out, or a student who cleared every one of them, is an
 *      answer, not a blank, so it must not fall through to the catalog and have
 *      the tags reappear on the next render.
 *   2. What the catalog knows about the code, resolved through code aliases, so
 *      a course the student never touched still carries Yale's own tags.
 *   3. Nothing.
 *
 * Catalog tags are ordinary tags, not a separate visual state, and they count
 * toward the degree audit exactly like stored ones. That is the point: the
 * Distributionals tab fills itself in for a student who never tagged anything.
 */
export function effectiveDistributionals(
  course: DistributionalCourseLike | null | undefined,
): string[] {
  if (!course) return [];
  if (Array.isArray(course.distributionals)) return course.distributionals;
  return getCourseDistributionalsFromCode(course.code) ?? [];
}

/**
 * True when the course carries its own stored answer, so the catalog is not
 * consulted. Callers that need to persist the distinction (the friends public
 * projection, which cannot store `undefined`) use this to tell "the student
 * cleared everything" apart from "nobody has said anything yet".
 */
export function hasStoredDistributionals(
  course: DistributionalCourseLike | null | undefined,
): boolean {
  return Array.isArray(course?.distributionals);
}

/**
 * The list an edit starts from.
 *
 * Toggling a tag on a course whose field is absent has to materialize the
 * catalog defaults first, then apply the toggle, so that removing one wrong
 * catalog tag keeps the others and the removal sticks: the stored array is
 * authoritative from that moment on. Returns a copy, so callers can never
 * mutate the catalog's own array by accident.
 */
export function distributionalEditBase(
  course: DistributionalCourseLike | null | undefined,
): string[] {
  return [...effectiveDistributionals(course)];
}
