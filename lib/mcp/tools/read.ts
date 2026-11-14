import { z } from "zod";
import {
  ALL_COURSES,
  getCourseInfo,
  isCourseOfferedInFall,
  isCourseOfferedInSpring,
  resolveCanonicalCode,
  type CourseInfo,
} from "@/lib/courseCatalog";
import { MAJORS, majorRequirements } from "@/lib/majors";
import { CERTIFICATES, certificateRequirements } from "@/lib/certificates";
import { computeGPA } from "@/lib/gpa";
import { compareTermNames, currentTermName, isCurrentTerm, isPastTerm } from "@/lib/academicTerm";
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

type RequirementLike = { name: string; options: Array<Record<string, unknown>> };

/** What satisfies one requirement: explicit codes, and distributional rules. */
function requirementMatcher(req: RequirementLike) {
  const codes = new Set<string>();
  const distributional: Array<{ tags: string[]; exclude: string[] }> = [];
  for (const o of req.options) {
    if (o.type === "course") codes.add(resolveCanonicalCode(o.code as string));
    else if (o.type === "group") (o.options as string[]).forEach((c) => codes.add(resolveCanonicalCode(c)));
    else if (o.type === "distributional") {
      distributional.push({ tags: o.tags as string[], exclude: ((o.excludeSubjects as string[]) ?? []).map((x) => x.toUpperCase()) });
    }
  }
  return (course: CourseInfo) => {
    if (codes.has(course.codes[0]) || course.codes.some((c) => codes.has(c))) return true;
    return distributional.some(
      (d) =>
        (course.distributionals ?? []).some((t) => d.tags.includes(t)) &&
        !course.codes.some((c) => d.exclude.includes(c.split(" ")[0].toUpperCase())),
    );
  };
}

function courseNumber(code: string): number | null {
  const n = Number.parseInt(code.split(" ")[1] ?? "", 10);
  return Number.isFinite(n) ? n : null;
}

export const searchCourses = defineTool({
  name: "search_courses",
  title: "Search the Yale course catalog",
  description:
    "Finds courses in the catalog the app uses (Fall 2023 to Spring 2027), a page at a time, so you never need the whole catalog. Combine filters: words or a code, subject, distributional, level, term or season offered, and `fills` to get only courses that count toward a requirement of ANY major or certificate (not just the student's). For building or editing a Simulator plan, set untaken_only to skip what the student has taken or already planned, and offered_season to match the semester you're filling. Results are compact by default; page with offset.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    query: z.string().optional().describe('Code or words from the title, e.g. "CPSC 323" or "machine learning".'),
    subject: z.string().optional().describe('Subject code, e.g. "CPSC".'),
    distributional: z.enum(DISTRIBUTIONAL_CODES).optional(),
    min_level: z.number().int().optional().describe("Lowest course number, e.g. 3000."),
    max_level: z.number().int().optional().describe("Highest course number, e.g. 4999."),
    offered_in: z.string().optional().describe('A catalog term, e.g. "Spring 2027".'),
    offered_season: z
      .enum(["fall", "spring"])
      .optional()
      .describe("Usually offered in this season. Use it for plan terms past the catalog."),
    fills: z
      .object({
        program_type: programType,
        program_id: z.string().describe("Any id from list_programs."),
        requirement: z.string().optional().describe("One requirement name. Default: any requirement of the program."),
      })
      .optional()
      .describe("Only courses that count toward this program's requirements, as the app encodes them."),
    untaken_only: z
      .boolean()
      .optional()
      .describe("Skip courses on the transcript (taken, in progress or placed out) and courses already in the plan."),
    plan_name: z.string().optional().describe("The plan untaken_only checks. Default: the default plan."),
    detail: z.enum(["compact", "full"]).optional().describe("full adds cross-listings and every catalog term. Default compact."),
    offset: z.number().int().min(0).optional().describe("Skip this many matches. Use next_offset from the last page."),
    limit: z.number().int().min(1).max(50).optional().describe("Default 15."),
  },
  run: async (ctx, args) => {
    const q = args.query?.trim().toLowerCase().replace(/\s+/g, " ");
    const words = q ? q.split(" ") : [];
    const compactQ = q?.replace(/\s/g, "");
    const subject = args.subject?.trim().toUpperCase();

    let fillsMatchers: Array<{ name: string; test: (c: CourseInfo) => boolean }> | null = null;
    if (args.fills) {
      const program = requireProgram(args.fills.program_type, args.fills.program_id);
      const reqs: RequirementLike[] = program.requirements as unknown as RequirementLike[];
      const wanted = args.fills.requirement?.toLowerCase();
      const picked = wanted ? reqs.filter((r) => r.name.toLowerCase() === wanted) : reqs;
      if (picked.length === 0) {
        throw new ToolError(
          `${program.name} has no requirement "${args.fills.requirement}". Requirements: ${reqs.map((r) => `"${r.name}"`).join(", ")}.`,
        );
      }
      fillsMatchers = picked.map((r) => ({ name: r.name, test: requirementMatcher(r) }));
    }

    let exclude: Set<string> | null = null;
    if (args.untaken_only) {
      const { user, courses } = await loadAll(ctx);
      exclude = new Set(courses.map((c) => resolveCanonicalCode(c.code)));
      const plans = user?.savedPlans ?? [];
      if (plans.length > 0) {
        const plan = findPlan(plans, args.plan_name);
        for (const s of plan.semesters) for (const c of s.courses) exclude.add(resolveCanonicalCode(c.code));
      }
    }

    const results: Array<{ course: CourseInfo; codeHit: boolean; fills: string[] }> = [];
    for (const c of ALL_COURSES) {
      if (subject && !c.codes.some((code) => code.toUpperCase().startsWith(`${subject} `))) continue;
      if (args.distributional && !(c.distributionals ?? []).includes(args.distributional)) continue;
      if (args.offered_in && !c.offered.includes(args.offered_in)) continue;
      if (args.offered_season === "fall" && !isCourseOfferedInFall(c.codes[0])) continue;
      if (args.offered_season === "spring" && !isCourseOfferedInSpring(c.codes[0])) continue;
      if (args.min_level != null || args.max_level != null) {
        const n = courseNumber(c.codes[0]);
        if (n == null) continue;
        if (args.min_level != null && n < args.min_level) continue;
        if (args.max_level != null && n > args.max_level) continue;
      }
      if (exclude && c.codes.some((code) => exclude!.has(code))) continue;
      let codeHit = false;
      if (q) {
        codeHit = c.codes.some((code) => code.toLowerCase().replace(/\s/g, "").startsWith(compactQ!));
        if (!codeHit && !words.every((w) => c.name.toLowerCase().includes(w))) continue;
      }
      let fills: string[] = [];
      if (fillsMatchers) {
        fills = fillsMatchers.filter((m) => m.test(c)).map((m) => m.name);
        if (fills.length === 0) continue;
      }
      results.push({ course: c, codeHit, fills });
    }
    if (q) results.sort((a, b) => Number(b.codeHit) - Number(a.codeHit));

    const now = ctx.now();
    const current = currentTermName(now);
    const offset = args.offset ?? 0;
    const limit = args.limit ?? 15;
    const page = results.slice(offset, offset + limit);
    const full = args.detail === "full";
    return {
      total_matches: results.length,
      offset,
      next_offset: offset + limit < results.length ? offset + limit : null,
      courses: page.map(({ course: c, fills }) => ({
        code: c.codes[0],
        name: c.name,
        credits: c.credits,
        distributionals: c.distributionals ?? [],
        seasons: [
          ...(isCourseOfferedInFall(c.codes[0]) ? ["Fall"] : []),
          ...(isCourseOfferedInSpring(c.codes[0]) ? ["Spring"] : []),
        ],
        next_offered: [...c.offered].sort(compareTermNames).find((t) => compareTermNames(t, current) >= 0) ?? null,
        ...(fillsMatchers && !args.fills?.requirement ? { fills } : {}),
        ...(full ? { also_listed_as: c.codes.slice(1), offered: c.offered } : {}),
      })),
    };
  },
});

