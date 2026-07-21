import type Anthropic from "@anthropic-ai/sdk";
import {
  calculateMajorProgress,
  calculatePreviewMajorProgressByMajors,
  MAJORS,
} from "@/lib/majors";
import {
  ALL_COURSES,
  getCourseInfo,
  isCourseOfferedInFall,
  isCourseOfferedInSpring,
} from "@/lib/courseCatalog";

// Server-trusted snapshot of the student, assembled by the route from Firestore.
// Tools read from this rather than from anything the client sends, so the model
// can never fabricate the student's record.
export interface StudentCourse {
  code: string;
  name: string;
  status: string;
  credits: number;
  distributionals: string[];
}

export interface StudentData {
  majors: string[];
  completedCodes: string[];
  inProgressCodes: string[];
  skippedCodes: string[];
  courses: StudentCourse[];
}

export interface ToolContext {
  student: StudentData;
}

// Standard Yale distributional targets (excluding language, which is level-based).
const DIST_TARGETS: Record<string, number> = { Hu: 2, Sc: 2, So: 2, QR: 2, WR: 2 };

// Compact projection of a MajorProgress for the model (token-efficient).
function compactProgress(majorId: string, mp: ReturnType<typeof calculateMajorProgress>) {
  return {
    major: MAJORS[majorId] || majorId,
    percentage: Math.round(mp.percentage),
    completedCredits: mp.completedCredits,
    totalCredits: mp.totalCredits,
    remaining: mp.remainingRequirements.slice(0, 8).map((r: any) => ({
      name: r.name,
      options: (r.options || [])
        .filter((o: any) => !o.completed && !o.inProgress)
        .slice(0, 4)
        .map((o: any) => o.code),
    })),
  };
}

export const TOOL_DEFS: Anthropic.Tool[] = [
  {
    name: "get_major_progress",
    description:
      "Get the student's progress toward a major: percentage complete, credits, and which requirements still remain with course options. Omit majorId to get every declared major.",
    input_schema: {
      type: "object",
      properties: {
        majorId: {
          type: "string",
          description: "Major id (e.g. 'CS'). Omit for all declared majors.",
        },
      },
    },
  },
  {
    name: "preview_plan",
    description:
      "Simulate adding a set of planned course codes and see how each major's progress would change. Use this to evaluate a hypothetical semester or what-if plan.",
    input_schema: {
      type: "object",
      properties: {
        plannedCodes: {
          type: "array",
          items: { type: "string" },
          description: "Course codes the student is considering taking.",
        },
        majorIds: {
          type: "array",
          items: { type: "string" },
          description: "Majors to evaluate against. Omit for the student's declared majors.",
        },
      },
      required: ["plannedCodes"],
    },
  },
  {
    name: "search_catalog",
    description:
      "Search the Yale course catalog by free-text query, optionally filtered by department or simulator term (fall = Fall 2026, spring = Spring 2027). Catalog has no distributionals — use list_my_courses for student dists. Returns matching courses.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free text matched against code, name, department." },
        dept: { type: "string", description: "Department code filter, e.g. 'CPSC'." },
        term: {
          type: "string",
          enum: ["fall", "spring"],
          description: "Simulator offering filter: fall = Fall 2026, spring = Spring 2027.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_course",
    description:
      "Get full details for a single course code: name, credits, department, historical offered terms, and whether it is in the Fall 2026 / Spring 2027 simulator pool.",
    input_schema: {
      type: "object",
      properties: { code: { type: "string", description: "Course code, e.g. 'CPSC 223'." } },
      required: ["code"],
    },
  },
  {
    name: "list_my_courses",
    description:
      "List the student's own courses with status (completed / in-progress / skipped), credits, and distributionals.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "get_distributional_progress",
    description:
      "Get the student's progress on Yale distributional requirements (Hu, Sc, So, QR, WR), counting completed and in-progress courses against the standard targets.",
    input_schema: { type: "object", properties: {} },
  },
];

function searchCatalog(input: any) {
  const query = String(input.query || "").toLowerCase().trim();
  const tokens = query.split(/\s+/).filter(Boolean);
  const dept = input.dept ? String(input.dept).toUpperCase() : null;
  const term = input.term ? String(input.term) : null;

  const deptNorm = dept === "EENG" ? "ECE" : dept;

  const results = ALL_COURSES.filter((c) => {
    const haystack = `${c.codes.join(" ")} ${c.name} ${c.department}`.toLowerCase();
    if (tokens.length && !tokens.every((t) => haystack.includes(t))) return false;
    if (
      deptNorm &&
      !c.codes.some((code) => code.toUpperCase().includes(deptNorm)) &&
      c.department.toUpperCase() !== deptNorm
    )
      return false;
    if (term === "fall" && !c.isFall) return false;
    if (term === "spring" && !c.isSpring) return false;
    return true;
  }).slice(0, 8);

  return results.map((c) => ({
    code: c.codes[0],
    name: c.name,
    credits: c.credits,
    department: c.department,
    offered: c.offered,
    offeredFall: c.isFall === true,
    offeredSpring: c.isSpring === true,
  }));
}

export async function executeTool(
  name: string,
  input: any,
  ctx: ToolContext
): Promise<string> {
  const s = ctx.student;
  let result: unknown;

  switch (name) {
    case "get_major_progress": {
      const ids = input.majorId ? [input.majorId] : s.majors;
      result = ids.map((id: string) =>
        compactProgress(
          id,
          calculateMajorProgress(id, s.completedCodes, s.inProgressCodes, s.skippedCodes)
        )
      );
      break;
    }
    case "preview_plan": {
      const ids: string[] = input.majorIds?.length ? input.majorIds : s.majors;
      const planned: string[] = input.plannedCodes || [];
      const byMajor = calculatePreviewMajorProgressByMajors(
        ids,
        s.completedCodes,
        s.inProgressCodes,
        s.skippedCodes,
        [],
        planned
      );
      result = Object.entries(byMajor).map(([id, mp]) => compactProgress(id, mp as any));
      break;
    }
    case "search_catalog": {
      result = searchCatalog(input);
      break;
    }
    case "get_course": {
      const code = String(input.code || "");
      const info = getCourseInfo(code);
      if (!info) {
        result = { error: `No course found for code "${code}".` };
      } else {
        result = {
          code: info.codes[0],
          allCodes: info.codes,
          name: info.name,
          credits: info.credits,
          department: info.department,
          offered: info.offered,
          offeredFall: isCourseOfferedInFall(code),
          offeredSpring: isCourseOfferedInSpring(code),
        };
      }
      break;
    }
    case "list_my_courses": {
      result = s.courses.map((c) => ({
        code: c.code,
        name: c.name,
        status: c.status,
        credits: c.credits,
        distributionals: c.distributionals,
      }));
      break;
    }
    case "get_distributional_progress": {
      const counts: Record<string, { completed: number; inProgress: number; target: number }> = {};
      for (const key of Object.keys(DIST_TARGETS)) {
        counts[key] = { completed: 0, inProgress: 0, target: DIST_TARGETS[key] };
      }
      for (const c of s.courses) {
        for (const d of c.distributionals || []) {
          const key = d.startsWith("L") ? "L" : d;
          if (!counts[key]) continue;
          if (c.status === "completed") counts[key].completed += 1;
          else if (c.status === "in-progress") counts[key].inProgress += 1;
        }
      }
      result = counts;
      break;
    }
    default:
      result = { error: `Unknown tool "${name}".` };
  }

  return JSON.stringify(result);
}
