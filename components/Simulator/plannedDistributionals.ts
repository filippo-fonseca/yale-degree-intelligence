import type { Course } from "@/lib/types";
import { getCourseDistributionalsFromCode } from "@/lib/courseCatalog";

/**
 * Which distributional tags a planned course's picker should show.
 *
 * Precedence, highest first:
 *   1. What the student stored on this course. An empty array counts: clearing
 *      every tag is an answer, not a blank, so it must not fall through to the
 *      catalog and reappear on the next render.
 *   2. What the catalog knows about the code, so a freshly planned course
 *      arrives with its real tags already selected instead of making the
 *      student retype what Yale already published.
 *   3. Nothing.
 *
 * Catalog tags are a starting point shown as ordinary selected pills, not a
 * separate visual state. The moment the student touches one, the picker's
 * onChange writes the whole resulting list onto the course and rule 1 takes
 * over for good.
 */
export function effectiveDistributionals(course: Course): string[] {
  if (Array.isArray(course.distributionals)) return course.distributionals;
  return getCourseDistributionalsFromCode(course.code) ?? [];
}
