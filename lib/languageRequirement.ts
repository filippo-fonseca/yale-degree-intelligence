import { Course } from "@/lib/types";
import { courseSubject, normalizeCourseCode } from "@/lib/courseCatalog";
import { isCreditDFailCourse } from "@/lib/utils/creditDFail";
import {
  effectiveDistributionals,
  type DistributionalCourseLike,
} from "@/lib/utils/effectiveDistributionals";

export const LANG_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

const LANG_LEVEL_SET = new Set<string>(LANG_LEVELS);

/* -------------------------------------------------------------------------- */
/* ENGL 120 for students schooled in another language                          */
/* -------------------------------------------------------------------------- */

/**
 * ENGL 120 (Reading and Writing the Modern Essay) under its current catalog
 * number. Legacy spellings ("ENGL 120") normalize to this.
 */
export const ENGLISH_LANGUAGE_COURSE = "ENGL 1020";

/**
 * The level the rule tags ENGL 120 with. Any one-course level would do; L5 is
 * used because a single L5 course already satisfies the requirement in the
 * track engine below, so every surface that reads language levels (the
 * Distributionals page, the Simulator tally, the milestone chart) agrees
 * without a special case of its own.
 */
export const ENGLISH_LANGUAGE_LEVEL = "L5";

/** Track key for ENGL 120, kept apart from any other ENGL course. */
export const ENGLISH_LANGUAGE_TRACK = "ENGL 120";

export const isEnglishLanguageCourse = (code: string | null | undefined): boolean =>
  !!code && normalizeCourseCode(code) === ENGLISH_LANGUAGE_COURSE;

/**
 * A student whose secondary school taught primarily in a language other than
 * English may satisfy the language requirement with ENGL 120. When they opt in,
 * ENGL 120 counts toward the language requirement and NOT toward WR, so its
 * tags swap WR (and any stray level) for the language level. Other tags are
 * left alone, and every other course is returned untouched.
 */
export const applyEnglishLanguageRule = (
  code: string,
  tags: string[],
  enabled: boolean,
): string[] => {
  if (!enabled || !isEnglishLanguageCourse(code)) return tags;
  return [
    ...tags.filter((t) => t !== "WR" && !LANG_LEVEL_SET.has(t)),
    ENGLISH_LANGUAGE_LEVEL,
  ];
};

/**
 * The rule applied to a list of courses, for the shared distributional
 * computations. Matching courses come back as copies with their effective tags
 * rewritten; nothing is persisted, so the stored tags (and the tag editors that
 * read them) never see the swap. With the rule off the same array is returned,
 * so memoized callers do not recompute.
 */
export function withEnglishLanguageRule<T extends DistributionalCourseLike>(
  courses: T[],
  enabled: boolean,
): T[] {
  if (!enabled || !courses?.some((c) => isEnglishLanguageCourse(c?.code))) {
    return courses;
  }
  return courses.map((c) =>
    isEnglishLanguageCourse(c?.code)
      ? {
          ...c,
          distributionals: applyEnglishLanguageRule(
            c.code,
            effectiveDistributionals(c),
            true,
          ),
        }
      : c,
  );
}

/**
 * Display names for the subject codes Yale teaches languages under. Only used
 * for labelling a track; an unknown code just shows as itself.
 */
export const LANGUAGE_SUBJECT_NAMES: Record<string, string> = {
  AFKN: "Afrikaans",
  AKKD: "Akkadian",
  ARBC: "Arabic",
  ARMN: "Armenian",
  ASL: "American Sign Language",
  BNGL: "Bengali",
  BURM: "Burmese",
  CHNS: "Chinese",
  CTLN: "Catalan",
  CZEC: "Czech",
  DUTC: "Dutch",
  EGYP: "Egyptian",
  FNSH: "Finnish",
  FREN: "French",
  GMAN: "German",
  GREK: "Ancient Greek",
  HAUS: "Hausa",
  HEBR: "Hebrew",
  HGRN: "Hungarian",
  HNDI: "Hindi",
  INDN: "Indonesian",
  ITAL: "Italian",
  JAPN: "Japanese",
  KHMR: "Khmer",
  KREN: "Korean",
  LATN: "Latin",
  MGRK: "Modern Greek",
  MTBT: "Modern Tibetan",
  NHTL: "Nahuatl",
  NPLI: "Nepali",
  OTTM: "Ottoman",
  PERS: "Persian",
  PLSH: "Polish",
  PNJB: "Punjabi",
  PORT: "Portuguese",
  ROMN: "Romanian",
  RUSS: "Russian",
  SBCR: "Serbian & Croatian",
  SKRT: "Sanskrit",
  SNHL: "Sinhala",
  SPAN: "Spanish",
  SWAH: "Kiswahili",
  SWED: "Swedish",
  TAML: "Tamil",
  TBTN: "Tibetan",
  TKSH: "Turkish",
  TWI: "Twi",
  UKRN: "Ukrainian",
  VIET: "Vietnamese",
  WLOF: "Wolof",
  YDSH: "Yiddish",
  YORU: "Yoruba",
  ZULU: "Zulu",
};

