import { z } from "zod";
import type { Course, ManualRequirement } from "@/lib/types";
import { getCourseInfo } from "@/lib/courseCatalog";
import { compareTermNames, currentTermName } from "@/lib/academicTerm";
import type { NewCourse } from "../store";
import { courseView, programName } from "../format";
import { DISTRIBUTIONAL_CODES, findCourse, normalizeCode, requireProgram } from "./shared";
import { ToolError, defineTool, writeAnnotations } from "./types";
import { dryRunField, performWrite } from "./write";

/** The grades the manual entry modal offers, minus "In Progress" (that is null). */
export const LETTER_GRADES = ["A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "CR", "ABX"] as const;

const gradeField = z
  .union([z.enum(LETTER_GRADES), z.null()])
  .describe('Letter grade, "CR" for Credit, or null for a course in progress.');

const courseRef = {
  course_id: z.string().optional().describe("The id from list_courses. Preferred."),
  code: z.string().optional().describe("Course code, when it appears on the transcript only once."),
};

type Term = { semester: "Fall" | "Spring" | "Summer"; year: number };

export function parseTranscriptTerm(raw: string, now: Date): Term {
  const m = /^\s*(fall|spring|summer)\s+(\d{4})\s*$/i.exec(raw);
  if (!m) throw new ToolError(`"${raw}" is not a term. Use e.g. "Fall 2025", "Spring 2026" or "Summer 2025".`);
  const semester = (m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()) as Term["semester"];
  const year = Number(m[2]);
  if (year < 2000 || year > 2100) throw new ToolError(`${year} is out of range.`);
  // Summer has no Simulator column; compare it as the spring before.
  const comparable = semester === "Summer" ? `Spring ${year}` : `${semester} ${year}`;
  if (compareTermNames(comparable, currentTermName(now)) > 0) {
    throw new ToolError(
      `${semester} ${year} hasn't started. The transcript holds taken and current courses; put future courses on a plan with add_planned_course.`,
    );
  }
  return { semester, year };
}

function creditsFor(code: string, given: number | undefined): number {
  return given ?? getCourseInfo(code)?.credits ?? 1;
}

const creditsField = z
  .number()
  .min(0)
  .max(4)
  .multipleOf(0.5)
  .optional()
  .describe("Defaults to the catalog's credits, else 1.");

export const addCourses = defineTool({
  name: "add_courses",
  title: "Add courses to the transcript",
  description:
    "Adds taken or in-progress courses to My Courses, as the app's manual entry does. A course already on record for the same term with the same grade is left alone; with a different grade it is replaced. Future terms belong on a plan instead (add_planned_course).",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    courses: z
      .array(
        z.object({
          code: z.string(),
          term: z.string().describe('"Fall 2025", "Spring 2026" or "Summer 2025".'),
          grade: gradeField,
          credits: creditsField,
          name: z.string().max(120).optional().describe("Only for a code the catalog doesn't know."),
        }),
      )
      .min(1)
      .max(20),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "add_courses", args.dry_run, async () => {
      const now = ctx.now();
      const existing = await ctx.store.listCourses();
      const byKey = new Map(existing.map((c) => [`${c.semester}-${c.year}-${normalizeCode(c.code).code}`, c]));
      const toAdd: NewCourse[] = [];
      const toReplace: string[] = [];
      const report: Array<Record<string, unknown>> = [];
      const seen = new Set<string>();
      for (const input of args.courses) {
        const { code, known } = normalizeCode(input.code);
        const term = parseTranscriptTerm(input.term, now);
        const key = `${term.semester}-${term.year}-${code}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const course: NewCourse = {
          code,
          ...(!known && input.name ? { name: input.name } : {}),
          grade: input.grade,
          semester: term.semester,
          year: term.year,
          userId: ctx.access.uid,
          status: input.grade === null ? "in-progress" : "completed",
          credits: creditsFor(code, input.credits),
        };
        const prior = byKey.get(key);
        if (prior && prior.grade === input.grade) {
          report.push({ code, term: `${term.semester} ${term.year}`, result: "already_on_record", id: prior.id });
          continue;
        }
        if (prior) toReplace.push(prior.id);
        toAdd.push(course);
        report.push({
          code,
          term: `${term.semester} ${term.year}`,
          result: prior ? "replaced_grade" : "added",
          ...(known ? {} : { warning: "Not in the catalog; it won't match any requirement unless assigned by hand." }),
        });
      }
      const codes = toAdd.map((c) => c.code).join(", ");
      return {
        changed: toAdd.length > 0,
        summary: toAdd.length ? `Added ${codes} to My Courses` : "every course was already on record",
        detail: { codes: toAdd.map((c) => c.code) },
        result: { courses: report },
        apply: async () => {
          if (toReplace.length) await ctx.store.deleteCourses(toReplace);
          const ids = await ctx.store.createCourses(toAdd);
          return { new_ids: ids };
        },
      };
    }),
});

export const updateCourse = defineTool({
  name: "update_course",
  title: "Edit a transcript course",
  description:
    "Changes a course's grade, term, credits or (for non-catalog codes) name. Setting the grade to null marks it in progress; a letter grade marks it completed.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    ...courseRef,
    grade: gradeField.optional(),
    term: z.string().optional(),
    credits: creditsField,
    name: z.string().max(120).optional().describe('A display name; "" restores the catalog name.'),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "update_course", args.dry_run, async () => {
      const course = findCourse(await ctx.store.listCourses(), args);
      if (course.skipped && (args.term !== undefined || args.grade !== undefined)) {
        throw new ToolError(`${course.code} is placed out; it has no term or grade. Use mark_course_placed_out to undo.`);
      }
      const patch: Partial<NewCourse> = {};
      const remove: (keyof NewCourse)[] = [];
      const changes: string[] = [];
      if (args.grade !== undefined && args.grade !== course.grade) {
        patch.grade = args.grade;
        patch.status = args.grade === null ? "in-progress" : "completed";
        changes.push(`grade ${args.grade ?? "in progress"}`);
      }
      if (args.term !== undefined) {
        const t = parseTranscriptTerm(args.term, ctx.now());
        if (t.semester !== course.semester || t.year !== course.year) {
          patch.semester = t.semester;
          patch.year = t.year;
          changes.push(`term ${t.semester} ${t.year}`);
        }
      }
      if (args.credits !== undefined && args.credits !== course.credits) {
        patch.credits = args.credits;
        changes.push(`${args.credits} credits`);
      }
      if (args.name !== undefined && args.name !== (course.name ?? "")) {
        if (args.name) patch.name = args.name;
        else remove.push("name");
        changes.push(args.name ? `name "${args.name}"` : "catalog name");
      }
      const after = { ...course, ...patch } as Course;
      if (remove.includes("name")) delete after.name;
      return {
        changed: changes.length > 0,
        summary: changes.length ? `Set ${course.code} to ${changes.join(", ")}` : `${course.code} already matches`,
        detail: { course_id: course.id, code: course.code },
        result: { course: courseView(after) },
        apply: async () => ctx.store.updateCourse(course.id, patch, remove),
      };
    }),
});

export const deleteCourses = defineTool({
  name: "delete_courses",
  title: "Remove courses from the transcript",
  description:
    "Deletes courses from My Courses, including any manual requirement assignments on them. This cannot be undone from here; confirm with the student first and consider dry_run.",
  scope: "write",
  annotations: writeAnnotations({ destructive: true, idempotent: true }),
  input: {
    course_ids: z.array(z.string()).min(1).max(50).describe("Ids from list_courses."),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "delete_courses", args.dry_run, async () => {
      const courses = await ctx.store.listCourses();
      const found = courses.filter((c) => args.course_ids.includes(c.id));
      const missing = args.course_ids.filter((id) => !found.some((c) => c.id === id));
      return {
        changed: found.length > 0,
        summary: found.length
          ? `Removed ${found.map((c) => `${c.code} (${c.skipped ? "placed out" : `${c.semester} ${c.year}`})`).join(", ")} from My Courses`
          : "none of those courses exist",
        detail: { course_ids: found.map((c) => c.id), codes: found.map((c) => c.code) },
        result: { removed: found.map(courseView), not_found: missing },
        apply: async () => ctx.store.deleteCourses(found.map((c) => c.id)),
      };
    }),
});

export const markCoursePlacedOut = defineTool({
  name: "mark_course_placed_out",
  title: "Mark a course placed out (or undo)",
  description:
    "Records that the student placed out of a course (AP, placement exam, acceleration credit), as the requirement cards' Skip does, so it fills requirements without a term or grade. placed_out=false removes that record.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    code: z.string(),
    placed_out: z.boolean().default(true),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "mark_course_placed_out", args.dry_run, async () => {
      const { code } = normalizeCode(args.code);
      const docId = `${ctx.access.uid}_${code}`;
      const courses = await ctx.store.listCourses();
      const record = courses.find((c) => c.id === docId) ??
        courses.find((c) => c.skipped && normalizeCode(c.code).code === code);
      if (args.placed_out) {
        const info = getCourseInfo(code);
        return {
          changed: !record,
          summary: record ? `${code} is already placed out` : `Marked ${code} as placed out`,
          detail: { code },
          apply: async () => {
            await ctx.store.createCourses([
              {
                id: docId,
                code,
                name: info?.name ?? code,
                grade: null,
                semester: "Skipped",
                year: ctx.now().getFullYear(),
                userId: ctx.access.uid,
                status: "completed",
                credits: info?.credits || 0,
                skipped: true,
              },
            ]);
          },
        };
      }
      return {
        changed: !!record,
        summary: record ? `Removed the placed-out record for ${code}` : `${code} isn't marked placed out`,
        detail: { code },
        apply: async () => ctx.store.deleteCourses([record!.id]),
      };
    }),
});

