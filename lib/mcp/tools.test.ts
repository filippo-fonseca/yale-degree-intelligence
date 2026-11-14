import { beforeEach, describe, expect, it } from "vitest";
import { MemoryDatabase } from "./memoryStore";
import { MemoryAuditLog } from "./audit";
import { callTool, toolsForScopes } from "./server";
import { ALL_TOOLS, type ToolContext } from "./tools";
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/oauth/config";
import type { Course } from "@/lib/types";

// Mid Fall 2026: Fall 2026 is the current term, Spring 2026 is past.
const NOW = new Date(Date.UTC(2026, 10, 14, 15));

let db: MemoryDatabase;
let audit: MemoryAuditLog;

function ctxFor(uid: string, scopes = [SCOPE_READ, SCOPE_WRITE]): ToolContext {
  return {
    store: db.storeFor(uid),
    audit,
    access: { uid, email: `${uid}@yale.edu`, grantId: `grant-${uid}`, clientName: "Test Agent", scopes },
    now: () => NOW,
  };
}

async function call(ctx: ToolContext, name: string, args: Record<string, unknown> = {}) {
  const tool = ALL_TOOLS.find((t) => t.name === name);
  if (!tool) throw new Error(`no tool ${name}`);
  const res = await callTool(tool, ctx, args);
  const text = res.content[0].text;
  return { isError: !!res.isError, text, data: res.isError ? null : JSON.parse(text) };
}

async function ok(ctx: ToolContext, name: string, args: Record<string, unknown> = {}) {
  const res = await call(ctx, name, args);
  if (res.isError) throw new Error(`${name} failed: ${res.text}`);
  return res.data;
}

function seedCourse(uid: string, c: Partial<Course> & { code: string }): string {
  const id = db.newId();
  db.courses.set(id, {
    id,
    userId: uid,
    grade: "A",
    semester: "Fall",
    year: 2025,
    status: "completed",
    credits: 1,
    ...c,
  });
  return id;
}

beforeEach(() => {
  db = new MemoryDatabase();
  audit = new MemoryAuditLog();
  db.users.set("alice", { majors: ["CPSC_BS"], certificates: [], graduationYear: 2029 });
  db.users.set("bob", { majors: ["ECON_BA"], graduationYear: 2028 });
  seedCourse("alice", { code: "CPSC 2010", semester: "Fall", year: 2025, grade: "A" });
  seedCourse("alice", { code: "CPSC 2230", semester: "Spring", year: 2026, grade: "A-" });
  seedCourse("alice", { code: "CPSC 3230", semester: "Fall", year: 2026, grade: null, status: "in-progress" });
  seedCourse("bob", { code: "ECON 1110", semester: "Fall", year: 2025, grade: "B+" });
});

describe("scopes", () => {
  it("gives a read-only token only read tools", () => {
    const tools = toolsForScopes([SCOPE_READ]);
    expect(tools.length).toBeGreaterThan(5);
    expect(tools.every((t) => t.scope === "read")).toBe(true);
    expect(toolsForScopes([SCOPE_READ, SCOPE_WRITE]).some((t) => t.name === "add_courses")).toBe(true);
    expect(toolsForScopes([])).toEqual([]);
  });

  it("marks every write tool as not read-only and every read tool as read-only", () => {
    for (const t of ALL_TOOLS) {
      expect(t.annotations.readOnlyHint).toBe(t.scope === "read");
      if (t.scope === "write") expect(Object.keys(t.input)).toContain("dry_run");
    }
  });
});

describe("isolation", () => {
  it("lists only the caller's courses", async () => {
    const alice = await ok(ctxFor("alice"), "list_courses");
    const bob = await ok(ctxFor("bob"), "list_courses");
    expect(alice.courses.map((c: { code: string }) => c.code)).toEqual(["CPSC 2010", "CPSC 2230", "CPSC 3230"]);
    expect(bob.courses.map((c: { code: string }) => c.code)).toEqual(["ECON 1110"]);
  });

  it("refuses to touch another student's course by id", async () => {
    const aliceId = Array.from(db.courses.values()).find((c) => c.userId === "alice")!.id;
    const bob = ctxFor("bob");
    const edit = await call(bob, "update_course", { course_id: aliceId, grade: "F" });
    expect(edit.isError).toBe(true);
    const del = await call(bob, "delete_courses", { course_ids: [aliceId] });
    expect(del.data.changed).toBe(false);
    expect(del.data.not_found).toEqual([aliceId]);
    expect(db.courses.get(aliceId)!.grade).toBe("A");
    expect(audit.events.get("bob")).toBeUndefined();
  });

  it("never takes a uid from arguments", async () => {
    const res = await call(ctxFor("bob"), "list_courses", { uid: "alice" });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/Invalid arguments/);
  });
});

