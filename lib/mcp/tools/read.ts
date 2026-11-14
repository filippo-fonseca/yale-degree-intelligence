import { z } from "zod";
import { ALL_COURSES, getCourseInfo } from "@/lib/courseCatalog";
import { MAJORS, majorRequirements } from "@/lib/majors";
import { CERTIFICATES, certificateRequirements } from "@/lib/certificates";
import { computeGPA } from "@/lib/gpa";
import { isCurrentTerm, isPastTerm } from "@/lib/academicTerm";
import { getCertificateProgress, getMajorProgress } from "@/components/dashboard/getMajorProgress";
import { buildDistributionalTallyInputs } from "@/lib/simulatorMilestones";
import { tallyDistributionals, type DistTallyResult } from "@/lib/distributionalTally";
import { findMatchedRequirements } from "@/lib/simulatorPolicy";
import { plannedCourseCount, primaryPlan } from "@/components/Simulator/planTypes";
import { courseName, courseTerm, courseView, programName, progressView } from "../format";
import { planContext, projectPlan } from "../planProjection";
import {
  DISTRIBUTIONAL_CODES,
  findPlan,
  loadAll,
  normalizeCode,
  projectionProfile,
  requireProgram,
  sortCourses,
} from "./shared";
import { READ_ONLY, ToolError, defineTool } from "./types";

const programType = z.enum(["major", "certificate"]);

export function distributionalView(t: DistTallyResult) {
  return t.byRequirement.map((r) => ({
    requirement: r.key,
    label: r.label ?? r.key,
    credits: r.count,
    of_which_planned: r.planned,
    target: r.target ?? null,
    satisfied: r.target != null ? r.count - r.planned >= r.target : null,
    satisfied_with_plan: r.target != null ? r.count >= r.target : null,
  }));
}

export const getProfile = defineTool({
  name: "get_profile",
  title: "Get the student's profile",
  description:
    "The student's declared majors and certificates, graduation year, bio, distributional preferences, prerequisite overrides and saved plans. Call this first: most other tools are relative to these programs.",
  scope: "read",
  annotations: READ_ONLY,
  input: {},
  run: async (ctx) => {
    const user = await ctx.store.getUser();
    const plans = user?.savedPlans ?? [];
    return {
      email: ctx.access.email,
      display_name: user?.displayName ?? null,
      majors: (user?.majors ?? []).map((id) => ({ id, name: programName("major", id) })),
      certificates: (user?.certificates ?? []).map((id) => ({ id, name: programName("certificate", id) })),
      graduation_year: user?.graduationYear ?? null,
      bio: user?.bio ?? "",
      prereq_overrides: user?.prereqOverrides ?? [],
      distributional_preferences: {
        auto_allocate: user?.distributionalAutoAllocate ?? true,
        manual_allocations: user?.distributionalAllocations ?? {},
        english_satisfies_language: user?.englishSatisfiesLanguage === true,
      },
      plans: plans.map((p) => ({ name: p.name, is_default: !!p.isDefault })),
      default_plan: primaryPlan(plans)?.name ?? null,
      onboarded: !!user && (user.majors?.length ?? 0) > 0,
    };
  },
});

export const listCourses = defineTool({
  name: "list_courses",
  title: "List transcript courses",
  description:
    "Every course on the student's record (My Courses): completed, in progress and placed out, oldest first, with ids for the write tools. Planned Simulator courses are not here; use get_plan for those.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    status: z
      .enum(["completed", "in_progress", "placed_out", "all"])
      .optional()
      .describe("Filter by status. Default all."),
    term: z.string().optional().describe('Only this term, e.g. "Fall 2025".'),
  },
  run: async (ctx, args) => {
    const courses = sortCourses(await ctx.store.listCourses());
    const views = courses
      .map(courseView)
      .filter((c) => !args.status || args.status === "all" || c.status === args.status)
      .filter((c) => !args.term || c.term.toLowerCase() === args.term.toLowerCase());
    return { count: views.length, courses: views };
  },
});

