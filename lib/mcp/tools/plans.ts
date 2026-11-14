import { z } from "zod";
import type { Course } from "@/lib/types";
import type { Plan, Semester } from "@/components/Simulator/planTypes";
import { getCourseInfo, isCourseOfferedInFall, isCourseOfferedInSpring } from "@/lib/courseCatalog";
import { compareTermNames, formatTerm, isPastTerm, parseTermName } from "@/lib/academicTerm";
import { reconcilePlanSemesters } from "@/lib/simulatorPlanReconcile";
import { findMatchedRequirements } from "@/lib/simulatorPolicy";
import { admitPlannedCourse, planContext } from "../planProjection";
import { programName } from "../format";
import type { UserDoc } from "../store";
import { findPlan, normalizeCode, projectionProfile, requireProgram } from "./shared";
import { ToolError, defineTool, writeAnnotations, type ToolContext } from "./types";
import { dryRunField, performWrite } from "./write";

const PLAN_NAME_MAX = 60;
const planNameField = z.string().optional().describe("Plan name from list_plans. Default: the default plan.");

/**
 * Runs `mutate` against a copy of the student's plans for the preview, and
 * again inside a transaction on the live document when applied, so a plan
 * edited in the app between the two is never overwritten wholesale.
 */
async function planWrite(
  ctx: ToolContext,
  tool: string,
  dryRun: boolean | undefined,
  mutate: (plans: Plan[], user: UserDoc | null) => {
    plans: Plan[];
    summary: string;
    changed: boolean;
    result?: Record<string, unknown>;
  },
) {
  return performWrite(
    ctx,
    tool,
    dryRun,
    async () => {
      const user = await ctx.store.getUser();
      const preview = mutate(structuredClone(user?.savedPlans ?? []), user);
      return {
        changed: preview.changed,
        summary: preview.summary,
        result: preview.result,
        detail: { tool },
        apply: async () => {
          await ctx.store.transactUser((current) => {
            const live = mutate(structuredClone(current?.savedPlans ?? []), current);
            return { patch: live.changed ? { savedPlans: live.plans } : null, result: undefined };
          });
        },
      };
    },
    { touchesCourses: false },
  );
}

function ensureDefault(plans: Plan[]): Plan[] {
  if (plans.length === 0 || plans.some((p) => p.isDefault)) return plans;
  const newest = [...plans].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""))[0];
  return plans.map((p) => ({ ...p, isDefault: p === newest }));
}

function validPlanName(raw: string): string {
  const name = raw.trim();
  if (!name) throw new ToolError("A plan name can't be empty.");
  if (name.length > PLAN_NAME_MAX) throw new ToolError(`Plan names are at most ${PLAN_NAME_MAX} characters.`);
  return name;
}

/** "fall 2027" -> "Fall 2027"; refuses summer and past terms. */
function plannableTerm(raw: string, now: Date, graduationYear: number): string {
  const cleaned = raw.trim().replace(/\s+/g, " ").replace(/^(\w)(\w*)/, (_, a: string, b: string) => a.toUpperCase() + b.toLowerCase());
  const parsed = parseTermName(cleaned);
  if (!parsed) {
    throw new ToolError(`"${raw}" isn't a plannable term. Plans have Fall and Spring terms only, e.g. "Fall 2027".`);
  }
  const term = formatTerm(parsed);
  if (isPastTerm(term, now)) throw new ToolError(`${term} is in the past; past terms come from the transcript.`);
  if (compareTermNames(term, `Spring ${graduationYear + 1}`) > 0) {
    throw new ToolError(`${term} is after the student's graduation (${graduationYear}).`);
  }
  return term;
}

function semesterFor(plan: Plan, term: string): Semester {
  let sem = plan.semesters.find((s) => s.name === term);
  if (!sem) {
    const parsed = parseTermName(term)!;
    sem = { id: `${parsed.term}-${parsed.year}`, name: term, courses: [] };
    plan.semesters = [...plan.semesters, sem].sort((a, b) => compareTermNames(a.name, b.name));
  }
  return sem;
}

function plannedCourse(code: string, uid: string, now: Date): Course {
  return {
    id: `${code}-mcp-${now.getTime()}`,
    code,
    grade: null,
    // The Simulator's own pool courses carry no term; their column is the term.
    semester: "TBD",
    year: 0,
    userId: uid,
    status: "not-taken",
    credits: getCourseInfo(code)?.credits ?? 1,
    skipped: false,
  };
}