describe("read tools", () => {
  it("reports profile and transcript progress", async () => {
    const ctx = ctxFor("alice");
    const profile = await ok(ctx, "get_profile");
    expect(profile.majors).toEqual([{ id: "CPSC_BS", name: "Computer Science, B.S." }]);
    const progress = await ok(ctx, "get_degree_progress");
    const reqs = progress.programs[0].requirements as Array<{ name: string; state: string }>;
    expect(reqs.find((r) => r.name === "Introduction to Computer Science")!.state).toBe("satisfied");
    expect(reqs.find((r) => r.name === "Systems Programming and Computer Organization")!.state).toBe("in_progress");
    expect(reqs.find((r) => r.name === "Algorithms")!.state).toBe("remaining");
  });

  it("computes GPA from graded courses", async () => {
    const summary = await ok(ctxFor("alice"), "get_academic_summary");
    expect(summary.gpa).toBe(3.85);
    expect(summary.in_progress_credits).toBe(1);
  });

  it("searches the catalog by code and words", async () => {
    const byCode = await ok(ctxFor("alice"), "search_courses", { query: "cpsc 323" });
    expect(byCode.courses[0].code).toBe("CPSC 3230");
    const details = await ok(ctxFor("alice"), "get_course_details", { code: "cpsc 365" });
    expect(details.code).toBe("CPSC 3650");
    expect(details.student.could_fill.some((m: { requirement: string }) => m.requirement === "Algorithms")).toBe(true);
  });
});

