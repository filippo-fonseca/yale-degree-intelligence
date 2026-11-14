/**
 * Shapes the app's internal records into what agents read. Keys are
 * snake_case and stable: they are part of the documented tool contract in
 * docs/mcp/tools.md, so rename one only with a docs update.
 */
import type { Course, ManualRequirement } from "@/lib/types";
import type { MajorProgress } from "@/lib/majors";
import { getCourseInfo } from "@/lib/courseCatalog";
import { MAJORS } from "@/lib/majors";
import { CERTIFICATES } from "@/lib/certificates";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";

export function courseName(code: string, stored?: string): string {
  return stored || getCourseInfo(code)?.name || code;
}

export function programName(type: "major" | "certificate", id: string): string {
  return (type === "major" ? MAJORS[id] : CERTIFICATES[id]) ?? id;
}

function assignmentView(m: ManualRequirement) {
  return m.certificate_id
    ? { program_type: "certificate" as const, program_id: m.certificate_id, requirement: m.requirement_title }
    : { program_type: "major" as const, program_id: m.major_id ?? "", requirement: m.requirement_title };
}

export function courseTerm(c: Pick<Course, "semester" | "year" | "skipped">): string {
  if (c.skipped || c.semester === "Skipped") return "Placed out";
  return `${c.semester} ${c.year}`;
}

export function courseView(c: Course) {
  return {
    id: c.id,
    code: c.code,
    name: courseName(c.code, c.name),
    term: courseTerm(c),
    status: c.skipped ? ("placed_out" as const) : c.status.replace("-", "_"),
    grade: c.grade,
    credits: c.credits,
    distributionals: effectiveDistributionals(c),
    distributionals_set_manually: Array.isArray(c.distributionals),
    requirement_assignments: (c.manualRequirementsFulfilled ?? []).map(assignmentView),
    requirement_exclusions: (c.excludedFromRequirements ?? []).map(assignmentView),
  };
}

type Requirement = MajorProgress["completedRequirements"][number];

function requirementView(r: Requirement, state: "satisfied" | "in_progress" | "remaining") {
  const counted = r.options.filter((o) => o.completed || o.inProgress);
  const view: Record<string, unknown> = {
    name: r.name,
    state,
    completed: r.completed,
    required: r.required,
    counted_courses: counted.map((o) => ({
      code: o.code,
      status: o.completed ? "completed" : "in_progress_or_planned",
      ...(o.manual ? { manual: true } : {}),
      ...(o.creditDFail ? { credit_d_fail: o.creditDFail } : {}),
    })),
  };
  if (r.description) view.description = r.description;
  if (r.tags?.length) view.distributional_tags = r.tags;
  if (state !== "satisfied") {
    const open = r.options.filter((o) => !o.completed && !o.inProgress);
    view.example_options = open.slice(0, 12).map((o) => o.code);
    if (open.length > 12) view.more_options = open.length - 12;
  }
  return view;
}

export function progressView(type: "major" | "certificate", id: string, p: MajorProgress) {
  return {
    program_type: type,
    program_id: id,
    program_name: programName(type, id),
    percent_complete: Math.round(p.percentage),
    percent_including_in_progress: Math.round(p.percentage + p.inProgressPercentage),
    credits: {
      completed: p.completedCredits,
      in_progress: p.inProgressCredits,
      remaining: p.remainingCredits,
      total: p.totalCredits,
    },
    requirements: [
      ...p.completedRequirements.map((r) => requirementView(r, "satisfied")),
      ...p.inProgressRequirements.map((r) => requirementView(r, "in_progress")),
      ...p.remainingRequirements.map((r) => requirementView(r, "remaining")),
    ],
  };
}