function plannedIn(plan: Plan, code: string): Semester | undefined {
  return plan.semesters.find((s) =>
    s.courses.some((c) => c?.status === "not-taken" && normalizeCode(c.code).code === code),
  );
}

export const createPlan = defineTool({
  name: "create_plan",
  title: "Create a Simulator plan",
  description:
    "Saves a new four-year plan. With copy_from it duplicates an existing plan (its planned courses and manual assignments); otherwise it starts with just the transcript and empty future terms. The first plan becomes the default.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: false }),
  input: {
    name: z.string().max(PLAN_NAME_MAX),
    copy_from: z.string().optional().describe("Name of a plan to duplicate."),
    make_default: z.boolean().optional(),
    ...dryRunField,
  },
  run: async (ctx, args) => {
    const name = validPlanName(args.name);
    const now = ctx.now();
    const courses = args.copy_from ? [] : await ctx.store.listCourses();
    return planWrite(ctx, "create_plan", args.dry_run, (plans, user) => {
      if (plans.some((p) => p.name === name)) {
        throw new ToolError(`There's already a plan named "${name}".`);
      }
      const base: Plan = args.copy_from
        ? { ...structuredClone(findPlan(plans, args.copy_from)), isDefault: false }
        : {
            name,
            semesters: reconcilePlanSemesters([], courses, projectionProfile(user, now).graduationYear, now),
            manualRequirements: [],
            createdAt: now.toISOString(),
          };
      const plan: Plan = { ...base, name, createdAt: now.toISOString() };
      const makeDefault = args.make_default || plans.length === 0;
      const next = [...plans.map((p) => (makeDefault ? { ...p, isDefault: false } : p)), { ...plan, isDefault: makeDefault }];
      return {
        plans: next,
        changed: true,
        summary: `Created plan "${name}"${args.copy_from ? ` from "${args.copy_from}"` : ""}${makeDefault ? " as the default" : ""}`,
        result: { plan: name, is_default: makeDefault },
      };
    });
  },
});

export const updatePlan = defineTool({
  name: "update_plan",
  title: "Rename a plan or make it the default",
  description:
    "Renames a plan, makes it the default (the plan the rest of the app treats as the student's), or toggles its distributional and grade display in the Simulator.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    plan_name: z.string(),
    new_name: z.string().max(PLAN_NAME_MAX).optional(),
    make_default: z.literal(true).optional(),
    show_distributionals: z.boolean().optional(),
    show_grades: z.boolean().optional(),
    ...dryRunField,
  },
  run: (ctx, args) =>
    planWrite(ctx, "update_plan", args.dry_run, (plans) => {
      const plan = findPlan(plans, args.plan_name);
      const changes: string[] = [];
      let next = plans;
      if (args.new_name !== undefined) {
        const newName = validPlanName(args.new_name);
        if (newName !== plan.name) {
          if (plans.some((p) => p !== plan && p.name === newName)) {
            throw new ToolError(`There's already a plan named "${newName}".`);
          }
          changes.push(`renamed it "${newName}"`);
          plan.name = newName;
        }
      }
      if (args.make_default && !plan.isDefault) {
        next = plans.map((p) => ({ ...p, isDefault: p === plan }));
        changes.push("made it the default");
      }
      if (args.show_distributionals !== undefined && args.show_distributionals !== !!plan.showDistributionals) {
        plan.showDistributionals = args.show_distributionals;
        changes.push(`${args.show_distributionals ? "showed" : "hid"} distributionals`);
      }
      if (args.show_grades !== undefined && args.show_grades !== !!plan.showGrades) {
        plan.showGrades = args.show_grades;
        changes.push(`${args.show_grades ? "showed" : "hid"} grades`);
      }
      return {
        plans: next,
        changed: changes.length > 0,
        summary: changes.length ? `Plan "${args.plan_name}": ${changes.join(", ")}` : `plan "${args.plan_name}" already matches`,
      };
    }),
});

