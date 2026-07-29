import { Course } from "@/lib/types";
import { courseSubject } from "@/lib/courseCatalog";

export const LANG_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

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
  coursesByLevel: Record<string, Course[]>;
  taggedLevels: string[];
  /** Lowest level tagged in this language, which we read as the placement. */
  placement: number;
  requiredLevels: string[];
  completedRequired: string[];
  progress: number;
  isComplete: boolean;
  nextNeeded: string | null;
};

const UNKNOWN_SUBJECT = "__other__";

/**
 * Groups every tagged L1-L5 course by language and scores each language on its
 * own. The returned list is ordered best-first: a completed language comes
 * first, then the furthest-along one, so callers that only want a single answer
 * ("is the language requirement done?") can read tracks[0].
 */
export const buildLanguageTracks = (
  distMap: Record<string, Course[]>,
): LanguageTrack[] => {
  const bySubject = new Map<string, Record<string, Course[]>>();

  LANG_LEVELS.forEach((level) => {
    (distMap[level] || []).forEach((course) => {
      const subject = courseSubject(course.code) || UNKNOWN_SUBJECT;
      const levels = bySubject.get(subject) || {};
      levels[level] = [...(levels[level] || []), course];
      bySubject.set(subject, levels);
    });
  });

  const tracks: LanguageTrack[] = [];

  bySubject.forEach((coursesByLevel, subject) => {
    const taggedLevels = LANG_LEVELS.filter(
      (l) => (coursesByLevel[l] || []).length > 0,
    );
    if (taggedLevels.length === 0) return;

    const placement = Math.min(
      ...taggedLevels.map((l) => parseInt(l.slice(1), 10)),
    );
    const requiredLevels = requiredLevelsForPlacement(placement);
    const completedRequired = requiredLevels.filter(
      (l) => (coursesByLevel[l] || []).length > 0,
    );

    tracks.push({
      subject,
      label:
        subject === UNKNOWN_SUBJECT
          ? "Language"
          : LANGUAGE_SUBJECT_NAMES[subject] || subject,
      coursesByLevel,
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
