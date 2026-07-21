import type { Course } from "@/lib/types";
import { getCurrentTerm } from "@/lib/academicTerm";
import {
  getCourseNameFromCode,
  getCourseCreditsFromCode,
  getCourseDistributionalsFromCode,
  isValidCourseCode,
} from "@/lib/courseCatalog";

// Pure, framework-agnostic operations on Simulator "plans". These mirror the
// in-component mutations in components/Simulator/Simulator.tsx so the same logic
// can be reused by Dan's write-tools (server-side) and, later, by the component
// itself. Persistence is just `users/{uid}.savedPlans: Plan[]`.

export interface PlanSemester {
  id: string; // e.g. "Fall-2026"
  name: string; // e.g. "Fall 2026"
  courses: Course[];
}

export interface Plan {
  name: string;
  semesters: PlanSemester[];
  manualRequirements?: any[];
  createdAt: string;
  isDefault?: boolean;
  showDistributionals?: boolean;
  showGrades?: boolean;
}

const TERMS = ["Spring", "Fall"] as const;

function semesterId(term: string, year: number): string {
  return `${term}-${year}`;
}

// Future semesters from the current term through Spring of the graduation year.
export function generateFutureSemesters(
  graduationYear: number,
  fromDate = new Date()
): PlanSemester[] {
  const { term, year } = getCurrentTerm(fromDate);
  const out: PlanSemester[] = [];
  let y = year;
  let tIdx = TERMS.indexOf(term);
  // Walk term by term until we pass Spring of the grad year.
  while (y < graduationYear || (y === graduationYear && TERMS[tIdx] === "Spring")) {
    const t = TERMS[tIdx];
    out.push({ id: semesterId(t, y), name: `${t} ${y}`, courses: [] });
    if (t === "Spring") {
      tIdx = TERMS.indexOf("Fall");
    } else {
      tIdx = TERMS.indexOf("Spring");
      y += 1;
    }
    if (out.length > 12) break; // safety
  }
  return out;
}

export function createPlan(name: string, graduationYear: number, fromDate = new Date()): Plan {
  return {
    name: name.trim() || "Untitled plan",
    semesters: generateFutureSemesters(graduationYear, fromDate),
    manualRequirements: [],
    createdAt: new Date().toISOString(),
  };
}

// Build a planned Course object for a code placed in a given semester.
export function makePlannedCourse(
  code: string,
  semester: PlanSemester,
  uid = ""
): Course {
  const [term, yearStr] = semester.id.split("-");
  return {
    id: `plan-${code}-${semester.id}`,
    code,
    grade: null,
    semester: term,
    year: Number(yearStr) || new Date().getFullYear(),
    userId: uid,
    status: "not-taken",
    credits: getCourseCreditsFromCode(code) ?? 1,
    distributionals: getCourseDistributionalsFromCode(code) ?? [],
  };
}

function findSemester(plan: Plan, semesterId: string): PlanSemester | undefined {
  return plan.semesters.find((s) => s.id === semesterId || s.name === semesterId);
}

export interface PlanMutationResult {
  plan: Plan;
  ok: boolean;
  message: string;
}

export function addCourseToSemester(
  plan: Plan,
  semesterId: string,
  code: string,
  uid = ""
): PlanMutationResult {
  if (!isValidCourseCode(code)) {
    return { plan, ok: false, message: `"${code}" is not a valid course code.` };
  }
  const sem = findSemester(plan, semesterId);
  if (!sem) {
    return {
      plan,
      ok: false,
      message: `No semester "${semesterId}" in plan. Options: ${plan.semesters
        .map((s) => s.name)
        .join(", ")}.`,
    };
  }
  if (sem.courses.some((c) => c.code === code)) {
    return { plan, ok: false, message: `${code} is already in ${sem.name}.` };
  }
  const next: Plan = {
    ...plan,
    semesters: plan.semesters.map((s) =>
      s.id === sem.id ? { ...s, courses: [...s.courses, makePlannedCourse(code, s, uid)] } : s
    ),
  };
  return {
    plan: next,
    ok: true,
    message: `Added ${code} (${getCourseNameFromCode(code) || "course"}) to ${sem.name}.`,
  };
}

export function removeCourseFromSemester(
  plan: Plan,
  semesterId: string,
  code: string
): PlanMutationResult {
  const sem = findSemester(plan, semesterId);
  if (!sem) return { plan, ok: false, message: `No semester "${semesterId}" in plan.` };
  if (!sem.courses.some((c) => c.code === code)) {
    return { plan, ok: false, message: `${code} is not in ${sem.name}.` };
  }
  const next: Plan = {
    ...plan,
    semesters: plan.semesters.map((s) =>
      s.id === sem.id ? { ...s, courses: s.courses.filter((c) => c.code !== code) } : s
    ),
  };
  return { plan: next, ok: true, message: `Removed ${code} from ${sem.name}.` };
}

export function moveCourse(
  plan: Plan,
  code: string,
  fromSemesterId: string,
  toSemesterId: string,
  uid = ""
): PlanMutationResult {
  const removed = removeCourseFromSemester(plan, fromSemesterId, code);
  if (!removed.ok) return removed;
  const added = addCourseToSemester(removed.plan, toSemesterId, code, uid);
  if (!added.ok) return added;
  const toSem = findSemester(plan, toSemesterId);
  return { plan: added.plan, ok: true, message: `Moved ${code} to ${toSem?.name || toSemesterId}.` };
}

export function renamePlan(plan: Plan, name: string): Plan {
  return { ...plan, name: name.trim() || plan.name };
}

// All planned (not-yet-taken) course codes across a plan, for progress preview.
export function plannedCodes(plan: Plan): string[] {
  return plan.semesters.flatMap((s) => s.courses.map((c) => c.code));
}