export const deletePlan = defineTool({
  name: "delete_plan",
  title: "Delete a plan",
  description:
    "Deletes a saved plan and everything on it. Cannot be undone; confirm with the student first. If it was the default, the newest remaining plan becomes the default.",
  scope: "write",
  annotations: writeAnnotations({ destructive: true, idempotent: true }),
  input: { plan_name: z.string(), ...dryRunField },
  run: (ctx, args) =>
    planWrite(ctx, "delete_plan", args.dry_run, (plans) => {
      const plan = plans.find((p) => p.name === args.plan_name);
      if (!plan) return { plans, changed: false, summary: `there's no plan named "${args.plan_name}"` };
      const next = ensureDefault(plans.filter((p) => p !== plan));
      return {
        plans: next,
        changed: true,
        summary: `Deleted plan "${plan.name}"`,
        result: { default_plan: next.find((p) => p.isDefault)?.name ?? null },
      };
    }),
});

export const addPlannedCourse = defineTool({
  name: "add_planned_course",
  title: "Plan a course in a future term",
  description:
    "Puts a course on a plan in a Fall or Spring term, running the same certificate-policy check the Simulator runs when a course is dropped on the canvas: if every program it would count toward refuses it, it is not added and the reasons come back. The current term is allowed and reads as in progress.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    plan_name: planNameField,
    code: z.string(),
    term: z.string().describe('e.g. "Spring 2027".'),
    ...dryRunField,
  },
  run: async (ctx, args) => {
    const now = ctx.now();
    const courses = await ctx.store.listCourses();
    const { code, known } = normalizeCode(args.code);
    return planWrite(ctx, "add_planned_course", args.dry_run, (plans, user) => {
      const profile = projectionProfile(user, now);
      const plan = findPlan(plans, args.plan_name);
      const term = plannableTerm(args.term, now, profile.graduationYear);
      const ctxNow = planContext(plan, courses, profile.graduationYear, now);
      if (ctxNow.takenForProjection.some((c) => normalizeCode(c.code).code === code)) {
        throw new ToolError(`${code} is already on the transcript, so it's already part of every plan.`);
      }
      const already = plannedIn(plan, code);
      if (already?.name === term) {
        return { plans, changed: false, summary: `${code} is already planned for ${term} in "${plan.name}"` };
      }
      if (already) {
        throw new ToolError(`${code} is already planned for ${already.name}. Use move_planned_course.`);
      }
      const admission = admitPlannedCourse(code, null, plan, courses, profile, now);
      if (!admission.admitted) {
        throw new ToolError(
          `The certificate policy won't let ${code} count anywhere on this plan: ${admission.refusals
            .map((r) => `${programName(r.program.type, r.program.id)}: ${r.reason}`)
            .join(" ")}`,
        );
      }
      semesterFor(plan, term).courses.push(plannedCourse(code, ctx.access.uid, now));
      const season = parseTermName(term)!.term;
      const offeredWarning =
        known && ((season === "Fall" && !isCourseOfferedInFall(code)) || (season === "Spring" && !isCourseOfferedInSpring(code)))
          ? `The catalog doesn't list ${code} as a ${season} course; check it's offered then.`
          : null;
      const matches = findMatchedRequirements(code, profile.majors, profile.certificates);
      return {
        plans,
        changed: true,
        summary: `Planned ${code} for ${term} in "${plan.name}"`,
        result: {
          could_fill: matches.map((m) => `${programName(m.programType, m.programId)}: ${m.requirementName}`),
          ...(matches.length === 0
            ? { note: "It doesn't auto-match any requirement; set_plan_requirement_assignment can count it manually." }
            : {}),
          ...(offeredWarning ? { warning: offeredWarning } : {}),
          ...(known ? {} : { warning: `${code} isn't in the catalog.` }),
          ...(admission.refusals.length
            ? { partly_refused: admission.refusals.map((r) => `${programName(r.program.type, r.program.id)}: ${r.reason}`) }
            : {}),
        },
      };
    });
  },
});

export const removePlannedCourse = defineTool({
  name: "remove_planned_course",
  title: "Take a planned course off a plan",
  description: "Removes a planned course from a plan, with any manual requirement assignment the plan had for it.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: { plan_name: planNameField, code: z.string(), ...dryRunField },
  run: (ctx, args) =>
    planWrite(ctx, "remove_planned_course", args.dry_run, (plans) => {
      const plan = findPlan(plans, args.plan_name);
      const { code } = normalizeCode(args.code);
      const sem = plannedIn(plan, code);
      if (!sem) return { plans, changed: false, summary: `${code} isn't planned in "${plan.name}"` };
      for (const s of plan.semesters) {
        s.courses = s.courses.filter((c) => !(c?.status === "not-taken" && normalizeCode(c.code).code === code));
      }
      plan.manualRequirements = (plan.manualRequirements ?? []).filter((m) => normalizeCode(m.code).code !== code);
      return { plans, changed: true, summary: `Removed ${code} (${sem.name}) from "${plan.name}"` };
    }),
});