/**
 * Levels Yale asks for given the level a student places into, per the YCPS
 * language requirement: L1 placement means the L1-L3 sequence, L2 means L2-L4,
 * L3 means L3-L4, and an L4 or L5 placement is satisfied by that one course.
 */
export const requiredLevelsForPlacement = (placement: number): string[] => {
  switch (placement) {
    case 1:
      return ["L1", "L2", "L3"];
    case 2:
      return ["L2", "L3", "L4"];
    case 3:
      return ["L3", "L4"];
    case 4:
      return ["L4"];
    case 5:
      return ["L5"];
    default:
      return [];
  }
};

/**
 * One language a student has tagged courses in. The requirement is satisfied
 * within a single language, so placement and progress are always computed per
 * track: starting Russian at L1 after finishing French at L5 does not drag the
 * French placement back down to L1.
 */
export type LanguageTrack = {
  /** Subject prefix of the courses in the track, e.g. "FREN". */
  subject: string;
  /** Friendly name when the catalog knows one ("French"), else the subject. */
  label: string;
  /** Courses that count toward each level. Credit/D/Fail courses never do. */
  coursesByLevel: Record<string, Course[]>;
  /**
   * Courses tagged for a level but taken Credit/D/Fail. They do not complete
   * the level, yet they still show where the student started, so they shape
   * the inferred placement and stay visible as "not counting".
   */
  creditDFailByLevel: Record<string, Course[]>;
  taggedLevels: string[];
  /** Lowest level tagged in this language, which we read as the placement. */
  placement: number;
  requiredLevels: string[];
  completedRequired: string[];
  progress: number;
  isComplete: boolean;
  nextNeeded: string | null;
  /** True for the ENGL 120 track, which satisfies the requirement on its own. */
  viaEnglish: boolean;
};

const UNKNOWN_SUBJECT = "__other__";

/**
 * Groups every tagged L1-L5 course by language and scores each language on its
 * own. The returned list is ordered best-first: a completed language comes
 * first, then the furthest-along one, so callers that only want a single answer
 * ("is the language requirement done?") can read tracks[0].
 *
 * A course taken Credit/D/Fail never completes a level (Yale bars Cr/D/F from
 * every distributional requirement), but it still counts as evidence of the
 * placement: someone who took L1 Credit/D/Fail placed into L1, and reading
 * their placement as L2 would shrink what they still owe.
 */
export const buildLanguageTracks = (
  distMap: Record<string, Course[]>,
): LanguageTrack[] => {
  const bySubject = new Map<
    string,
    { counting: Record<string, Course[]>; crdf: Record<string, Course[]> }
  >();

  LANG_LEVELS.forEach((level) => {
    (distMap[level] || []).forEach((course) => {
      const subject = isEnglishLanguageCourse(course.code)
        ? ENGLISH_LANGUAGE_TRACK
        : courseSubject(course.code) || UNKNOWN_SUBJECT;
      const entry = bySubject.get(subject) || { counting: {}, crdf: {} };
      const bucket = isCreditDFailCourse(course) ? entry.crdf : entry.counting;
      bucket[level] = [...(bucket[level] || []), course];
      bySubject.set(subject, entry);
    });
  });

  const tracks: LanguageTrack[] = [];

  bySubject.forEach(({ counting: coursesByLevel, crdf }, subject) => {
    const taggedLevels = LANG_LEVELS.filter(
      (l) =>
        (coursesByLevel[l] || []).length > 0 || (crdf[l] || []).length > 0,
    );
    if (taggedLevels.length === 0) return;

    const placement = Math.min(
      ...taggedLevels.map((l) => parseInt(l.slice(1), 10)),
    );
    const requiredLevels = requiredLevelsForPlacement(placement);
    const completedRequired = requiredLevels.filter(
      (l) => (coursesByLevel[l] || []).length > 0,
    );

    const viaEnglish = subject === ENGLISH_LANGUAGE_TRACK;

    tracks.push({
      subject,
      label:
        subject === UNKNOWN_SUBJECT
          ? "Language"
          : viaEnglish
          ? "English (ENGL 120)"
          : LANGUAGE_SUBJECT_NAMES[subject] || subject,
      coursesByLevel,
      creditDFailByLevel: crdf,
      taggedLevels: [...taggedLevels],
      placement,
      requiredLevels,
      completedRequired,
      progress:
        requiredLevels.length > 0
          ? completedRequired.length / requiredLevels.length
          : 0,
      isComplete:
        requiredLevels.length > 0 &&
        completedRequired.length === requiredLevels.length,
      nextNeeded:
        requiredLevels.find((l) => (coursesByLevel[l] || []).length === 0) ||
        null,
      viaEnglish,
    });
  });

  return tracks.sort((a, b) => {
    if (a.isComplete !== b.isComplete) return a.isComplete ? -1 : 1;
    if (a.progress !== b.progress) return b.progress - a.progress;
    if (a.placement !== b.placement) return b.placement - a.placement;
    return a.label.localeCompare(b.label);
  });
};

/** The language that best satisfies the requirement, or null if none tagged. */
export const primaryLanguageTrack = (
  distMap: Record<string, Course[]>,
): LanguageTrack | null => buildLanguageTracks(distMap)[0] || null;
