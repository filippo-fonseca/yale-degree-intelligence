import { normalizeCourseCode } from "@/lib/courseCatalog";

/**
 * The slice of a major or certificate progress result the canvas badge reads.
 * Both `MajorProgress` and `CertificateProgress` satisfy it, so the badge
 * shows exactly what the Projected progress pane counts and never runs its own
 * matching.
 */
type ProgressLike = {
  completedRequirements: RequirementLike[];
  inProgressRequirements: RequirementLike[];
  remainingRequirements: RequirementLike[];
};

type RequirementLike = {
  name: string;
  options: {
    code: string;
    completed: boolean;
    inProgress: boolean;
  }[];
};

export type CourseRequirementHit = {
  programType: "major" | "certificate";
  programId: string;
  programName: string;
  requirement: string;
};

export type CourseRequirementIndex = Map<string, CourseRequirementHit[]>;

type ProgramSource = {
  programType: CourseRequirementHit["programType"];
  progress: Record<string, ProgressLike | undefined>;
  /** Display name for a program id; falls back to the id. */
  nameOf: (id: string) => string | undefined;
};

/**
 * Maps each course on the plan to the requirements it is counting toward.
 *
 * A course counts when the engine marked its option completed or in progress
 * (planned courses arrive as in progress in the Simulator preview). Codes are
 * normalized on both sides so a 3-digit code or a cross-listing still finds
 * its card. Programs keep the order they were given, and one course that fills
 * the same requirement twice is listed once.
 */
export function buildCourseRequirementIndex(
  sources: ProgramSource[],
  normalize: (code: string) => string = normalizeCourseCode,
): CourseRequirementIndex {
  const index: CourseRequirementIndex = new Map();
  for (const { programType, progress, nameOf } of sources) {
    for (const [programId, prog] of Object.entries(progress)) {
      if (!prog) continue;
      const programName = nameOf(programId) ?? programId;
      const requirements = [
        ...prog.completedRequirements,
        ...prog.inProgressRequirements,
        ...prog.remainingRequirements,
      ];
      for (const req of requirements) {
        for (const opt of req.options) {
          if (!opt.completed && !opt.inProgress) continue;
          const key = normalize(opt.code);
          const hits = index.get(key) ?? [];
          const duplicate = hits.some(
            (h) =>
              h.programType === programType &&
              h.programId === programId &&
              h.requirement === req.name,
          );
          if (!duplicate) {
            hits.push({
              programType,
              programId,
              programName,
              requirement: req.name,
            });
            index.set(key, hits);
          }
        }
      }
    }
  }
  return index;
}

/** Requirements a course counts toward, or an empty list. */
export function requirementsForCourse(
  index: CourseRequirementIndex,
  code: string,
  normalize: (code: string) => string = normalizeCourseCode,
): CourseRequirementHit[] {
  return index.get(normalize(code)) ?? [];
}

/** Hits grouped by program, preserving first-seen order, for the tooltip. */
export function groupHitsByProgram(
  hits: CourseRequirementHit[],
): { programType: CourseRequirementHit["programType"]; programId: string; programName: string; requirements: string[] }[] {
  const groups = new Map<
    string,
    {
      programType: CourseRequirementHit["programType"];
      programId: string;
      programName: string;
      requirements: string[];
    }
  >();
  for (const hit of hits) {
    const key = `${hit.programType}:${hit.programId}`;
    const group = groups.get(key) ?? {
      programType: hit.programType,
      programId: hit.programId,
      programName: hit.programName,
      requirements: [],
    };
    group.requirements.push(hit.requirement);
    groups.set(key, group);
  }
  return Array.from(groups.values());
}

/** Short accessible label, e.g. "Counts toward 2 requirements in Computer Science, B.S.". */
export function requirementBadgeLabel(hits: CourseRequirementHit[]): string {
  const groups = groupHitsByProgram(hits);
  if (groups.length === 0) return "";
  const parts = groups.map(
    (g) => `${g.programName}: ${g.requirements.join(", ")}`,
  );
  return `Counts toward ${parts.join("; ")}`;
}
