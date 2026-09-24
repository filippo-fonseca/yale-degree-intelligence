// Yale's distributional requirements are not only a graduation total. They are
// a set of cumulative PROMOTION MILESTONES, checked at the end of the second,
// fourth, sixth, and eighth terms of enrollment. A student who reaches the end
// of sophomore year without a science credit is not "behind on graduation", she
// is not promoted to junior standing.
//
// This module turns a student's courses (completed, in-progress, and planned)
// into the same stacked-bar snapshot Yale College publishes in its milestone
// chart, plus a behind / on-track verdict per milestone.
//
// The rules encoded here come from the Yale College "Distributional
// Requirements" milestone chart and the YCPS text that accompanies it:
//
//   End of term 2 (first year):  8 credits.  One credit in TWO of QR / WR / L.
//   End of term 4 (sophomore):  16 credits.  One credit in EACH of Hu, Sc, So
//                                            AND one credit in EACH of QR, WR, L.
//   End of term 6 (junior):     26 credits.  All skills complete (language done,
//                                            2 QR, 2 WR) plus one credit each in
//                                            Hu, Sc, So.
//   End of term 8 (graduation): 36 credits.  Language done, 2 QR, 2 WR, and
//                                            2 each of Hu, Sc, So.
//
// Two grading bases matter. The first-year and sophomore milestones may be met
// by ENROLLMENT: a course taken Credit/D/Fail, withdrawn from, or failed still
// counts, and a course currently in progress counts too. The junior and senior
// milestones require PASSING LETTER GRADES, so a Credit/D/Fail course does not
// count and an in-progress course can only ever be "projected".
//
// Credit totals for promotion are a separate axis: they count every earned
// credit, Credit/D/Fail included, which is why credits and distributional
// eligibility are computed independently below.

import { Course } from "@/lib/types";
import {
  allocateDistributionals,
  courseDistCredits,
} from "@/lib/distributionalAllocation";
import {
  LANG_LEVELS,
  buildLanguageTracks,
  requiredLevelsForPlacement,
} from "@/lib/languageRequirement";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";
import { compareTermNames, currentTermName, parseTermName } from "@/lib/academicTerm";

/* -------------------------------------------------------------------------- */
/* Milestone specs                                                            */
/* -------------------------------------------------------------------------- */

export type DistReqKey = "Hu" | "Sc" | "So" | "QR" | "WR" | "L";

export type MilestoneKey = "first-year" | "sophomore" | "junior" | "senior";

export type MilestoneSlotSpec = {
  req: DistReqKey | "ANY_SKILL";
  kind: "area" | "skill";
};

export type MilestoneSpec = {
  key: MilestoneKey;
  label: string;
  /** Term of enrollment the milestone is checked at the end of. */
  term: 2 | 4 | 6 | 8;
  creditsRequired: 8 | 16 | 26 | 36;
  gradingBasis: "enrollment" | "letter";
  /** Chart bars, top to bottom, exactly as Yale prints them. */
  slots: MilestoneSlotSpec[];
  description: string;
};

const area = (req: DistReqKey): MilestoneSlotSpec => ({ req, kind: "area" });
const skill = (req: DistReqKey | "ANY_SKILL"): MilestoneSlotSpec => ({
  req,
  kind: "skill",
});