export const getAcademicSummary = defineTool({
  name: "get_academic_summary",
  title: "Get GPA and credit summary",
  description:
    "GPA (Yale letter grades, credit-weighted), completed and in-progress credits, and a per-term breakdown of the transcript.",
  scope: "read",
  annotations: READ_ONLY,
  input: {},
  run: async (ctx) => {
    const courses = await ctx.store.listCourses();
    const graded = courses.filter((c) => c.status === "completed" && !c.skipped);
    const gpa = computeGPA(graded.map((c) => ({ grade: c.grade, credits: c.credits })));
    const byTerm = new Map<string, typeof courses>();
    for (const c of sortCourses(courses)) {
      const key = courseTerm(c);
      byTerm.set(key, [...(byTerm.get(key) ?? []), c]);
    }
    const sum = (xs: typeof courses) => xs.reduce((a, c) => a + (c.credits || 0), 0);
    return {
      gpa: gpa.gpa,
      graded_credits: gpa.gradedCredits,
      completed_credits: sum(courses.filter((c) => c.status === "completed")),
      placed_out_credits: sum(courses.filter((c) => c.skipped)),
      in_progress_credits: sum(courses.filter((c) => c.status === "in-progress")),
      terms: Array.from(byTerm.entries()).map(([term, list]) => {
        const g = computeGPA(
          list.filter((c) => c.status === "completed" && !c.skipped).map((c) => ({ grade: c.grade, credits: c.credits })),
        );
        return { term, credits: sum(list), term_gpa: g.gpa, courses: list.map((c) => c.code) };
      }),
    };
  },
});

export const getDegreeProgress = defineTool({
  name: "get_degree_progress",
  title: "Get progress toward majors and certificates",
  description:
    "Requirement-by-requirement progress for each declared major and certificate, from the transcript only (what the dashboard shows). Uses the same engine as the app, including the certificate overlap policy and manual assignments. For a plan's projected progress, use get_plan_progress.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    program_id: z.string().optional().describe("Only this major or certificate id. Default: all declared."),
    summary_only: z.boolean().optional().describe("Drop the per-requirement detail."),
  },
  run: async (ctx, args) => {
    const { user, courses } = await loadAll(ctx);
    const majorIds = (user?.majors ?? []).filter((id) => majorRequirements[id]);
    const certificateIds = (user?.certificates ?? []).filter((id) => certificateRequirements[id]);
    if (majorIds.length + certificateIds.length === 0) {
      return { programs: [], note: "The student has not declared a major or certificate. update_profile sets them." };
    }
    const policy = { majorIds, certificateIds };
    const programs = [
      ...majorIds.map((id) => ["major", id] as const),
      ...certificateIds.map((id) => ["certificate", id] as const),
    ]
      .filter(([, id]) => !args.program_id || id === args.program_id)
      .map(([type, id]) => {
        const p = type === "major" ? getMajorProgress(id, courses, policy) : getCertificateProgress(id, courses, policy);
        const view = progressView(type, id, p!);
        return args.summary_only ? { ...view, requirements: undefined } : view;
      });
    if (args.program_id && programs.length === 0) {
      throw new ToolError(`${args.program_id} is not one of the student's declared programs.`);
    }
    return { programs };
  },
});

export const getDistributionalProgress = defineTool({
  name: "get_distributional_progress",
  title: "Get Yale distributional progress",
  description:
    "Credits toward Yale College's distributional requirements (Hu, So, Sc, QR, WR, language) from the transcript, each course counted once using the student's allocation preferences.",
  scope: "read",
  annotations: READ_ONLY,
  input: {},
  run: async (ctx) => {
    const { user, courses } = await loadAll(ctx);
    const profile = projectionProfile(user, ctx.now());
    const tally = tallyDistributionals(
      buildDistributionalTallyInputs({
        taken: courses,
        semesters: [],
        auto: profile.distributionalAutoAllocate,
        overrides: profile.distributionalAllocations,
        englishSatisfiesLanguage: profile.englishSatisfiesLanguage,
      }),
    );
    return { auto_allocate: profile.distributionalAutoAllocate, requirements: distributionalView(tally) };
  },
});