describe("transcript writes", () => {
  it("adds courses idempotently and replaces a changed grade", async () => {
    const ctx = ctxFor("alice");
    const first = await ok(ctx, "add_courses", {
      courses: [{ code: "math 2440", term: "Spring 2026", grade: "B" }],
    });
    expect(first.changed).toBe(true);
    const again = await ok(ctx, "add_courses", {
      courses: [{ code: "MATH 2440", term: "Spring 2026", grade: "B" }],
    });
    expect(again.changed).toBe(false);
    await ok(ctx, "add_courses", { courses: [{ code: "MATH 2440", term: "Spring 2026", grade: "A" }] });
    const math = (await ctx.store.listCourses()).filter((c) => c.code === "MATH 2440");
    expect(math).toHaveLength(1);
    expect(math[0].grade).toBe("A");
    expect(audit.events.get("alice")).toHaveLength(2);
  });

  it("sends future terms to the plan instead", async () => {
    const res = await call(ctxFor("alice"), "add_courses", {
      courses: [{ code: "CPSC 3650", term: "Spring 2027", grade: null }],
    });
    expect(res.isError).toBe(true);
    expect(res.text).toMatch(/add_planned_course/);
  });

  it("previews with dry_run without saving or auditing", async () => {
    const ctx = ctxFor("alice");
    const before = db.courses.size;
    const res = await ok(ctx, "add_courses", {
      courses: [{ code: "CPSC 2020", term: "Fall 2025", grade: "A" }],
      dry_run: true,
    });
    expect(res.dry_run).toBe(true);
    expect(res.would_change).toBe(true);
    expect(db.courses.size).toBe(before);
    expect(audit.events.get("alice")).toBeUndefined();
  });

  it("edits, tags, places out and deletes", async () => {
    const ctx = ctxFor("alice");
    const store = ctx.store as ReturnType<MemoryDatabase["storeFor"]>;
    const done = await ok(ctx, "update_course", { code: "CPSC 3230", grade: "B+" });
    expect(done.course.status).toBe("completed");

    await ok(ctx, "set_course_distributionals", { code: "CPSC 2010", distributionals: ["QR", "Sc"] });
    let c2010 = (await store.listCourses()).find((c) => c.code === "CPSC 2010")!;
    expect(c2010.distributionals).toEqual(["QR", "Sc"]);
    await ok(ctx, "set_course_distributionals", { code: "CPSC 2010", distributionals: null });
    c2010 = (await store.listCourses()).find((c) => c.code === "CPSC 2010")!;
    expect(c2010.distributionals).toBeUndefined();

    await ok(ctx, "mark_course_placed_out", { code: "MATH 1120" });
    expect(db.courses.get("alice_MATH 1120")?.skipped).toBe(true);
    const repeat = await ok(ctx, "mark_course_placed_out", { code: "MATH 1120" });
    expect(repeat.changed).toBe(false);
    await ok(ctx, "mark_course_placed_out", { code: "MATH 1120", placed_out: false });
    expect(db.courses.has("alice_MATH 1120")).toBe(false);

    const del = await ok(ctx, "delete_courses", { course_ids: [c2010.id] });
    expect(del.changed).toBe(true);
    expect(db.courses.has(c2010.id)).toBe(false);
    expect(store.writes).toBeGreaterThanOrEqual(5);
  });

  it("assigns and excludes requirements on declared programs only", async () => {
    const ctx = ctxFor("alice");
    await ok(ctx, "add_courses", { courses: [{ code: "CPSC 4710", term: "Spring 2026", grade: "A" }] });
    await ok(ctx, "set_requirement_assignment", {
      code: "CPSC 4710",
      action: "assign",
      program_type: "major",
      program_id: "CPSC_BS",
      requirement: "senior project",
    });
    const course = (await ctx.store.listCourses()).find((c) => c.code === "CPSC 4710")!;
    expect(course.manualRequirementsFulfilled).toEqual([{ major_id: "CPSC_BS", requirement_title: "Senior Project" }]);

    await ok(ctx, "set_requirement_assignment", {
      code: "CPSC 4710",
      action: "exclude",
      program_type: "major",
      program_id: "CPSC_BS",
      requirement: "Senior Project",
    });
    const after = (await ctx.store.listCourses()).find((c) => c.code === "CPSC 4710")!;
    expect(after.manualRequirementsFulfilled).toEqual([]);
    expect(after.excludedFromRequirements).toHaveLength(1);

    const undeclared = await call(ctx, "set_requirement_assignment", {
      code: "CPSC 4710",
      action: "assign",
      program_type: "major",
      program_id: "ECON_BA",
      requirement: "anything",
    });
    expect(undeclared.isError).toBe(true);
    const unknownReq = await call(ctx, "set_requirement_assignment", {
      code: "CPSC 4710",
      action: "assign",
      program_type: "major",
      program_id: "CPSC_BS",
      requirement: "Underwater Basket Weaving",
    });
    expect(unknownReq.isError).toBe(true);
  });
});

describe("profile writes", () => {
  it("validates programs and years", async () => {
    const ctx = ctxFor("alice");
    expect((await call(ctx, "update_profile", { majors: ["NOT_A_MAJOR"] })).isError).toBe(true);
    expect((await call(ctx, "update_profile", { majors: ["CPSC_BS", "ECON_BA", "MENG"] })).isError).toBe(true);
    expect((await call(ctx, "update_profile", { graduation_year: 2045 })).isError).toBe(true);
    await ok(ctx, "update_profile", { majors: ["CPSC_BS", "ECON_BA"], certificates: ["CERT_DATA_SCIENCE"] });
    expect(db.users.get("alice")!.majors).toEqual(["CPSC_BS", "ECON_BA"]);
    const same = await ok(ctx, "update_profile", { majors: ["CPSC_BS", "ECON_BA"] });
    expect(same.changed).toBe(false);
  });

  it("sets distributional preferences and prereq overrides", async () => {
    const ctx = ctxFor("alice");
    await ok(ctx, "set_distributional_preferences", {
      auto_allocate: false,
      manual_allocations: { "ENGL 1200": "WR" },
    });
    expect(db.users.get("alice")!.distributionalAllocations).toEqual({ "ENGL 1200": "WR" });
    expect((await call(ctx, "set_distributional_preferences", { manual_allocations: { "ENGL 1200": "XX" } })).isError).toBe(true);
    await ok(ctx, "set_prereq_override", { code: "CPSC 3650" });
    expect(db.users.get("alice")!.prereqOverrides).toEqual(["CPSC 3650"]);
  });

  it("is refused for a read-only connection", () => {
    expect(toolsForScopes([SCOPE_READ]).map((t) => t.name)).not.toContain("update_profile");
  });
});