export const DISTRIBUTIONAL_MILESTONES: MilestoneSpec[] = [
  {
    key: "first-year",
    label: "First-year",
    term: 2,
    creditsRequired: 8,
    gradingBasis: "enrollment",
    slots: [skill("ANY_SKILL"), skill("ANY_SKILL")],
    description:
      "By the end of your second term: 8 course credits, and at least one course credit in two of the three skills categories (quantitative reasoning, writing, foreign language).",
  },
  {
    key: "sophomore",
    label: "Sophomore",
    term: 4,
    creditsRequired: 16,
    gradingBasis: "enrollment",
    slots: [
      area("Hu"),
      area("Sc"),
      area("So"),
      skill("QR"),
      skill("WR"),
      skill("L"),
    ],
    description:
      "By the end of your fourth term: 16 course credits, at least one credit in each disciplinary area (humanities and arts, sciences, social sciences), and at least one credit in each skills category.",
  },
  {
    key: "junior",
    label: "Junior",
    term: 6,
    creditsRequired: 26,
    gradingBasis: "letter",
    slots: [
      area("Hu"),
      area("Sc"),
      area("So"),
      skill("QR"),
      skill("WR"),
      skill("QR"),
      skill("WR"),
      skill("L"),
    ],
    description:
      "By the end of your sixth term: 26 course credits, all skills requirements complete (foreign language finished, 2 credits of quantitative reasoning, 2 of writing), and at least one credit in each disciplinary area. These must be passing letter grades.",
  },
  {
    key: "senior",
    label: "Senior / graduation",
    term: 8,
    creditsRequired: 36,
    gradingBasis: "letter",
    slots: [
      area("Hu"),
      area("Sc"),
      area("So"),
      area("Hu"),
      area("Sc"),
      area("So"),
      skill("QR"),
      skill("WR"),
      skill("QR"),
      skill("WR"),
      skill("L"),
    ],
    description:
      "To graduate: 36 course credits, the foreign language requirement complete, 2 credits each of quantitative reasoning and writing, and 2 credits each in humanities and arts, sciences, and social sciences. These must be passing letter grades.",
  },
];

/* -------------------------------------------------------------------------- */
/* Term mapping                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The term name for the nth term of enrollment for a given graduating class.
 *
 * The plan grid spans Fall (graduationYear - 4) through Spring (graduationYear),
 * so term 1 is Fall (gradYear - 4), term 2 is Spring (gradYear - 3), and so on
 * up to term 8, Spring of the graduation year itself.
 */
export function enrollmentTermName(graduationYear: number, n: number): string {
  const season = n % 2 === 1 ? "Fall" : "Spring";
  const year =
    n % 2 === 1
      ? graduationYear - 4 + (n - 1) / 2
      : graduationYear - 4 + n / 2;
  return `${season} ${year}`;
}

/**
 * How many terms of enrollment a student is into, counting the term currently
 * under way. Returns 0 before the first term and never exceeds 8. Null when the
 * graduation year is unknown or the current term cannot be parsed.
 */
export function termsEnrolledAsOf(
  graduationYear: number | null | undefined,
  currentTerm: string,
): number | null {
  if (!graduationYear || !Number.isFinite(graduationYear)) return null;
  if (!parseTermName(currentTerm)) return null;
  let count = 0;
  for (let n = 1; n <= 8; n += 1) {
    if (compareTermNames(enrollmentTermName(graduationYear, n), currentTerm) <= 0) {
      count = n;
    }
  }
  return count;
}

/* -------------------------------------------------------------------------- */
/* Inputs and results                                                         */
/* -------------------------------------------------------------------------- */

export type MilestoneCourseInput = {
  id: string;
  code: string;
  credits: number;
  /** Effective distributional tags, e.g. ["Hu", "WR", "L3"]. */
  distributionals: string[];
  status: "completed" | "in-progress" | "planned";
  /** "CR" marks a Credit/D/Fail course. */
  grade?: string | null;
  /** e.g. "Fall 2025". Null means undated, which is treated as already taken. */
  term?: string | null;
};

export type SlotFill = "done" | "projected" | "empty";

export type MilestoneSlotResult = MilestoneSlotSpec & {
  fill: SlotFill;
  /** Course code that fills the slot, when there is one. */
  source?: string;
  /** Status of the course that fills the slot, so planned reads as planned. */
  sourceStatus?: MilestoneCourseInput["status"];
  /** For an ANY_SKILL slot, the skill that actually filled it. */
  resolvedReq?: DistReqKey;
};

export type MilestoneStatus =
  | "met"
  | "projected"
  | "at-risk"
  | "missed"
  | "upcoming";