export const searchCourses = defineTool({
  name: "search_courses",
  title: "Search the Yale course catalog",
  description:
    "Searches the catalog the app uses (Fall 2023 to Spring 2027) by code or title words, with optional filters. Returns canonical codes to pass to other tools.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    query: z.string().optional().describe('Code or words from the title, e.g. "CPSC 323" or "machine learning".'),
    subject: z.string().optional().describe('Subject code, e.g. "CPSC".'),
    distributional: z.enum(DISTRIBUTIONAL_CODES).optional(),
    offered_in: z.string().optional().describe('A catalog term, e.g. "Spring 2027".'),
    limit: z.number().int().min(1).max(50).optional().describe("Default 20."),
  },
  run: async (_ctx, args) => {
    const q = args.query?.trim().toLowerCase().replace(/\s+/g, " ");
    const words = q ? q.split(" ") : [];
    const compactQ = q?.replace(/\s/g, "");
    const matches = ALL_COURSES.filter((c) => {
      if (args.subject && !c.codes.some((code) => code.toUpperCase().startsWith(`${args.subject!.toUpperCase()} `))) return false;
      if (args.distributional && !(c.distributionals ?? []).includes(args.distributional)) return false;
      if (args.offered_in && !c.offered.includes(args.offered_in)) return false;
      if (!q) return true;
      if (c.codes.some((code) => code.toLowerCase().replace(/\s/g, "").startsWith(compactQ!))) return true;
      const hay = c.name.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    const limit = args.limit ?? 20;
    return {
      total_matches: matches.length,
      courses: matches.slice(0, limit).map((c) => ({
        code: c.codes[0],
        also_listed_as: c.codes.slice(1),
        name: c.name,
        credits: c.credits,
        distributionals: c.distributionals ?? [],
        offered: c.offered,
      })),
    };
  },
});

export const getCourseDetails = defineTool({
  name: "get_course_details",
  title: "Get one course's details",
  description:
    "Catalog details for one course (cross-listings, credits, distributionals, terms offered, meeting times), plus where it sits for this student: on the transcript, on the default plan, and which of their requirements it could fill.",
  scope: "read",
  annotations: READ_ONLY,
  input: { code: z.string().describe('e.g. "CPSC 323".') },
  run: async (ctx, args) => {
    const { code, known } = normalizeCode(args.code);
    const info = getCourseInfo(code);
    const { user, courses } = await loadAll(ctx);
    const majorIds = user?.majors ?? [];
    const certificateIds = user?.certificates ?? [];
    const onTranscript = courses.filter((c) => normalizeCode(c.code).code === code).map(courseView);
    const plan = primaryPlan(user?.savedPlans ?? []);
    let plannedIn: string | null = null;
    if (plan) {
      for (const s of plan.semesters) {
        if (s.courses.some((c) => c.status === "not-taken" && normalizeCode(c.code).code === code)) plannedIn = s.name;
      }
    }
    return {
      code,
      in_catalog: known,
      name: courseName(code),
      also_listed_as: info?.codes.slice(1) ?? [],
      credits: info?.credits ?? null,
      distributionals: info?.distributionals ?? [],
      offered: info?.offered ?? [],
      meetings: info?.meetings
        ? Object.fromEntries(
            Object.entries(info.meetings).map(([term, sections]) => [
              term,
              (sections ?? []).map((s) => ({ section: s.section, type: s.type, meets: s.meets })),
            ]),
          )
        : {},
      student: {
        on_transcript: onTranscript,
        planned_in_default_plan: plannedIn,
        could_fill: findMatchedRequirements(code, majorIds, certificateIds).map((m) => ({
          program_type: m.programType,
          program_id: m.programId,
          program_name: programName(m.programType, m.programId),
          requirement: m.requirementName,
        })),
      },
    };
  },
});

export const listPrograms = defineTool({
  name: "list_programs",
  title: "List Yale majors and certificates",
  description: "Every major and certificate the app models, with the ids other tools take.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    type: programType.optional().describe("Default both."),
    query: z.string().optional().describe("Filter by words in the name."),
  },
  run: async (_ctx, args) => {
    const q = args.query?.toLowerCase();
    const pick = (record: Record<string, string>) =>
      Object.entries(record)
        .filter(([, name]) => !q || name.toLowerCase().includes(q))
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name));
    return {
      ...(args.type !== "certificate" ? { majors: pick(MAJORS) } : {}),
      ...(args.type !== "major" ? { certificates: pick(CERTIFICATES) } : {}),
    };
  },
});