/** One term's sections rather than every term's, which can run long. */
function meetingsFor(info: CourseInfo | undefined, term: string | undefined, now: Date) {
  const all = info?.meetings ?? {};
  const terms = Object.keys(all).sort(compareTermNames);
  const current = currentTermName(now);
  const pick = term ?? terms.find((t) => compareTermNames(t, current) >= 0) ?? terms[terms.length - 1];
  const sections = pick ? all[pick] : undefined;
  return {
    meetings_term: sections ? pick : null,
    meetings: (sections ?? []).map((s) => ({ section: s.section, type: s.type, meets: s.meets })),
    terms_with_meetings: terms,
  };
}

export const getCourseDetails = defineTool({
  name: "get_course_details",
  title: "Get one course's details",
  description:
    "Catalog details for one course (cross-listings, credits, distributionals, terms offered, meeting times), plus where it sits for this student: on the transcript, on the default plan, and which of their requirements it could fill.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    code: z.string().describe('e.g. "CPSC 323".'),
    meetings_term: z
      .string()
      .optional()
      .describe('Meeting times for this term, e.g. "Spring 2027". Default: the next term it is offered.'),
  },
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
      ...meetingsFor(info, args.meetings_term, ctx.now()),
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
  description:
    "Ids and names of the majors and certificates the app models (names only, no requirements). Pass `query` to narrow it, e.g. \"computer\". Then use get_program_requirements for one program.",
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
    "The requirements of any major or certificate (declared or not) as the app encodes it: each requirement's name, how many it needs and the courses or groups that satisfy it. Fetch one program at a time, or one requirement with `requirement`. To find courses that fill a requirement, prefer search_courses with `fills`. Requirement names are what set_requirement_assignment takes.",
  scope: "read",
  annotations: READ_ONLY,
  input: {
    program_type: programType,
    program_id: z.string().describe("Any id from list_programs, declared or not."),
    requirement: z.string().optional().describe("Only this requirement. Default: all of them."),
  },
  run: async (_ctx, args) => {
    const program = requireProgram(args.program_type, args.program_id);
    const allReqs: Array<{ name: string }> = program.requirements;
    const wanted = args.requirement?.toLowerCase();
    const reqs = wanted ? allReqs.filter((r) => r.name.toLowerCase() === wanted) : allReqs;
    if (wanted && reqs.length === 0) {
      throw new ToolError(`${program.name} has no requirement "${args.requirement}". Requirements: ${allReqs.map((r) => `"${r.name}"`).join(", ")}.`);
    }
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
      requirements: (reqs as typeof program.requirements).map((r) => ({
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