describe("plans", () => {
  it("creates, fills, projects and edits a plan", async () => {
    const ctx = ctxFor("alice");
    const created = await ok(ctx, "create_plan", { name: "Main" });
    expect(created.is_default).toBe(true);

    const added = await ok(ctx, "add_planned_course", { code: "cpsc 365", term: "spring 2027" });
    expect(added.changed).toBe(true);
    expect(added.could_fill.join(" ")).toMatch(/Algorithms/);

    const plan = await ok(ctx, "get_plan");
    const spring = plan.semesters.find((s: { term: string }) => s.term === "Spring 2027");
    expect(spring.courses.map((c: { code: string; status: string }) => [c.code, c.status])).toEqual([["CPSC 3650", "planned"]]);
    const fall = plan.semesters.find((s: { term: string }) => s.term === "Fall 2026");
    expect(fall.when).toBe("current");

    const projected = await ok(ctx, "get_plan_progress");
    const algorithms = projected.programs[0].requirements.find((r: { name: string }) => r.name === "Algorithms");
    expect(algorithms.state).not.toBe("remaining");

    const repeat = await ok(ctx, "add_planned_course", { code: "CPSC 3650", term: "Spring 2027" });
    expect(repeat.changed).toBe(false);
    expect((await call(ctx, "add_planned_course", { code: "CPSC 3650", term: "Fall 2027" })).isError).toBe(true);
    expect((await call(ctx, "add_planned_course", { code: "CPSC 2010", term: "Fall 2027" })).text).toMatch(/transcript/);
    expect((await call(ctx, "add_planned_course", { code: "CPSC 4900", term: "Spring 2026" })).text).toMatch(/past/);
    expect((await call(ctx, "add_planned_course", { code: "CPSC 4900", term: "Summer 2027" })).isError).toBe(true);

    await ok(ctx, "move_planned_course", { code: "CPSC 3650", to_term: "Fall 2027" });
    const moved = await ok(ctx, "get_plan");
    expect(moved.semesters.find((s: { term: string }) => s.term === "Fall 2027").courses[0].code).toBe("CPSC 3650");

    await ok(ctx, "set_plan_requirement_assignment", {
      code: "CPSC 3650",
      action: "assign",
      program_type: "major",
      program_id: "CPSC_BS",
      requirement: "Intermediate or Advanced Computer Science Electives",
    });
    expect(db.users.get("alice")!.savedPlans![0].manualRequirements).toHaveLength(1);

    await ok(ctx, "remove_planned_course", { code: "CPSC 3650" });
    const empty = db.users.get("alice")!.savedPlans![0];
    expect(empty.manualRequirements).toEqual([]);
    expect(empty.semesters.flatMap((s) => s.courses).filter((c) => c.status === "not-taken")).toEqual([]);
  });

  it("copies, renames, re-defaults and deletes plans", async () => {
    const ctx = ctxFor("alice");
    await ok(ctx, "create_plan", { name: "Main" });
    await ok(ctx, "add_planned_course", { code: "CPSC 3650", term: "Spring 2027" });
    await ok(ctx, "create_plan", { name: "Backup", copy_from: "Main", make_default: true });
    expect((await call(ctx, "create_plan", { name: "Main" })).isError).toBe(true);
    let plans = (await ok(ctx, "list_plans")).plans;
    expect(plans.map((p: { name: string; is_default: boolean; planned_courses: number }) => [p.name, p.is_default, p.planned_courses])).toEqual([
      ["Main", false, 1],
      ["Backup", true, 1],
    ]);
    await ok(ctx, "update_plan", { plan_name: "Main", new_name: "Ambitious" });
    await ok(ctx, "delete_plan", { plan_name: "Backup" });
    plans = (await ok(ctx, "list_plans")).plans;
    expect(plans).toEqual([expect.objectContaining({ name: "Ambitious", is_default: true })]);
    const gone = await ok(ctx, "delete_plan", { plan_name: "Backup" });
    expect(gone.changed).toBe(false);
  });

  it("does not refresh the friends view for plan-only edits", async () => {
    const ctx = ctxFor("alice");
    const store = ctx.store as ReturnType<MemoryDatabase["storeFor"]>;
    await ok(ctx, "create_plan", { name: "Main" });
    expect(store.writes).toBe(0);
    expect(audit.events.get("alice")![0]).toMatchObject({ tool: "create_plan", clientName: "Test Agent" });
  });
});