export const getProgramRequirements = defineTool({
  name: "get_program_requirements",
  title: "Get a program's requirements",
  description:
    "The full requirement list of a major or certificate as the app encodes it: each requirement's name, how many it needs and the courses or groups that satisfy it. Requirement names are what set_requirement_assignment takes.",
  scope: "read",
  annotations: READ_ONLY,
  input: { program_type: programType, program_id: z.string() },
  run: async (_ctx, args) => {
    const program = requireProgram(args.program_type, args.program_id);
    const cert = args.program_type === "certificate" ? certificateRequirements[args.program_id] : null;
    return {
      program_type: args.program_type,
      program_id: args.program_id,
      name: program.name,
      description: program.description ?? null,
      total_credits: program.creditRequirements?.total ?? null,
      ...(cert
        ? { requires_application: !!cert.requiresApplication, notes: cert.notes ?? [], source_url: cert.sourceUrl ?? null }
        : {}),
      requirements: program.requirements.map((r) => ({
        name: r.name,
        description: r.description ?? null,
        required: r.required,
        options: (r.options as Array<Record<string, unknown>>).map((o) => {
          if (o.type === "course") return { type: "course", code: o.code };
          if (o.type === "group") return { type: "group", choose: o.required, from: o.options, description: o.description ?? null };
          if (o.type === "distributional") return { type: "distributional", tags: o.tags, exclude_subjects: o.excludeSubjects ?? [] };
          return o;
        }),
      })),
    };
  },
});

export const listPlans = defineTool({
  name: "list_plans",
  title: "List saved Simulator plans",
  description: "The student's saved four-year plans from the Simulator, with which one is the default.",
  scope: "read",
  annotations: READ_ONLY,
  input: {},
  run: async (ctx) => {
    const user = await ctx.store.getUser();
    const plans = user?.savedPlans ?? [];
    return {
      plans: plans.map((p) => ({
        name: p.name,
        is_default: !!p.isDefault,
        created_at: p.createdAt,
        planned_courses: plannedCourseCount(p),
      })),
    };
  },
});

export const getPlan = defineTool({
  name: "get_plan",
  title: "Get a plan's semesters",
  description:
    "One plan laid out by semester, as the Simulator canvas shows it: taken courses come from the live transcript and planned ones from the plan. Past terms are locked. Default: the default plan.",
  scope: "read",
  annotations: READ_ONLY,
  input: { plan_name: z.string().optional() },
  run: async (ctx, args) => {
    const { user, courses } = await loadAll(ctx);
    const plan = findPlan(user?.savedPlans ?? [], args.plan_name);
    const now = ctx.now();
    const profile = projectionProfile(user, now);
    const { semesters } = planContext(plan, courses, profile.graduationYear, now);
    return {
      name: plan.name,
      is_default: !!plan.isDefault,
      semesters: semesters.map((s) => ({
        term: s.name,
        when: isPastTerm(s.name, now) ? "past" : isCurrentTerm(s.name, now) ? "current" : "future",
        credits: s.courses.reduce((a, c) => a + (c.credits || 0), 0),
        courses: s.courses.map((c) => ({
          code: c.code,
          name: courseName(c.code, c.name),
          credits: c.credits,
          status: c.status === "not-taken" ? (isCurrentTerm(s.name, now) ? "in_progress" : "planned") : c.status.replace("-", "_"),
          grade: c.grade,
        })),
      })),
      manual_assignments: (plan.manualRequirements ?? []).map((m) => ({
        code: m.code,
        requirement: m.requirement,
        program_type: m.programType ?? "major",
        program_id: m.programId ?? null,
      })),
    };
  },
});

export const getPlanProgress = defineTool({
  name: "get_plan_progress",
  title: "Get a plan's projected progress",
  description:
    "Projected progress if the student follows this plan: every major and certificate requirement plus distributionals, counting planned courses. Same numbers as the Simulator's progress pane. Default: the default plan.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    plan_name: z.string().optional(),
    summary_only: z.boolean().optional().describe("Drop the per-requirement detail."),
  },
  run: async (ctx, args) => {
    const { user, courses } = await loadAll(ctx);
    const plan = findPlan(user?.savedPlans ?? [], args.plan_name);
    const projection = projectPlan(plan, courses, projectionProfile(user, ctx.now()), ctx.now());
    const trim = <T extends { requirements?: unknown }>(v: T) => (args.summary_only ? { ...v, requirements: undefined } : v);
    return {
      plan: plan.name,
      programs: [
        ...Object.entries(projection.majors).map(([id, p]) => trim(progressView("major", id, p))),
        ...Object.entries(projection.certificates).map(([id, p]) => trim(progressView("certificate", id, p))),
      ],
      distributionals: distributionalView(projection.distributionals),
    };
  },
});

export const READ_TOOLS = [
  getProfile,
  listCourses,
  getAcademicSummary,
  getDegreeProgress,
  getDistributionalProgress,
  searchCourses,
  getCourseDetails,
  listPrograms,
  getProgramRequirements,
  listPlans,
  getPlan,
  getPlanProgress,
];