export type MilestoneResult = {
  key: MilestoneKey;
  spec: MilestoneSpec;
  /** e.g. "Spring 2027". Null when the graduation year is unknown. */
  deadlineTerm: string | null;
  /** The milestone whose deadline is the next one to arrive. */
  isCurrent: boolean;
  credits: {
    earned: number;
    projected: number;
    required: number;
    met: boolean;
    projectedMet: boolean;
  };
  slots: MilestoneSlotResult[];
  /**
   * Credit already earned or planned by this checkpoint beyond what it
   * requires, up to the graduation totals. The milestones are cumulative, so a
   * second Hu credit taken sophomore year still belongs in the junior column;
   * it just is not due yet. Never empty slots, and never on the senior column.
   */
  ahead: MilestoneSlotResult[];
  distributionalsMet: boolean;
  distributionalsProjectedMet: boolean;
  status: MilestoneStatus;
  notes: string[];
};

export type MilestoneEvaluation = {
  milestones: MilestoneResult[];
  termsEnrolled: number | null;
  currentTerm: string;
};

/* -------------------------------------------------------------------------- */
/* Grade and status helpers                                                   */
/* -------------------------------------------------------------------------- */

const EPS = 1e-9;

/** Grades that are not a passing letter grade, so cannot count on letter basis. */
const NON_LETTER_GRADES = new Set(["CR", "F", "W", "IN PROGRESS"]);

function normalizeGrade(grade?: string | null): string {
  return (grade ?? "").trim().toUpperCase();
}

/** True when the course was taken Credit/D/Fail. */
export function isCreditDFail(grade?: string | null): boolean {
  return normalizeGrade(grade) === "CR";
}

function hasPassingLetterGrade(course: MilestoneCourseInput): boolean {
  const g = normalizeGrade(course.grade);
  if (!g) return true; // an untagged completed course is taken at face value
  return !NON_LETTER_GRADES.has(g);
}

/** Credits a course contributes toward the promotion credit total. */
function creditsOf(course: MilestoneCourseInput): number {
  return course.credits > 0 ? course.credits : 1;
}

function countsAsDone(
  course: MilestoneCourseInput,
  basis: MilestoneSpec["gradingBasis"],
): boolean {
  if (basis === "enrollment") {
    return course.status === "completed" || course.status === "in-progress";
  }
  return course.status === "completed" && hasPassingLetterGrade(course);
}

function countsAsProjected(
  course: MilestoneCourseInput,
  basis: MilestoneSpec["gradingBasis"],
): boolean {
  if (countsAsDone(course, basis)) return true;
  if (course.status === "planned") return true;
  // On the letter basis an in-progress course has no grade yet, so it can only
  // ever be projected. A completed Credit/D/Fail course, by contrast, is
  // settled: it will never count, so it is not projected either.
  return basis === "letter" && course.status === "in-progress";
}

/** Undated courses count as if they were taken before the deadline. */
function isOnOrBefore(term: string | null | undefined, deadline: string | null): boolean {
  if (!deadline) return true;
  if (!term || !parseTermName(term)) return true;
  return compareTermNames(term, deadline) <= 0;
}

/* -------------------------------------------------------------------------- */
/* Bridging to the allocation and language engines                            */
/* -------------------------------------------------------------------------- */

/**
 * The allocation engine and the language engine both speak `Course`. A
 * milestone input carries everything they read (code, credits, tags, identity),
 * so this is a shape adapter and nothing more.
 */
function toCourseShape(course: MilestoneCourseInput): Course {
  const parsed = course.term ? parseTermName(course.term) : null;
  return {
    id: course.id || course.code,
    code: course.code,
    grade: course.grade ?? null,
    semester: parsed?.term ?? "",
    year: parsed?.year ?? 0,
    userId: "",
    status: course.status === "planned" ? "not-taken" : course.status,
    credits: course.credits,
    distributionals: course.distributionals,
  };
}

const LANG_TAGS = new Set<string>([...LANG_LEVELS, "L"]);

function isLanguageCourse(course: MilestoneCourseInput): boolean {
  return course.distributionals.some((t) => LANG_TAGS.has(t));
}

function languageDistMap(courses: MilestoneCourseInput[]): Record<string, Course[]> {
  const map: Record<string, Course[]> = {};
  LANG_LEVELS.forEach((level) => {
    map[level] = [];
  });
  courses.forEach((c) => {
    const shaped = toCourseShape(c);
    c.distributionals.forEach((tag) => {
      if (map[tag]) map[tag].push(shaped);
    });
  });
  return map;
}