export const setCourseDistributionals = defineTool({
  name: "set_course_distributionals",
  title: "Set a course's distributional tags",
  description:
    "Overrides which Yale distributionals (Hu, So, Sc, QR, WR, L1-L5) a transcript course carries, e.g. when a section was designated differently from the catalog. null restores the catalog's tags.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    ...courseRef,
    distributionals: z.union([z.array(z.enum(DISTRIBUTIONAL_CODES)).min(1).max(4), z.null()]),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "set_course_distributionals", args.dry_run, async () => {
      const course = findCourse(await ctx.store.listCourses(), args);
      const next = args.distributionals ? Array.from(new Set(args.distributionals)) : null;
      const same = JSON.stringify(course.distributionals ?? null) === JSON.stringify(next);
      return {
        changed: !same,
        summary: next ? `Tagged ${course.code} as ${next.join(", ")}` : `Restored catalog distributionals on ${course.code}`,
        detail: { course_id: course.id, code: course.code },
        apply: async () =>
          next
            ? ctx.store.updateCourse(course.id, { distributionals: next })
            : ctx.store.updateCourse(course.id, {}, ["distributionals"]),
      };
    }),
});

function sameSlot(a: ManualRequirement, b: ManualRequirement) {
  return (
    (a.major_id ?? null) === (b.major_id ?? null) &&
    (a.certificate_id ?? null) === (b.certificate_id ?? null) &&
    a.requirement_title === b.requirement_title
  );
}

