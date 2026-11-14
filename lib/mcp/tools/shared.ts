import type { Course } from "@/lib/types";
import type { Plan } from "@/components/Simulator/planTypes";
import { primaryPlan } from "@/components/Simulator/planTypes";
import { majorRequirements } from "@/lib/majors";
import { certificateRequirements } from "@/lib/certificates";
import { getCourseInfo, resolveCanonicalCode } from "@/lib/courseCatalog";
import { compareTermNames } from "@/lib/academicTerm";
import type { ProjectionProfile } from "../planProjection";
import type { UserDoc } from "../store";
import { ToolError, type ToolContext } from "./types";

export const DISTRIBUTIONAL_CODES = ["Hu", "So", "Sc", "QR", "WR", "L1", "L2", "L3", "L4", "L5"] as const;

export function defaultGraduationYear(now: Date): number {
  return now.getFullYear() + 4;
}

export function projectionProfile(user: UserDoc | null, now: Date): ProjectionProfile {
  return {
    majors: user?.majors ?? [],
    certificates: user?.certificates ?? [],
    graduationYear: user?.graduationYear ?? defaultGraduationYear(now),
    distributionalAutoAllocate: user?.distributionalAutoAllocate ?? true,
    distributionalAllocations: user?.distributionalAllocations ?? {},
    englishSatisfiesLanguage: user?.englishSatisfiesLanguage === true,
  };
}

/** Normalizes an agent-typed code ("cpsc 323", "CPSC323") to the catalog's. */
export function normalizeCode(raw: string): { code: string; known: boolean } {
  const trimmed = raw.trim();
  if (!trimmed) throw new ToolError("A course code is required.");
  const info = getCourseInfo(trimmed);
  return { code: info ? info.codes[0] : resolveCanonicalCode(trimmed), known: !!info };
}

export function requireProgram(type: "major" | "certificate", id: string) {
  const exists = type === "major" ? majorRequirements[id] : certificateRequirements[id];
  if (!exists) {
    throw new ToolError(
      `Unknown ${type} id "${id}". Call list_programs to find valid ids.`,
    );
  }
  return exists;
}

export function sortCourses(courses: Course[]): Course[] {
  return [...courses].sort((a, b) => {
    const aSkip = a.skipped || a.semester === "Skipped";
    const bSkip = b.skipped || b.semester === "Skipped";
    if (aSkip !== bSkip) return aSkip ? -1 : 1;
    if (a.year !== b.year) return a.year - b.year;
    const order: Record<string, number> = { Spring: 0, Summer: 1, Fall: 2 };
    const d = (order[a.semester] ?? 3) - (order[b.semester] ?? 3);
    return d !== 0 ? d : a.code.localeCompare(b.code);
  });
}

/** Finds a course by id, or by code when exactly one transcript entry has it. */
export function findCourse(courses: Course[], ref: { course_id?: string; code?: string }): Course {
  if (ref.course_id) {
    const byId = courses.find((c) => c.id === ref.course_id);
    if (!byId) throw new ToolError(`No course with id ${ref.course_id}. Call list_courses for ids.`);
    return byId;
  }
  if (!ref.code) throw new ToolError("Pass course_id or code.");
  const { code } = normalizeCode(ref.code);
  const matches = courses.filter((c) => resolveCanonicalCode(c.code) === code);
  if (matches.length === 0) throw new ToolError(`${code} is not on the student's transcript.`);
  if (matches.length > 1) {
    throw new ToolError(
      `${code} appears ${matches.length} times (ids ${matches.map((c) => c.id).join(", ")}). Pass course_id.`,
    );
  }
  return matches[0];
}

export function findPlan(plans: Plan[], name: string | undefined): Plan {
  if (plans.length === 0) {
    throw new ToolError("The student has no saved plans yet. Use create_plan first.");
  }
  if (!name) return primaryPlan(plans)!;
  const plan = plans.find((p) => p.name === name) ?? plans.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!plan) {
    throw new ToolError(
      `No plan named "${name}". Plans: ${plans.map((p) => `"${p.name}"`).join(", ")}.`,
    );
  }
  return plan;
}

export async function loadAll(ctx: ToolContext) {
  const [user, courses] = await Promise.all([ctx.store.getUser(), ctx.store.listCourses()]);
  return { user, courses };
}

export function compareTerms(a: string, b: string) {
  return compareTermNames(a, b);
}