type LanguageVerdict = {
  /** Credits of language coursework, for the "one credit of L" milestone. */
  credits: number;
  /** Whether the full YCPS language requirement is finished. */
  complete: boolean;
  /** True when the placement level had to be inferred from the lowest course. */
  inferredPlacement: boolean;
  source?: string;
};

function parsePlacement(placement?: string | null): number | null {
  if (!placement) return null;
  const m = String(placement).trim().match(/([1-5])/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Language progress for one set of courses.
 *
 * Completion is delegated to the existing language engine, which groups courses
 * by subject and scores each language on its own. When the caller does not give
 * us a placement level, that engine infers it from the lowest level tagged, and
 * we flag the inference so the UI can caveat it.
 */
function evaluateLanguage(
  courses: MilestoneCourseInput[],
  placement?: string | null,
): LanguageVerdict {
  const langCourses = courses.filter(isLanguageCourse);
  const credits = langCourses.reduce(
    (sum, c) => sum + courseDistCredits(toCourseShape(c)),
    0,
  );
  const source = langCourses.length > 0 ? sortForDisplay(langCourses)[0].code : undefined;

  if (langCourses.length === 0) {
    return { credits: 0, complete: false, inferredPlacement: false };
  }

  const tracks = buildLanguageTracks(languageDistMap(langCourses));
  const placed = parsePlacement(placement);

  if (placed) {
    const required = requiredLevelsForPlacement(placed);
    const complete =
      required.length > 0 &&
      tracks.some((track) =>
        required.every((level) => (track.coursesByLevel[level] || []).length > 0),
      );
    return { credits, complete, inferredPlacement: false, source };
  }

  return {
    credits,
    complete: tracks[0]?.isComplete ?? false,
    inferredPlacement: true,
    source,
  };
}

/* -------------------------------------------------------------------------- */
/* Slot filling                                                               */
/* -------------------------------------------------------------------------- */

const STATUS_ORDER: Record<MilestoneCourseInput["status"], number> = {
  completed: 0,
  "in-progress": 1,
  planned: 2,
};

function sortForDisplay(courses: MilestoneCourseInput[]): MilestoneCourseInput[] {
  return [...courses].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      compareTermNames(a.term || "", b.term || "") ||
      a.code.localeCompare(b.code),
  );
}

type ReqSnapshot = {
  byCode: Map<string, MilestoneCourseInput>;
  /** Credits allocated to each of the five area/skill requirements. */
  creditsByReq: Record<string, number>;
  /** Courses backing each requirement, best-settled first. */
  coursesByReq: Record<string, MilestoneCourseInput[]>;
  language: LanguageVerdict;
};

function snapshot(
  courses: MilestoneCourseInput[],
  overrides: Record<string, string>,
  languagePlacement?: string | null,
): ReqSnapshot {
  const byKey = new Map<string, MilestoneCourseInput>();
  const shaped = courses.map((c) => {
    const s = toCourseShape(c);
    byKey.set(s.id, c);
    return s;
  });

  const hasOverrides = Object.keys(overrides).length > 0;
  const alloc = allocateDistributionals(shaped, {
    auto: !hasOverrides,
    overrides,
  });

  const creditsByReq: Record<string, number> = {};
  const coursesByReq: Record<string, MilestoneCourseInput[]> = {};
  Object.entries(alloc.coursesByReq).forEach(([req, list]) => {
    const inputs = sortForDisplay(
      list.map((c) => byKey.get(c.id)).filter(Boolean) as MilestoneCourseInput[],
    );
    coursesByReq[req] = inputs;
    creditsByReq[req] = list.reduce((sum, c) => sum + courseDistCredits(c), 0);
  });

  return {
    byCode: new Map(courses.map((c) => [c.code, c])),
    creditsByReq,
    coursesByReq,
    language: evaluateLanguage(courses, languagePlacement),
  };
}

/** Credits available for a requirement in a snapshot, language included. */
function reqCredits(snap: ReqSnapshot, req: DistReqKey): number {
  if (req === "L") return snap.language.credits;
  return snap.creditsByReq[req] ?? 0;
}

/**
 * The course that pushes a requirement's running credit total past `index + 1`.
 * With half-credit courses two of them fill one slot, and the second one is the
 * course named on that slot.
 */
function sourceAt(
  snap: ReqSnapshot,
  req: DistReqKey,
  index: number,
): string | undefined {
  if (req === "L") return snap.language.source;
  const list = snap.coursesByReq[req];
  if (!list) return undefined;
  let running = 0;
  for (const c of list) {
    running += courseDistCredits(toCourseShape(c));
    if (running >= index + 1 - EPS) return c.code;
  }
  return undefined;
}

/** A filled slot, carrying the status of the course that fills it. */
function filled(
  slot: MilestoneSlotSpec,
  fill: Exclude<SlotFill, "empty">,
  snap: ReqSnapshot,
  source: string | undefined,
  resolvedReq?: DistReqKey,
): MilestoneSlotResult {
  return {
    ...slot,
    fill,
    source,
    sourceStatus: source ? snap.byCode.get(source)?.status : undefined,
    ...(resolvedReq ? { resolvedReq } : {}),
  };
}

const SKILL_ORDER: DistReqKey[] = ["QR", "WR", "L"];

/** What graduation asks of each requirement, in the order Yale stacks them. */
const GRADUATION_TARGETS: [DistReqKey, number][] = [
  ["Hu", 2],
  ["Sc", 2],
  ["So", 2],
  ["QR", 2],
  ["WR", 2],
  ["L", 1],
];

/** The skills categories with at least one credit, in chart order. */
function satisfiedSkills(snap: ReqSnapshot): DistReqKey[] {
  return SKILL_ORDER.filter((s) => reqCredits(snap, s) >= 1 - EPS);
}

/* -------------------------------------------------------------------------- */
/* Evaluation                                                                 */
/* -------------------------------------------------------------------------- */

const REQ_LABEL: Record<DistReqKey, string> = {
  Hu: "Hu (humanities and arts)",
  Sc: "Sc (sciences)",
  So: "So (social sciences)",
  QR: "QR (quantitative reasoning)",
  WR: "WR (writing)",
  L: "L (foreign language)",
};

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

export function evaluateDistributionalMilestones(input: {
  courses: MilestoneCourseInput[];
  graduationYear?: number | null;
  currentTerm?: string;
  allocationOverrides?: Record<string, DistReqKey>;
  languagePlacement?: string | null;
}): MilestoneEvaluation {
  const currentTerm =
    input.currentTerm && parseTermName(input.currentTerm)
      ? input.currentTerm
      : currentTermName();
  const gradYear =
    input.graduationYear && Number.isFinite(input.graduationYear)
      ? Number(input.graduationYear)
      : null;
  const overrides: Record<string, string> = { ...(input.allocationOverrides ?? {}) };
  const courses = (input.courses ?? []).filter(Boolean);

  type Draft = Omit<MilestoneResult, "isCurrent" | "status"> & {
    deadlineTerm: string | null;
  };

  const drafts: Draft[] = DISTRIBUTIONAL_MILESTONES.map((spec) => {
    const deadlineTerm = gradYear ? enrollmentTermName(gradYear, spec.term) : null;
    const eligible = courses.filter((c) => isOnOrBefore(c.term, deadlineTerm));

    const doneCourses = eligible.filter((c) => countsAsDone(c, spec.gradingBasis));
    const projCourses = eligible.filter((c) =>
      countsAsProjected(c, spec.gradingBasis),
    );

    const doneSnap = snapshot(doneCourses, overrides, input.languagePlacement);
    const projSnap = snapshot(projCourses, overrides, input.languagePlacement);

    // Credits are their own axis: every earned credit counts, Credit/D/Fail
    // included, and in-progress plus planned coursework is the projection.
    const earned = eligible
      .filter((c) => c.status === "completed")
      .reduce((sum, c) => sum + creditsOf(c), 0);
    const projected = eligible.reduce((sum, c) => sum + creditsOf(c), 0);

    const languageIsCompletion = spec.gradingBasis === "letter";

    /** Fill the `index`th slot of a named requirement at this checkpoint. */
    const fillReq = (
      slot: MilestoneSlotSpec,
      req: DistReqKey,
      index: number,
    ): MilestoneSlotResult => {
      if (req === "L" && languageIsCompletion) {
        // Junior and senior want the whole language requirement finished, not
        // a single course credit.
        if (doneSnap.language.complete) {
          return filled(slot, "done", doneSnap, doneSnap.language.source);
        }
        if (projSnap.language.complete) {
          return filled(slot, "projected", projSnap, projSnap.language.source);
        }
        return { ...slot, fill: "empty" };
      }

      const doneCredits = reqCredits(doneSnap, req);
      const projCredits = Math.max(reqCredits(projSnap, req), doneCredits);
      if (doneCredits >= index + 1 - EPS) {
        return filled(slot, "done", doneSnap, sourceAt(doneSnap, req, index));
      }
      if (projCredits >= index + 1 - EPS) {
        return filled(slot, "projected", projSnap, sourceAt(projSnap, req, index));
      }
      return { ...slot, fill: "empty" };
    };

    const seen: Record<string, number> = {};
    const slots: MilestoneSlotResult[] = spec.slots.map((slot) => {
      if (slot.req === "ANY_SKILL") {
        const index = seen.ANY_SKILL ?? 0;
        seen.ANY_SKILL = index + 1;
        const doneSkills = satisfiedSkills(doneSnap);
        const projSkills = satisfiedSkills(projSnap);
        if (doneSkills.length > index) {
          const req = doneSkills[index];
          return filled(slot, "done", doneSnap, sourceAt(doneSnap, req, 0), req);
        }
        // Skills already counted as done cannot fill a second slot.
        const extra = projSkills.filter((s) => !doneSkills.includes(s));
        const req = extra[index - doneSkills.length];
        if (req) {
          return filled(slot, "projected", projSnap, sourceAt(projSnap, req, 0), req);
        }
        return { ...slot, fill: "empty" };
      }

      const req = slot.req;
      const index = seen[req] ?? 0;
      seen[req] = index + 1;
      return fillReq(slot, req, index);
    });

    // Cumulative credit beyond the checkpoint: count what the required slots
    // already used (an ANY_SKILL slot uses the skill it resolved to), then
    // fill toward the graduation totals and keep whatever is covered.
    const used: Record<string, number> = {};
    slots.forEach((slot) => {
      const req = slot.req === "ANY_SKILL" ? slot.resolvedReq : slot.req;
      if (req) used[req] = (used[req] ?? 0) + 1;
    });
    const ahead: MilestoneSlotResult[] = [];
    if (spec.key !== "senior") {
      GRADUATION_TARGETS.forEach(([req, target]) => {
        for (let index = used[req] ?? 0; index < target; index += 1) {
          const slot = req === "Hu" || req === "Sc" || req === "So" ? area(req) : skill(req);
          const result = fillReq(slot, req, index);
          if (result.fill !== "empty") ahead.push(result);
        }
      });
    }

    const distributionalsMet = slots.every((s) => s.fill === "done");
    const distributionalsProjectedMet = slots.every((s) => s.fill !== "empty");

    const notes = buildNotes({
      spec,
      slots,
      deadlineTerm,
      earned,
      projected,
      doneSnap,
      projSnap,
      languageIsCompletion,
    });

    return {
      key: spec.key,
      spec,
      deadlineTerm,
      credits: {
        earned,
        projected,
        required: spec.creditsRequired,
        met: earned >= spec.creditsRequired - EPS,
        projectedMet: projected >= spec.creditsRequired - EPS,
      },
      slots,
      ahead,
      distributionalsMet,
      distributionalsProjectedMet,
      notes,
    };
  });

  // The current milestone is the one whose deadline is the next to arrive.
  let currentIndex = -1;
  if (gradYear) {
    currentIndex = drafts.findIndex(
      (d) => d.deadlineTerm && compareTermNames(d.deadlineTerm, currentTerm) >= 0,
    );
  }

  const milestones: MilestoneResult[] = drafts.map((draft, i) => {
    const isCurrent = i === currentIndex;
    const met = draft.credits.met && draft.distributionalsMet;
    const projectedMet =
      draft.credits.projectedMet && draft.distributionalsProjectedMet;

    let status: MilestoneStatus;
    if (met) status = "met";
    else if (projectedMet) status = "projected";
    else if (!draft.deadlineTerm) status = "at-risk";
    else if (compareTermNames(draft.deadlineTerm, currentTerm) < 0) status = "missed";
    else if (isCurrent) status = "at-risk";
    else status = "upcoming";

    return { ...draft, isCurrent, status };
  });

  return {
    milestones,
    termsEnrolled: termsEnrolledAsOf(gradYear, currentTerm),
    currentTerm,
  };
}

function buildNotes(args: {
  spec: MilestoneSpec;
  slots: MilestoneSlotResult[];
  deadlineTerm: string | null;
  earned: number;
  projected: number;
  doneSnap: ReqSnapshot;
  projSnap: ReqSnapshot;
  languageIsCompletion: boolean;
}): string[] {
  const { spec, slots, deadlineTerm, earned, projected, doneSnap, languageIsCompletion } =
    args;
  const by = deadlineTerm ? ` by ${deadlineTerm}` : "";
  const notes: string[] = [];

  if (earned < spec.creditsRequired - EPS) {
    const short = Math.round((spec.creditsRequired - earned) * 100) / 100;
    const covered = projected >= spec.creditsRequired - EPS;
    notes.push(
      `${plural(short, "more course credit")} needed${by}` +
        (covered ? " (in-progress and planned courses cover this)." : "."),
    );
  }

  // Group the unmet slots by requirement so each gap is one plain sentence.
  const gaps = new Map<string, { needed: number; covered: number }>();
  slots.forEach((slot) => {
    if (slot.fill === "done") return;
    const key = slot.req;
    const entry = gaps.get(key) ?? { needed: 0, covered: 0 };
    entry.needed += 1;
    if (slot.fill === "projected") entry.covered += 1;
    gaps.set(key, entry);
  });

  gaps.forEach((entry, key) => {
    const tail = entry.covered >= entry.needed ? " (planned coursework covers this)." : ".";
    if (key === "ANY_SKILL") {
      notes.push(
        `Course credit needed in ${entry.needed} more of QR, WR, or L${by}${tail}`,
      );
      return;
    }
    const req = key as DistReqKey;
    if (req === "L" && languageIsCompletion) {
      notes.push(`Foreign language requirement not yet complete${by}${tail}`);
      return;
    }
    notes.push(`${plural(entry.needed, `more ${REQ_LABEL[req]} credit`)} needed${by}${tail}`);
  });

  if (languageIsCompletion && doneSnap.language.inferredPlacement) {
    notes.push(
      "Language placement was inferred from the lowest level you have taken. Set your placement level for an exact answer.",
    );
  }

  return notes;
}

/* -------------------------------------------------------------------------- */
/* Adapter                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Turn transcript / plan courses into milestone inputs.
 *
 * Skipped courses are major-only placeholders: they are neither credit nor
 * distributional coursework, so they are dropped here rather than filtered by
 * every caller.
 */
export function toMilestoneCourseInputs(courses: Course[]): MilestoneCourseInput[] {
  return (courses ?? [])
    .filter(
      (c) =>
        c &&
        !c.skipped &&
        c.status !== "skipped" &&
        (c.semester ?? "") !== "Skipped",
    )
    .map((c) => {
      const inProgress =
        c.status === "in-progress" || normalizeGrade(c.grade) === "IN PROGRESS";
      const status: MilestoneCourseInput["status"] = inProgress
        ? "in-progress"
        : c.status === "completed"
          ? "completed"
          : "planned";
      const termName = `${c.semester ?? ""} ${c.year ?? ""}`.trim();
      return {
        id: c.id || c.code,
        code: c.code,
        credits: c.credits,
        distributionals: effectiveDistributionals(c),
        status,
        grade: c.grade ?? null,
        term: parseTermName(termName) ? termName : null,
      };
    });
}