export const setRequirementAssignment = defineTool({
  name: "set_requirement_assignment",
  title: "Count or stop counting a course toward a requirement",
  description:
    "Manual requirement overrides on a transcript course, the same as the app's requirement cards. assign: count it toward a requirement it doesn't auto-match (only when the DUS or program has approved it). unassign: undo an assign. exclude: stop it counting toward a requirement it auto-matches. include: undo an exclude. Requirement names come from get_program_requirements.",
  scope: "write",
  annotations: writeAnnotations({ destructive: false, idempotent: true }),
  input: {
    ...courseRef,
    action: z.enum(["assign", "unassign", "exclude", "include"]),
    program_type: z.enum(["major", "certificate"]),
    program_id: z.string(),
    requirement: z.string().describe("Requirement name, as get_program_requirements lists it."),
    ...dryRunField,
  },
  run: (ctx, args) =>
    performWrite(ctx, "set_requirement_assignment", args.dry_run, async () => {
      const [user, courses] = await Promise.all([ctx.store.getUser(), ctx.store.listCourses()]);
      const program = requireProgram(args.program_type, args.program_id);
      const declared = args.program_type === "major" ? user?.majors ?? [] : user?.certificates ?? [];
      if (!declared.includes(args.program_id)) {
        throw new ToolError(`${programName(args.program_type, args.program_id)} isn't one of the student's declared programs.`);
      }
      const reqs: Array<{ name: string }> = program.requirements;
      const req = reqs.find((r) => r.name.toLowerCase() === args.requirement.trim().toLowerCase());
      if (!req) {
        throw new ToolError(
          `No requirement "${args.requirement}" in ${program.name}. Requirements: ${reqs.map((r) => `"${r.name}"`).join(", ")}.`,
        );
      }
      const course = findCourse(courses, args);
      const slot: ManualRequirement =
        args.program_type === "major"
          ? { major_id: args.program_id, requirement_title: req.name }
          : { certificate_id: args.program_id, requirement_title: req.name };
      const assigned = course.manualRequirementsFulfilled ?? [];
      const excluded = course.excludedFromRequirements ?? [];
      let nextAssigned = assigned;
      let nextExcluded = excluded;
      if (args.action === "assign") {
        if (!assigned.some((m) => sameSlot(m, slot))) nextAssigned = [...assigned, slot];
        nextExcluded = excluded.filter((m) => !sameSlot(m, slot));
      } else if (args.action === "unassign") {
        nextAssigned = assigned.filter((m) => !sameSlot(m, slot));
      } else if (args.action === "exclude") {
        if (!excluded.some((m) => sameSlot(m, slot))) nextExcluded = [...excluded, slot];
        nextAssigned = assigned.filter((m) => !sameSlot(m, slot));
      } else {
        nextExcluded = excluded.filter((m) => !sameSlot(m, slot));
      }
      const changed = nextAssigned.length !== assigned.length || nextExcluded.length !== excluded.length;
      const verb = {
        assign: `Counted ${course.code} toward`,
        unassign: `Stopped manually counting ${course.code} toward`,
        exclude: `Excluded ${course.code} from`,
        include: `Let ${course.code} count again toward`,
      }[args.action];
      return {
        changed,
        summary: `${verb} "${req.name}" (${program.name})`,
        detail: { course_id: course.id, code: course.code, program_id: args.program_id, requirement: req.name },
        apply: async () =>
          ctx.store.updateCourse(course.id, {
            manualRequirementsFulfilled: nextAssigned,
            excludedFromRequirements: nextExcluded,
          }),
      };
    }),
});

export const COURSE_WRITE_TOOLS = [
  addCourses,
  updateCourse,
  deleteCourses,
  markCoursePlacedOut,
  setCourseDistributionals,
  setRequirementAssignment,
];