export const movePlannedCourse = defineTool({
  name: "move_planned_course",
  title: "Move a planned course to another term",
  description: "Moves a planned course to a different Fall or Spring term on the same plan.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: { plan_name: planNameField, code: z.string(), to_term: z.string(), ...dryRunField },
  run: (ctx, args) =>
    planWrite(ctx, "move_planned_course", args.dry_run, (plans, user) => {
      const now = ctx.now();
      const plan = findPlan(plans, args.plan_name);
      const { code } = normalizeCode(args.code);
      const from = plannedIn(plan, code);
      if (!from) throw new ToolError(`${code} isn't planned in "${plan.name}". Use add_planned_course.`);
      const term = plannableTerm(args.to_term, now, projectionProfile(user, now).graduationYear);
      if (from.name === term) return { plans, changed: false, summary: `${code} is already in ${term}` };
      const course = from.courses.find((c) => c?.status === "not-taken" && normalizeCode(c.code).code === code)!;
      from.courses = from.courses.filter((c) => c !== course);
      semesterFor(plan, term).courses.push(course);
      return { plans, changed: true, summary: `Moved ${code} from ${from.name} to ${term} in "${plan.name}"` };
    }),
});

export const setPlanRequirementAssignment = defineTool({
  name: "set_plan_requirement_assignment",
  title: "Count a planned course toward a requirement",
  description:
    "Plan-only manual assignment, like the Simulator's assign dialog: counts a course on this plan toward a requirement it doesn't auto-match. It affects only this plan's projection, not the transcript. action unassign removes it.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    plan_name: planNameField,
    code: z.string(),
    action: z.enum(["assign", "unassign"]),
    program_type: z.enum(["major", "certificate"]),
    program_id: z.string(),
    requirement: z.string(),
    ...dryRunField,
  },
  run: (ctx, args) =>
    planWrite(ctx, "set_plan_requirement_assignment", args.dry_run, (plans, user) => {
      const plan = findPlan(plans, args.plan_name);
      const program = requireProgram(args.program_type, args.program_id);
      const declared = args.program_type === "major" ? user?.majors ?? [] : user?.certificates ?? [];
      if (!declared.includes(args.program_id)) {
        throw new ToolError(`${program.name} isn't one of the student's declared programs.`);
      }
      const reqs: Array<{ name: string }> = program.requirements;
      const req = reqs.find((r) => r.name.toLowerCase() === args.requirement.trim().toLowerCase());
      if (!req) throw new ToolError(`No requirement "${args.requirement}" in ${program.name}.`);
      const { code } = normalizeCode(args.code);
      const onPlan = plan.semesters.some((s) => s.courses.some((c) => c && normalizeCode(c.code).code === code));
      if (!onPlan) throw new ToolError(`${code} isn't on "${plan.name}".`);
      const list = plan.manualRequirements ?? [];
      const matches = (m: (typeof list)[number]) =>
        normalizeCode(m.code).code === code &&
        m.requirement === req.name &&
        (m.programType ?? "major") === args.program_type &&
        m.programId === args.program_id;
      const has = list.some(matches);
      if (args.action === "assign" && !has) {
        plan.manualRequirements = [
          ...list,
          {
            code,
            requirement: req.name,
            credits: getCourseInfo(code)?.credits ?? 1,
            programType: args.program_type,
            programId: args.program_id,
          },
        ];
      } else if (args.action === "unassign" && has) {
        plan.manualRequirements = list.filter((m) => !matches(m));
      }
      const changed = args.action === "assign" ? !has : has;
      return {
        plans,
        changed,
        summary: `${args.action === "assign" ? "Counted" : "Stopped counting"} ${code} toward "${req.name}" (${program.name}) in "${plan.name}"`,
      };
    }),
});

export const PLAN_WRITE_TOOLS = [
  createPlan,
  updatePlan,
  deletePlan,
  addPlannedCourse,
  removePlannedCourse,
  movePlannedCourse,
  setPlanRequirementAssignment,
];
