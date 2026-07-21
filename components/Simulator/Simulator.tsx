"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiChevronUp,
  FiPlus,
  FiTrash2,
  FiCheck,
  FiLock,
} from "react-icons/fi";
import { Info } from "lucide-react";
import { Course } from "@/lib/types";
import { getCourseNameFromCode, getCanonicalCode } from "@/lib/courseCatalog";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import ManualCourseLookupModal from "./ManualCourseLookupModal";
import SimulatorManualAssignModal from "./SimulatorManualAssignModal";
import SimulatorRequirementsBreakdown from "./SimulatorRequirementsBreakdown";
import CourseGradeControl from "./CourseGradeControl";
import CourseDistributionalControl from "./CourseDistributionalControl";
import SimulatorProgressPane from "./SimulatorProgressPane";
import { type SimulatorView } from "./SimulatorViewSwitcher";
import SimulatorToolbarRow from "./SimulatorToolbarRow";
import { type QuickSaveState } from "./SimulatorQuickSave";
import SimulatorCanvasActions from "./SimulatorCanvasActions";
import SimulatorPlansModal from "./SimulatorPlansModal";
import type { Plan, Semester } from "./planTypes";
import {
  calculatePreviewMajorProgressByMajors,
  MajorProgress,
  ManualRequirementEntry,
  majorRequirements,
} from "@/lib/majors";
import {
  calculatePreviewCertificateProgressByCertificates,
  certificateRequirements,
  type CertificateProgress,
} from "@/lib/certificates";
import type { GPAEntry } from "@/lib/gpa";
import { allocateDistributionals } from "@/lib/distributionalAllocation";
import {
  compareTermNames,
  isCurrentTerm,
  isPastTerm,
} from "@/lib/academicTerm";
import {
  blockedCodesFromViolations,
  buildProgramClaimContext,
  filterCertificateManualEntries,
  getMajorBlockedCodes,
  settleAllocations,
  type ProgramClaimOptions,
} from "@/lib/utils/programClaims";
import {
  evaluatePlannedCourseAdmission,
  type SlotRefusal,
} from "@/lib/utils/plannedCourseAdmission";
import PlannedCourseBlockedModal from "./PlannedCourseBlockedModal";
import type { Allocation } from "@/lib/certificatePolicy";

/**
 * The sticky "Quick-add: Pool of remaining courses from your major" card is
 * hidden for clarity: it sat between the toolbar and the grid, ate vertical
 * room, and gave a second way to do what the per-semester Add button and the
 * assign modal already do. Every other add path is untouched, and so is
 * dragging a course from one semester to another.
 *
 * Flip this back to true to restore it. Nothing was deleted: the pool card,
 * the tap-to-place flow it feeds (select a pool course, then tap a semester),
 * and its tour anchor all still compile and read this one flag. The pool's
 * data (availableCourses) keeps being computed either way, because the
 * remove-from-semester path puts courses back into it and the plan load /
 * reset paths rebuild it.
 */
const SHOW_QUICK_ADD_POOL = false;

// ----------------- Types -----------------
// `Semester` and `Plan` live in ./planTypes so the plan chrome components can
// share them without importing this module back into its own children.

interface SimulatorProps {
  remainingCourses: Course[];
  completedCourses: Course[];
  graduationYear: number;
  userMajors: string[];
  userCertificates?: string[];
  /** Permanent manual fulfillments from Firebase, filtered to major_id only. */
  majorPermanentManuals?: ManualRequirementEntry[];
  /** Permanent manual fulfillments from Firebase, filtered to certificate_id only. */
  certificatePermanentManuals?: ManualRequirementEntry[];
  /** Lets the dashboard ask the simulator to confirm before navigating away. */
  onRegisterNavCheck?: (fn: ((cb: () => void) => void) | null) => void;
}

type PreviewProgressMap = Record<string, MajorProgress>;
type CertificatePreviewProgressMap = Record<string, CertificateProgress>;

type MatchedRequirement = {
  programType: "major" | "certificate";
  programId: string;
  programName: string;
  requirementName: string;
};

function collectRequirementOptionCodes(
  requirements: { options: Array<{ type: string; code?: string; options?: string[] }> }[],
): Set<string> {
  const codes = new Set<string>();
  for (const req of requirements) {
    for (const opt of req.options) {
      if (opt.type === "course" && opt.code) {
        codes.add(opt.code);
        const canon = getCanonicalCode(opt.code);
        if (canon) codes.add(canon);
      } else if (opt.type === "group" && opt.options) {
        for (const code of opt.options) {
          codes.add(code);
          const canon = getCanonicalCode(code);
          if (canon) codes.add(canon);
        }
      }
    }
  }
  return codes;
}

function courseMatchesOptionCodes(
  courseCode: string,
  optionCodes: Set<string>,
): boolean {
  const canon = getCanonicalCode(courseCode) || courseCode;
  return optionCodes.has(courseCode) || optionCodes.has(canon);
}

function findMatchedRequirements(
  courseCode: string,
  majorIds: string[],
  certificateIds: string[],
): MatchedRequirement[] {
  const matches: MatchedRequirement[] = [];
  const canon = getCanonicalCode(courseCode) || courseCode;

  for (const majorId of majorIds) {
    const major = majorRequirements[majorId];
    if (!major) continue;

    for (const req of major.requirements) {
      let found = false;
      for (const opt of req.options) {
        if (opt.type === "course") {
          const optCanon = getCanonicalCode(opt.code) || opt.code;
          if (
            opt.code === courseCode ||
            opt.code === canon ||
            optCanon === courseCode ||
            optCanon === canon
          ) {
            found = true;
            break;
          }
        } else if (opt.type === "group") {
          for (const code of (opt as { type: "group"; options: string[] })
            .options) {
            const codeCanon = getCanonicalCode(code) || code;
            if (
              code === courseCode ||
              code === canon ||
              codeCanon === courseCode ||
              codeCanon === canon
            ) {
              found = true;
              break;
            }
          }
        }
        if (found) break;
      }
      if (found) {
        matches.push({
          programType: "major",
          programId: majorId,
          programName: major.name,
          requirementName: req.name,
        });
      }
    }
  }

  for (const certId of certificateIds) {
    const cert = certificateRequirements[certId];
    if (!cert) continue;

    for (const req of cert.requirements) {
      const optionCodes = collectRequirementOptionCodes([req]);
      if (courseMatchesOptionCodes(courseCode, optionCodes)) {
        matches.push({
          programType: "certificate",
          programId: certId,
          programName: cert.name,
          requirementName: req.name,
        });
      }
    }
  }

  return matches;
}

/**
 * Everything the policy engine needs to judge a plan.
 *
 * Plan-scoped assignments live only in simulator state, so they reach the
 * engine as extra allocations: the preview, the assign modal, and the
 * requirements breakdown then all rest on the same picture the student is
 * looking at, and none of them has to work out policy on its own.
 *
 * Planned courses that auto-match a major become major allocations, because
 * auto-matching prefers majors. The ones that only match a certificate are
 * returned separately: they cannot count toward a major at all, which is a
 * blocked code rather than an allocation.
 */
function buildSimulatorPolicyInputs(
  majorIds: string[],
  certificateIds: string[],
  simulatorManualReqs: ManualRequirementEntry[],
  plannedCodes: string[],
): {
  policyOptions: ProgramClaimOptions;
  majorManuals: ManualRequirementEntry[];
  certificateManuals: ManualRequirementEntry[];
  certificateOnlyPlannedCodes: string[];
} {
  const majorManuals = simulatorManualReqs.filter(
    (m) => m.programType === "major" || !m.programType,
  );
  const certificateManuals = simulatorManualReqs.filter(
    (m) => m.programType === "certificate",
  );

  // Prefer majors for auto-matched planned courses that hit both catalogs.
  // Explicit certificate assignment still wins via certificateManuals.
  const certAssignedCodes = new Set(
    certificateManuals.map((m) => getCanonicalCode(m.code) || m.code),
  );
  const majorAssignedCodes = new Set(
    majorManuals.map((m) => getCanonicalCode(m.code) || m.code),
  );
  const plannedAutoMajorAllocations: Allocation[] = [];
  const certificateOnlyPlannedCodes: string[] = [];
  for (const code of plannedCodes) {
    const canon = getCanonicalCode(code) || code;
    if (certAssignedCodes.has(canon) || majorAssignedCodes.has(canon)) continue;
    const matches = findMatchedRequirements(code, majorIds, certificateIds);
    const majorMatch = matches.find((m) => m.programType === "major");
    const certMatch = matches.find((m) => m.programType === "certificate");
    if (majorMatch) {
      plannedAutoMajorAllocations.push({
        courseCode: canon,
        program: { type: "major", id: majorMatch.programId },
        requirementTitle: majorMatch.requirementName,
      });
    } else if (certMatch) {
      certificateOnlyPlannedCodes.push(canon);
    }
  }

  return {
    policyOptions: {
      majorIds,
      certificateIds,
      extraAllocations: [
        ...majorManuals.map((m) => ({
          courseCode: m.code,
          program: {
            type: "major" as const,
            id: m.programId ?? majorIds[0] ?? "",
          },
          requirementTitle: m.requirement,
        })),
        ...certificateManuals.map((m) => ({
          courseCode: m.code,
          program: {
            type: "certificate" as const,
            id: m.programId ?? certificateIds[0] ?? "",
          },
          requirementTitle: m.requirement,
        })),
        ...plannedAutoMajorAllocations,
      ],
    },
    majorManuals,
    certificateManuals,
    certificateOnlyPlannedCodes,
  };
}

type PlannedCoursePick = Pick<Course, "code" | "status"> & {
  status: "in-progress"; // coerced for preview semantics
};

type MaybeCreditFields = Partial<{
  credits: number | string;
  credit: number | string;
  units: number | string;
  yaleCredits: number | string;
  ECTS: number | string;
}>;

// ----------------- Helpers -----------------
const getCourseCredits = (c: Course & MaybeCreditFields): number => {
  const raw = c.credits ?? c.credit ?? c.units ?? c.yaleCredits ?? c.ECTS;

  const n =
    typeof raw === "string"
      ? parseFloat(raw)
      : typeof raw === "number"
        ? raw
        : NaN;

  return Number.isFinite(n) ? (n as number) : 1; // default to 1 if missing
};

const getSemesterCredits = (sem: Semester): number =>
  sem.courses.reduce(
    (sum, c) => sum + getCourseCredits(c as Course & MaybeCreditFields),
    0,
  );

const compareSemesters = compareTermNames;

// A semester is locked once it is strictly earlier than the calendar's current
// term, so you can't drag courses into a term you already finished. The month
// math lives in lib/academicTerm.ts; the editability rule is unchanged (Spring
// locks on June 1, Fall locks on January 1).
function isPastSemester(semesterName: string) {
  return isPastTerm(semesterName);
}

// The current term comes from the calendar, never from stored course status.
// A transcript that still lists spring courses as in-progress does not keep
// Spring current once June arrives.
function isCurrentSemester(semesterName: string) {
  return isCurrentTerm(semesterName);
}

// Which of the two predominant views the student was last on. Kept in
// localStorage so a refresh lands them back where they were.
const ACTIVE_VIEW_STORAGE_KEY = "simulatorActiveView";

// ----------------- Component -----------------
export default function Simulator({
  remainingCourses,
  completedCourses,
  graduationYear,
  userMajors,
  userCertificates = [],
  majorPermanentManuals,
  certificatePermanentManuals,
  onRegisterNavCheck,
}: SimulatorProps) {
  const { user } = useAuth();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [dragSourceSemester, setDragSourceSemester] = useState<string | null>(
    null,
  );
  const [showHelp, setShowHelp] = useState(false);
  const [savedPlans, setSavedPlans] = useState<Plan[]>([]);
  const [planName, setPlanName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [hoveredSemester, setHoveredSemester] = useState<string | null>(null);
  const [lookupSemesterId, setLookupSemesterId] = useState<string | null>(null);
  const [selectedPlanToOverwrite, setSelectedPlanToOverwrite] = useState<
    number | null
  >(null);
  const [hasChanges, setHasChanges] = useState(false);
  // The header quick save's own transient state, so the button can confirm
  // ("Saved") for a beat after hasChanges has already cleared.
  const [quickSaveState, setQuickSaveState] = useState<QuickSaveState>("idle");
  const [showPool, setShowPool] = useState(false);
  const [showMajorPreview, setShowMajorPreview] = useState(true);
  // Optional, independently-toggled live add-ons (both OFF by default).
  const [showDistributionals, setShowDistributionals] = useState(false);
  const [showGrades, setShowGrades] = useState(false);
  // Plan selector modal shown on initial load
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  // Track currently loaded plan
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);
  // Track scroll state for sticky nav background
  const [isScrolled, setIsScrolled] = useState(false);
  // Canvas (build the plan) vs Progress (read the results). Canvas is the
  // default; the stored preference is applied on mount so SSR stays stable.
  const [activeView, setActiveView] = useState<SimulatorView>("canvas");
  // The toolbar grows and shrinks with the view and the viewport, so the pool
  // below it parks itself against the measured height instead of a magic number.
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const [toolbarHeight, setToolbarHeight] = useState(72);

  // Simulator-local manual requirements (plan-scoped, NOT in Firebase courses)
  const [simulatorManualReqs, setSimulatorManualReqs] = useState<
    ManualRequirementEntry[]
  >([]);
  // Manual assignment modal state
  // Mobile-friendly tap-to-place: select a pool course, then tap a semester
  const [selectedPoolCourse, setSelectedPoolCourse] = useState<Course | null>(
    null,
  );
  const [manualAssignPending, setManualAssignPending] = useState<{
    course: Course;
    semesterId: string;
  } | null>(null);
  // A pool course the engine refused everywhere, held for the error modal.
  const [blockedDrop, setBlockedDrop] = useState<{
    courseCode: string;
    refusals: SlotRefusal[];
  } | null>(null);

  // Preview state
  const [previewProgress, setPreviewProgress] = useState<PreviewProgressMap>(
    {},
  );
  const [certificatePreviewProgress, setCertificatePreviewProgress] =
    useState<CertificatePreviewProgressMap>({});
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Profile distributional preferences (mirrors the users/{uid} doc fields the
  // main DistributionalProgress reads); used to seed the sim from real courses.
  const [distribAutoAllocate, setDistribAutoAllocate] = useState(true);
  const [distribOverrides, setDistribOverrides] = useState<
    Record<string, string>
  >({});

  // keep initial snapshot to detect changes
  const initialSemestersRef = useRef<Semester[]>([]);
  const initialManualReqsRef = useRef<ManualRequirementEntry[]>([]);
  const initialTogglesRef = useRef<{ dist: boolean; grades: boolean }>({
    dist: false,
    grades: false,
  });
  // True once a saved plan has been loaded, so the blank-grid rebuild effect
  // does not clobber the loaded plan when remaining/completed courses change.
  const planLoadedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const hasChangesRef = useRef(false);
  const currentPlanNameRef = useRef<string | null>(null);
  // Holds the "Saved" confirmation on screen, and the always-current quick save
  // action the Cmd+S listener calls (the listener is bound once).
  const quickSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const quickSaveShortcutRef = useRef<() => void>(() => {});

  // majors / certificates to compute
  const majorIds = useMemo<string[]>(() => userMajors, [userMajors]);
  const certificateIds = useMemo<string[]>(
    () => userCertificates,
    [userCertificates],
  );

  const majorPermanentManualsResolved = useMemo<ManualRequirementEntry[]>(
    () =>
      majorPermanentManuals ??
      completedCourses.flatMap((course) =>
        (course.manualRequirementsFulfilled || [])
          .filter(
            (m) =>
              m.major_id &&
              !m.certificate_id &&
              majorIds.includes(m.major_id),
          )
          .map((m) => ({
            code: course.code,
            requirement: m.requirement_title,
            credits: course.credits || 1,
            programType: "major" as const,
            programId: m.major_id,
          })),
      ),
    [majorPermanentManuals, completedCourses, majorIds],
  );

  const certificatePermanentManualsResolved = useMemo<ManualRequirementEntry[]>(
    () =>
      certificatePermanentManuals ??
      completedCourses.flatMap((course) =>
        (course.manualRequirementsFulfilled || [])
          .filter(
            (m) =>
              m.certificate_id && certificateIds.includes(m.certificate_id),
          )
          .map((m) => ({
            code: course.code,
            requirement: m.requirement_title,
            credits: course.credits || 1,
            programType: "certificate" as const,
            programId: m.certificate_id,
          })),
      ),
    [certificatePermanentManuals, completedCourses, certificateIds],
  );

  // Index of the currently-loaded plan within savedPlans (matched by name), or -1.
  const loadedPlanIndex = useMemo(
    () =>
      currentPlanName === null
        ? -1
        : savedPlans.findIndex((p) => p.name === currentPlanName),
    [currentPlanName, savedPlans],
  );
  const loadedPlanIsDefault =
    loadedPlanIndex >= 0 && !!savedPlans[loadedPlanIndex]?.isDefault;

  // Auto-detect: does a course code appear in any major or certificate requirement?
  const isCourseInAnyRequirement = useMemo(() => {
    const allOptionCodes = new Set<string>();

    for (const majorId of majorIds) {
      const major = majorRequirements[majorId];
      if (!major) continue;
      for (const code of Array.from(
        collectRequirementOptionCodes(major.requirements),
      )) {
        allOptionCodes.add(code);
      }
    }

    for (const certId of certificateIds) {
      const cert = certificateRequirements[certId];
      if (!cert) continue;
      for (const code of Array.from(
        collectRequirementOptionCodes(cert.requirements),
      )) {
        allOptionCodes.add(code);
      }
    }

    return (courseCode: string): boolean =>
      courseMatchesOptionCodes(courseCode, allOptionCodes);
  }, [majorIds, certificateIds]);

  // Show toast for auto-matched course
  const showAutoMatchToast = (courseCode: string) => {
    const matches = findMatchedRequirements(
      courseCode,
      majorIds,
      certificateIds,
    );
    if (matches.length === 0) return;

    const firstMatch = matches[0];
    const programLabel =
      firstMatch.programType === "certificate"
        ? `certificate: ${firstMatch.programName}`
        : firstMatch.programName;

    if (matches.length === 1) {
      toast.success(
        `Auto-detected match: "${firstMatch.requirementName}" (${programLabel})`,
        { duration: 3000 },
      );
    } else {
      toast.success(
        `Auto-detected match: "${firstMatch.requirementName}" (${programLabel}) +${matches.length - 1} more`,
        { duration: 3000 },
      );
    }
  };

  // The dashboard calls this before switching tabs so an unsaved plan is not
  // silently thrown away.
  useEffect(() => {
    if (!onRegisterNavCheck) return;
    onRegisterNavCheck((proceed) => {
      if (hasChanges) {
        if (
          window.confirm(
            "You have unsaved simulator changes. Leave without saving?",
          )
        ) {
          proceed();
        }
      } else {
        proceed();
      }
    });
    return () => onRegisterNavCheck(null);
  }, [onRegisterNavCheck, hasChanges]);

  const confirmDiscardChanges = (message: string): boolean => {
    if (!hasChanges) return true;
    return window.confirm(message);
  };

  useEffect(() => {
    hasChangesRef.current = hasChanges;
  }, [hasChanges]);

  useEffect(() => {
    currentPlanNameRef.current = currentPlanName;
  }, [currentPlanName]);

  // ------------ Build initial semesters & pools ------------
  useEffect(() => {
    // Don't rebuild the blank grid on top of a loaded or dirty plan when
    // remaining/completed courses settle or refresh.
    if (
      hasInitializedRef.current &&
      (hasChangesRef.current ||
        currentPlanNameRef.current !== null ||
        planLoadedRef.current)
    ) {
      return;
    }
    // 1) Build semester list starting from earliest known term or grad - 4y
    let semestersArr: Semester[] = [];
    let startYear = graduationYear - 4;
    let startSemester: "Fall" | "Spring" = "Fall";

    if (completedCourses.length > 0) {
      const minYear = Math.min(...completedCourses.map((c) => c.year));
      const coursesInMinYear = completedCourses.filter(
        (c) => c.year === minYear,
      );
      const minSem: "Fall" | "Spring" = coursesInMinYear.some(
        (c) => c.semester === "Spring",
      )
        ? "Spring"
        : "Fall";
      startYear = minYear;
      startSemester = minSem;
    }

    let year = startYear;
    let semester: "Fall" | "Spring" = startSemester;
    while (
      year < graduationYear ||
      (year === graduationYear && semester === "Spring")
    ) {
      semestersArr.push({
        id: `${semester}-${year}`,
        name: `${semester} ${year}`,
        courses: [],
      });
      if (semester === "Fall") {
        semester = "Spring";
        year++;
      } else {
        semester = "Fall";
      }
    }

    // 2) Assign completed/in-progress courses to their terms
    completedCourses.forEach((course) => {
      const idx = semestersArr.findIndex(
        (s) => s.name === `${course.semester} ${course.year}`,
      );
      if (idx !== -1) {
        semestersArr[idx].courses.push(course);
      }
    });

    setSemesters(semestersArr);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(semestersArr),
    ) as Semester[];
    initialManualReqsRef.current = [];

    // 3) Build pool of available (not-taken & not already taken)
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken",
      ),
    );
    hasInitializedRef.current = true;
  }, [graduationYear, remainingCourses, completedCourses]);

  // ------------ Change detection ------------
  useEffect(() => {
    if (initialSemestersRef.current.length === 0) return;

    // Placement key folds semester, code, projected grade, and (order-insensitive)
    // distributionals so edits to any of those enable "Save Current".
    const placementKey = (s: Semester, c: Course) =>
      `${s.id}:${c.code}:${c.grade ?? ""}:${[...(c.distributionals ?? [])]
        .sort()
        .join("+")}`;

    // Create a set of placements to detect both additions/deletions AND moves
    const currentPlacements = new Set(
      semesters.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken") // Only track planned courses
          .map((c) => placementKey(s, c)),
      ),
    );
    const initialPlacements = new Set(
      initialSemestersRef.current.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken")
          .map((c) => placementKey(s, c)),
      ),
    );

    // Check if sets are different (different size or different contents)
    const placementsChanged =
      currentPlacements.size !== initialPlacements.size ||
      Array.from(currentPlacements).some((p) => !initialPlacements.has(p)) ||
      Array.from(initialPlacements).some((p) => !currentPlacements.has(p));

    // Compare manual requirements
    const currentManualReqsStr = JSON.stringify(simulatorManualReqs);
    const initialManualReqsStr = JSON.stringify(initialManualReqsRef.current);
    const manualReqsChanged = currentManualReqsStr !== initialManualReqsStr;

    // Compare add-on toggles against the loaded-plan snapshot
    const togglesChanged =
      showDistributionals !== initialTogglesRef.current.dist ||
      showGrades !== initialTogglesRef.current.grades;

    const changed = placementsChanged || manualReqsChanged || togglesChanged;

    setHasChanges(changed);
  }, [semesters, simulatorManualReqs, showDistributionals, showGrades]);

  // ------------ Saved plans load ------------
  useEffect(() => {
    if (!user) return;
    const loadSavedPlans = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists()
          ? (docSnap.data() as {
              savedPlans?: Plan[];
              distributionalAutoAllocate?: boolean;
              distributionalAllocations?: Record<string, string>;
            })
          : null;
        // Seed the simulator's distributional base from the user's profile prefs.
        setDistribAutoAllocate(data?.distributionalAutoAllocate ?? true);
        setDistribOverrides(data?.distributionalAllocations ?? {});
        let plans = data?.savedPlans ?? [];
        if (plans.length > 0) {
          // Migrate existing users: if no default is set, the newest becomes default.
          if (!plans.some((p) => p.isDefault)) {
            const newestName = [...plans].sort((a, b) =>
              (b.createdAt || "").localeCompare(a.createdAt || ""),
            )[0]?.name;
            plans = plans.map((p) => ({
              ...p,
              isDefault: p.name === newestName,
            }));
            await setDoc(docRef, { savedPlans: plans }, { merge: true });
          }
          setSavedPlans(plans);
          // Auto-load the most-recently-viewed plan (localStorage), else default.
          let recentName: string | null = null;
          try {
            recentName = window.localStorage.getItem(
              `di-sim-recent-${user.uid}`,
            );
          } catch {
            // ignore
          }
          const newest = [...plans].sort((a, b) =>
            (b.createdAt || "").localeCompare(a.createdAt || ""),
          )[0];
          const toLoad =
            plans.find((p) => p.name === recentName) ||
            plans.find((p) => p.isDefault) ||
            newest;
          if (toLoad) loadPlanData(toLoad);
        } else {
          // Brand-new user with no plans → show the welcome modal.
          setShowPlanSelector(true);
        }
        setPlansLoaded(true);
      } catch (e) {
        console.error("Error loading saved plans:", e);
        setPlansLoaded(true);
      }
    };
    loadSavedPlans();
  }, [user]);

  // ------------ Keyboard handler for modals ------------
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showPlanSelector) setShowPlanSelector(false);
        if (showSaveModal) {
          setShowSaveModal(false);
          setSelectedPlanToOverwrite(null);
          setPlanName("");
        }
        if (showPlansModal) setShowPlansModal(false);
        if (blockedDrop) setBlockedDrop(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPlanSelector, showSaveModal, showPlansModal, blockedDrop]);

  // ------------ Cmd+S / Ctrl+S saves the canvas ------------
  // The Simulator only mounts while it is the dashboard's active tab, so this
  // listener lives and dies with the tab and never fires from anywhere else.
  // The browser's own save dialog is always swallowed here, even when there is
  // nothing to save: offering to write the page to disk is never what the
  // shortcut meant on this screen. Bound once; the work is read off a ref so
  // the handler cannot go stale.
  useEffect(() => {
    const handleSaveShortcut = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      if (e.key.toLowerCase() !== "s") return;
      e.preventDefault();
      quickSaveShortcutRef.current();
    };
    window.addEventListener("keydown", handleSaveShortcut);
    return () => window.removeEventListener("keydown", handleSaveShortcut);
  }, []);

  // ------------ Scroll detection for sticky nav ------------
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // ------------ Canvas / Progress view preference ------------
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACTIVE_VIEW_STORAGE_KEY);
      if (stored === "canvas" || stored === "progress") {
        setActiveView(stored);
      }
    } catch {
      // Private mode or blocked storage: Canvas is a fine default.
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(ACTIVE_VIEW_STORAGE_KEY, activeView);
    } catch {
      // Nothing to do; the choice just will not survive a refresh.
    }
  }, [activeView]);

  // ------------ Sticky toolbar height (drives the pool offset) ------------
  useEffect(() => {
    const el = toolbarRef.current;
    if (!el) return;
    const measure = () => setToolbarHeight(el.offsetHeight);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeView]);

  // ------------ Drag & Drop ------------
  const playPopSound = () => {
    const audio = new Audio("/audio/pop.mp3");
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Ignore errors if audio can't play
  };

  const handleDragStart = (course: Course, sourceSemesterId?: string) => {
    setDraggedCourse(course);
    setDragSourceSemester(sourceSemesterId ?? null);
  };

  /**
   * What the policy engine says about planning this course at all, asked
   * against the claims that survive the audit so a course the engine already
   * took away from a program does not read as still held by it.
   */
  const admitPlannedCourse = (course: Course) => {
    const candidates = findMatchedRequirements(
      course.code,
      majorIds,
      certificateIds,
    ).map((match) => ({
      program: { type: match.programType, id: match.programId },
      requirementTitle: match.requirementName,
    }));
    const context = buildProgramClaimContext(completedCourses, policyOptions);
    return evaluatePlannedCourseAdmission({
      courseCode: course.code,
      candidates,
      existing: settleAllocations(context),
      majorIds: context.majorIds,
      certificateIds: context.certificateIds,
      grade: course.grade,
    });
  };

  // Tap-to-place path for touch devices. Runs the same admission check the
  // pool drop does, so the policy engine still has the last word.
  const placeCourseInSemester = (course: Course, semesterId: string) => {
    const isDuplicate = semesters.some((s) =>
      s.courses.some((c) => c.code === course.code),
    );
    if (isDuplicate) {
      toast.error("This course is already on your plan.");
      return;
    }

    const admission = admitPlannedCourse(course);
    if (!admission.admitted) {
      setBlockedDrop({
        courseCode: course.code,
        refusals: admission.refusals,
      });
      setSelectedPoolCourse(null);
      return;
    }

    playPopSound();

    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? sem.courses.some((c) => c.code === course.code)
            ? sem
            : { ...sem, courses: [...sem.courses, course] }
          : sem,
      ),
    );

    setAvailableCourses((prev) => prev.filter((c) => c.code !== course.code));
    setSelectedPoolCourse(null);

    if (!isCourseInAnyRequirement(course.code)) {
      setManualAssignPending({ course, semesterId });
    } else {
      showAutoMatchToast(course.code);
    }
  };

  const handleDrop = (semesterId: string) => {
    if (!draggedCourse) return;

    // Dropping back on the same semester — no-op
    if (dragSourceSemester === semesterId) {
      setDraggedCourse(null);
      setDragSourceSemester(null);
      return;
    }

    // Coming in from the pool, so ask before it lands. A course every program
    // refuses would sit on the grid earning nothing; anything the major still
    // wants goes through and the certificate shows it as not counted. Moves
    // between semesters are already-planned courses and are never re-judged.
    if (!dragSourceSemester) {
      const admission = admitPlannedCourse(draggedCourse);
      if (!admission.admitted) {
        setBlockedDrop({
          courseCode: draggedCourse.code,
          refusals: admission.refusals,
        });
        setDraggedCourse(null);
        setDragSourceSemester(null);
        return;
      }
    }

    // Play pop sound on successful drop
    playPopSound();

    setSemesters((prev) =>
      prev.map((sem) => {
        // Remove from source semester (inter-semester move)
        if (dragSourceSemester && sem.id === dragSourceSemester) {
          return {
            ...sem,
            courses: sem.courses.filter((c) => c.code !== draggedCourse.code),
          };
        }
        // Add to target semester (if not already there)
        if (sem.id === semesterId) {
          return sem.courses.some((c) => c.code === draggedCourse.code)
            ? sem
            : { ...sem, courses: [...sem.courses, draggedCourse] };
        }
        return sem;
      }),
    );

    // Only remove from pool if dragged from pool (not from another semester)
    if (!dragSourceSemester) {
      setAvailableCourses((prev) =>
        prev.filter((c) => c.code !== draggedCourse.code),
      );

      // Auto-detect: prompt manual assignment if not in any requirement
      if (!isCourseInAnyRequirement(draggedCourse.code)) {
        setManualAssignPending({ course: draggedCourse, semesterId });
      } else {
        // Show toast for auto-matched course
        showAutoMatchToast(draggedCourse.code);
      }
    }

    setDraggedCourse(null);
    setDragSourceSemester(null);
  };

  const removeCourseFromSemester = (semesterId: string, courseCode: string) => {
    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? {
              ...sem,
              courses: sem.courses.filter((c) => c && c.code !== courseCode),
            }
          : sem,
      ),
    );

    // Clean up any simulator manual reqs for this course
    setSimulatorManualReqs((prev) => prev.filter((m) => m.code !== courseCode));

    const rc = remainingCourses.find((c) => c.code === courseCode);
    if (rc && rc.status === "not-taken") {
      setAvailableCourses((prev) =>
        prev.some((c) => c.code === rc.code) ? prev : [...prev, rc],
      );
    }
  };

  // Immutable per-course update for the inline grade/distributional controls.
  const updatePlannedCourse = (
    semesterId: string,
    courseCode: string,
    patch: Partial<Pick<Course, "grade" | "distributionals">>,
  ) => {
    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? {
              ...sem,
              courses: sem.courses.map((c) =>
                c.code === courseCode ? { ...c, ...patch } : c,
              ),
            }
          : sem,
      ),
    );
  };

  // ------------ Planned set (for preview) ------------
  const plannedNow = useMemo<PlannedCoursePick[]>(() => {
    const codes = new Set<string>();
    const list: PlannedCoursePick[] = [];
    semesters.forEach((s) => {
      s.courses.forEach((c) => {
        if (c?.code && c.status === "not-taken" && !codes.has(c.code)) {
          codes.add(c.code);
          list.push({ code: c.code, status: "in-progress" });
        }
      });
    });
    return list;
  }, [semesters]);

  const plannedCodes = useMemo<string[]>(
    () => plannedNow.map((c) => c.code),
    [plannedNow],
  );

  // The same engine inputs the preview runs on, handed to the surfaces that
  // render policy so a verdict in the assign modal can never disagree with the
  // numbers in the breakdown.
  const policyOptions = useMemo<ProgramClaimOptions>(
    () =>
      buildSimulatorPolicyInputs(
        majorIds,
        certificateIds,
        simulatorManualReqs,
        plannedCodes,
      ).policyOptions,
    [majorIds, certificateIds, simulatorManualReqs, plannedCodes],
  );

  // ------------ Live add-on derived props (no effects) ------------
  // Chronological, term-keyed GPA timeline: completed transcript courses merged
  // with planned sim courses under a shared `${semester} ${year}` key.
  const gpaTimelineTerms = useMemo<
    { key: string; label: string; completed: GPAEntry[]; planned: GPAEntry[] }[]
  >(() => {
    const byKey = new Map<
      string,
      { completed: GPAEntry[]; planned: GPAEntry[] }
    >();
    const bucket = (key: string) => {
      let b = byKey.get(key);
      if (!b) {
        b = { completed: [], planned: [] };
        byKey.set(key, b);
      }
      return b;
    };

    completedCourses
      .filter((c) => !c.skipped)
      .forEach((c) => {
        bucket(`${c.semester} ${c.year}`).completed.push({
          grade: c.grade ?? null,
          credits: getCourseCredits(c as Course & MaybeCreditFields),
        });
      });

    semesters.forEach((s) => {
      s.courses
        .filter((c) => c.status === "not-taken")
        .forEach((c) => {
          bucket(s.name).planned.push({
            grade: c.grade ?? null,
            credits: getCourseCredits(c as Course & MaybeCreditFields),
          });
        });
    });

    const seasonOrder: Record<string, number> = { Spring: 0, Summer: 1, Fall: 2 };
    return Array.from(byKey.entries())
      .map(([key, v]) => ({ key, label: key, ...v }))
      .sort((a, b) => {
        const [seasonA, yearA] = a.key.split(" ");
        const [seasonB, yearB] = b.key.split(" ");
        const yA = parseInt(yearA, 10);
        const yB = parseInt(yearB, 10);
        if (yA !== yB) return yA - yB;
        return (seasonOrder[seasonA] ?? 0) - (seasonOrder[seasonB] ?? 0);
      });
  }, [completedCourses, semesters]);

  // Distributional assignments across planned courses (one string[] per course).
  const plannedDistAssignments = useMemo<string[][]>(
    () =>
      semesters.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken")
          .map((c) => c.distributionals ?? []),
      ),
    [semesters],
  );

  // The profile base: distributionals already allocated to the student's real
  // courses, using their saved auto/override preference. Single-counted per the
  // same allocation the main DistributionalProgress uses, so the sim builds on
  // real progress instead of starting from zero.
  const completedDistAssignments = useMemo<string[][]>(() => {
    const allocation = allocateDistributionals(completedCourses, {
      auto: distribAutoAllocate,
      overrides: distribOverrides,
    });
    return completedCourses
      .map((c) => {
        const req = allocation.reqByCourseKey[allocation.keyOf(c)];
        return req ? [req] : null;
      })
      .filter((a): a is string[] => a !== null);
  }, [completedCourses, distribAutoAllocate, distribOverrides]);

  // ------------ Live preview progress (local compute) ------------
  useEffect(() => {
    if (!user) {
      setPreviewProgress({});
      setCertificatePreviewProgress({});
      return;
    }

    if (majorIds.length === 0 && certificateIds.length === 0) {
      setPreviewProgress({});
      setCertificatePreviewProgress({});
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);

    const completedCodes = completedCourses.map((c) => c.code);
    const inProgCodes = semesters.flatMap((s) =>
      s.courses.filter((c) => c.status === "in-progress").map((c) => c.code),
    );
    const plannedCodesLocal = plannedCodes;
    const skippedCodes: string[] = [];

    const {
      policyOptions,
      majorManuals: simulatorMajorManuals,
      certificateManuals: simulatorCertificateManuals,
      certificateOnlyPlannedCodes: plannedAutoCertificateOnlyCodes,
    } = buildSimulatorPolicyInputs(
      majorIds,
      certificateIds,
      simulatorManualReqs,
      plannedCodesLocal,
    );
    const claimContext = buildProgramClaimContext(
      completedCourses,
      policyOptions,
    );
    const violationsFor = (certId: string) =>
      claimContext.violations.filter(
        (v) => v.program.type === "certificate" && v.program.id === certId,
      );

    // A certificate-claimed course only keeps a major off it when the
    // certificate permits no overlap at all; the engine works that out. Planned
    // courses that match a certificate and nothing else still cannot count
    // toward a major, so they stay blocked outright.
    const majorBlockedCodes = [
      ...getMajorBlockedCodes(completedCourses, policyOptions),
      ...plannedAutoCertificateOnlyCodes,
    ];

    const majorManualReqs = [
      ...majorPermanentManualsResolved,
      ...simulatorMajorManuals.map((m) => ({ ...m, isPlanned: true })),
    ];
    const certificateManualReqs = [
      ...certificatePermanentManualsResolved,
      ...simulatorCertificateManuals.map((m) => ({ ...m, isPlanned: true })),
    ];

    try {
      if (majorIds.length > 0) {
        const all = calculatePreviewMajorProgressByMajors(
          majorIds,
          completedCodes,
          inProgCodes,
          skippedCodes,
          majorManualReqs,
          plannedCodesLocal,
          majorBlockedCodes,
        );
        setPreviewProgress(all);
      } else {
        setPreviewProgress({});
      }

      if (certificateIds.length > 0) {
        // One call per certificate: blocking is per certificate now, and a
        // single shared blocked list would apply the strictest certificate's
        // rules to all of them.
        const certAll: CertificatePreviewProgressMap = {};
        for (const certId of certificateIds) {
          const violations = violationsFor(certId);
          Object.assign(
            certAll,
            calculatePreviewCertificateProgressByCertificates(
              [certId],
              completedCodes,
              inProgCodes,
              skippedCodes,
              filterCertificateManualEntries(
                certificateManualReqs,
                certId,
                violations,
              ),
              plannedCodesLocal,
              blockedCodesFromViolations(violations),
            ),
          );
        }
        setCertificatePreviewProgress(certAll);
      } else {
        setCertificatePreviewProgress({});
      }
    } catch (batchErr) {
      console.error("[PreviewProgress] batch compute failed:", batchErr);
      const result: PreviewProgressMap = {};
      let successes = 0;

      for (const mid of majorIds) {
        try {
          const one = calculatePreviewMajorProgressByMajors(
            [mid],
            completedCodes,
            inProgCodes,
            skippedCodes,
            majorManualReqs,
            plannedCodesLocal,
            majorBlockedCodes,
          )[mid];

          if (
            one &&
            ((one.completedCredits ?? 0) > 0 || (one.inProgressCredits ?? 0) > 0)
          ) {
            result[mid] = one;
            successes++;
          }
        } catch (perErr) {
          console.error(`[PreviewProgress] failed for major "${mid}":`, perErr);
        }
      }

      const certResult: CertificatePreviewProgressMap = {};
      for (const cid of certificateIds) {
        try {
          const violations = violationsFor(cid);
          const one = calculatePreviewCertificateProgressByCertificates(
            [cid],
            completedCodes,
            inProgCodes,
            skippedCodes,
            filterCertificateManualEntries(
              certificateManualReqs,
              cid,
              violations,
            ),
            plannedCodesLocal,
            blockedCodesFromViolations(violations),
          )[cid];

          if (
            one &&
            ((one.completedCredits ?? 0) > 0 || (one.inProgressCredits ?? 0) > 0)
          ) {
            certResult[cid] = one;
            successes++;
          }
        } catch (perErr) {
          console.error(
            `[PreviewProgress] failed for certificate "${cid}":`,
            perErr,
          );
        }
      }

      setPreviewProgress(result);
      setCertificatePreviewProgress(certResult);

      if (successes === 0) {
        setPreviewError("Could not load simulated progress.");
      }
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    user,
    majorIds,
    certificateIds,
    semesters,
    completedCourses,
    plannedCodes,
    simulatorManualReqs,
    majorPermanentManualsResolved,
    certificatePermanentManualsResolved,
  ]);

  // ------------ Save / Load / Delete Plans ------------

  // Helper to load a plan from Plan object directly
  const loadPlanData = (plan: Plan) => {
    // Mark that a plan is loaded so the blank-grid rebuild effect won't clobber it.
    planLoadedRef.current = true;
    setSemesters(plan.semesters);
    setSimulatorManualReqs(plan.manualRequirements ?? []);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(plan.semesters),
    ) as Semester[];
    initialManualReqsRef.current = JSON.parse(
      JSON.stringify(plan.manualRequirements ?? []),
    ) as ManualRequirementEntry[];

    setShowDistributionals(plan.showDistributionals ?? false);
    setShowGrades(plan.showGrades ?? false);
    initialTogglesRef.current = {
      dist: plan.showDistributionals ?? false,
      grades: plan.showGrades ?? false,
    };

    const usedCodes = new Set<string>();
    plan.semesters.forEach((sem) =>
      sem.courses.forEach((course) => usedCodes.add(course.code)),
    );

    setAvailableCourses(
      remainingCourses.filter(
        (c) =>
          !usedCodes.has(c.code) &&
          !completedCourses.some((cc) => cc.code === c.code),
      ),
    );

    setCurrentPlanName(plan.name);
    setHasChanges(false);
    try {
      if (user)
        window.localStorage.setItem(`di-sim-recent-${user.uid}`, plan.name);
    } catch {
      // ignore
    }
  };

  // The one write path for a plan. The modal and the header's quick save both
  // come through here with an explicit name and overwrite target, so neither
  // can drift from the other. Returns whether the write landed.
  const persistPlan = async (
    name: string,
    overwriteIndex: number | null,
  ): Promise<boolean> => {
    const savedName = name.trim();
    if (!user || !savedName) return false;
    try {
      // First-ever plan auto-becomes the default; overwrites keep their flag.
      const isDefault =
        overwriteIndex !== null
          ? (savedPlans[overwriteIndex]?.isDefault ?? false)
          : savedPlans.length === 0;
      const newPlan: Plan = {
        name: savedName,
        semesters,
        manualRequirements: simulatorManualReqs,
        createdAt: new Date().toISOString(),
        isDefault,
        showDistributionals,
        showGrades,
      };

      const updatedPlans: Plan[] =
        overwriteIndex !== null
          ? savedPlans.map((p, i) => (i === overwriteIndex ? newPlan : p))
          : [...savedPlans, newPlan];

      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true },
      );
      setSavedPlans(updatedPlans);

      // Load the saved plan
      loadPlanData(newPlan);

      toast.success(`Plan "${savedName}" saved!`);
      return true;
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to save plan");
      return false;
    }
  };

  const savePlan = async () => {
    const saved = await persistPlan(planName, selectedPlanToOverwrite);
    if (!saved) return;
    setPlanName("");
    setSelectedPlanToOverwrite(null);
    setShowSaveModal(false);
  };

  // The save flow, opened from either the canvas verb row or the plans modal.
  // It arrives pre-aimed at the plan you are on, so the common case is an
  // overwrite rather than a stray duplicate.
  const openSaveModal = () => {
    if (loadedPlanIndex >= 0) {
      setSelectedPlanToOverwrite(loadedPlanIndex);
      setPlanName(savedPlans[loadedPlanIndex]?.name ?? "");
    } else {
      setSelectedPlanToOverwrite(null);
      setPlanName("");
    }
    setShowPlansModal(false);
    setShowSaveModal(true);
  };

  // One click, no ceremony. On a loaded plan this writes the canvas straight
  // back into it; with nothing loaded there is no name to write to yet, so it
  // falls through to the naming modal exactly as before. Everything that says
  // "save the canvas" in the header, on the grid, or on the keyboard lands
  // here, so the shortcuts and the buttons cannot drift apart.
  const quickSave = async () => {
    if (!user || !hasChanges || quickSaveState === "saving") return;
    if (loadedPlanIndex < 0) {
      openSaveModal();
      return;
    }
    setQuickSaveState("saving");
    const saved = await persistPlan(
      savedPlans[loadedPlanIndex].name,
      loadedPlanIndex,
    );
    if (!saved) {
      // persistPlan already surfaced the failure; drop back to Save so the
      // canvas still reads as unsaved and the click can be retried.
      setQuickSaveState("idle");
      return;
    }
    setQuickSaveState("saved");
    if (quickSaveTimerRef.current) clearTimeout(quickSaveTimerRef.current);
    quickSaveTimerRef.current = setTimeout(
      () => setQuickSaveState("idle"),
      1400,
    );
  };

  useEffect(
    () => () => {
      if (quickSaveTimerRef.current) clearTimeout(quickSaveTimerRef.current);
    },
    [],
  );

  // Refreshed every render so the keydown listener above always runs the
  // current action. A modal already owns the keyboard when it is open.
  useEffect(() => {
    quickSaveShortcutRef.current = () => {
      if (showSaveModal || showPlansModal || showPlanSelector) return;
      void quickSave();
    };
  });

  const loadPlan = (planIndex: number) => {
    if (planIndex < 0 || planIndex >= savedPlans.length) return;
    if (
      !confirmDiscardChanges(
        "You have unsaved changes. Discard them and load this plan?",
      )
    ) {
      return;
    }
    const plan = savedPlans[planIndex];
    loadPlanData(plan);
    setShowPlansModal(false);
  };

  const setDefaultPlan = async (planIndex: number) => {
    if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
    try {
      const updatedPlans = savedPlans.map((p, i) => ({
        ...p,
        isDefault: i === planIndex,
      }));
      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true },
      );
      setSavedPlans(updatedPlans);
      toast.success(`"${savedPlans[planIndex].name}" is now your default plan`);
    } catch (error) {
      console.error("Error setting default plan:", error);
      toast.error("Failed to set default plan");
    }
  };

  const deletePlan = async (planIndex: number) => {
    if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
    const planName = savedPlans[planIndex].name;
    if (
      !window.confirm(`Delete plan "${planName}"? This cannot be undone.`)
    ) {
      return;
    }
    try {
      const updatedPlans = savedPlans.filter((_, i) => i !== planIndex);
      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true },
      );
      setSavedPlans(updatedPlans);
    } catch (e) {
      console.error("Error deleting plan:", e);
    }
  };

  const resetSimulator = () => {
    if (
      !confirmDiscardChanges(
        "You have unsaved changes. Clear the canvas and discard them?",
      )
    ) {
      return;
    }

    const clearedSemesters = semesters.map((sem) => ({
      ...sem,
      courses: sem.courses.filter(
        (c) => c.status === "completed" || c.status === "in-progress",
      ),
    }));

    setSemesters(clearedSemesters);
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken",
      ),
    );
    setSimulatorManualReqs([]);
    setShowDistributionals(false);
    setShowGrades(false);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(clearedSemesters),
    ) as Semester[];
    initialManualReqsRef.current = [];
    initialTogglesRef.current = { dist: false, grades: false };
    setCurrentPlanName(null);
    planLoadedRef.current = false;
    setHasChanges(false);
    setSelectedPoolCourse(null);
  };

  // ----------------- Render -----------------
  return (
    <div
      className="space-y-4 font-louize"
      onDragEnd={() => {
        setDraggedCourse(null);
        setDragSourceSemester(null);
        setHoveredSemester(null);
      }}
    >
      {/* Header */}
      <div className="mb-4">
        <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
          Need to visualize? No problem.
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Your interactive, tailor-made, drag-and-drop Yale degree simulator is
          here.
        </p>
      </div>

      {/* Sticky Toolbar */}
      <div
        ref={toolbarRef}
        className={`sticky top-0 z-30 -mx-4 px-6 py-3 mb-4 backdrop-blur-xl transition-all duration-200 ${
          isScrolled
            ? "bg-white/95 dark:bg-transparent dark:bg-gradient-to-r dark:from-gray-900/95 dark:via-gray-950/95 dark:to-gray-900/95 border-b border-gray-200 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <SimulatorToolbarRow
          view={activeView}
          setView={setActiveView}
          planName={currentPlanName}
          planIsDefault={loadedPlanIsDefault}
          hasChanges={hasChanges}
          planSelectorDisabled={!user}
          onOpenPlans={() => setShowPlansModal(true)}
          showQuickSave={!!user && (hasChanges || quickSaveState !== "idle")}
          quickSaveState={quickSaveState}
          onQuickSave={quickSave}
        />
      </div>

      {activeView === "canvas" ? (
        <>
          {/* Help Panel */}
          <AnimatePresence>
            {showHelp && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.03] dark:to-transparent backdrop-blur-xl rounded-xl border border-gray-200 dark:border-white/[0.06] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.15)]"
              >
                <h4 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                  How to use the simulator
                </h4>
                <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 list-disc list-inside">
                  <li>
                    Use this simulator to plan out your remaining semesters and see
                    fit.
                  </li>
                  {SHOW_QUICK_ADD_POOL && (
                    <li>
                      The pool shows remaining courses in your major; you can also
                      add any course manually.
                    </li>
                  )}
                  <li>
                    Use Add on any semester to put a course in it, and drag a
                    planned course between semesters to move it.
                  </li>
                  <li>
                    Multiple courses per term work fine.
                  </li>
                  <li>
                    Click the trash icon on a course to remove it (if it's not
                    completed/in-progress).
                  </li>
                  <li>
                    Completed/in-progress are pre-assigned and cannot be moved.
                  </li>
                  <li>Save or load plans to explore what-ifs and revisit later.</li>
                </ul>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Available Courses Pool. Hidden behind SHOW_QUICK_ADD_POOL; see
              the flag's comment at the top of this file for why and how to
              bring it back. */}
          {SHOW_QUICK_ADD_POOL && (
          <div
            className="sticky z-20 mb-2"
            style={{ top: toolbarHeight + 8 }}
            data-tour="simulator-course-pool"
          >
            {/* No overflow-hidden here: the info tooltip escapes the card, so
                corner clipping lives on the button itself instead. */}
            <div className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-pink-950/30 dark:via-gray-900/50 dark:to-gray-950/50 backdrop-blur-md rounded-xl border border-pink-200 dark:border-pink-800/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]">
              <button
                onClick={() => setShowPool(!showPool)}
                className={`flex items-center justify-between w-full p-3 ${
                  showPool
                    ? "rounded-t-xl border-b border-pink-200 dark:border-pink-800/30"
                    : "rounded-xl"
                } text-gray-700 dark:text-gray-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors`}
              >
                <div className="flex items-center gap-2 font-medium text-sm">
                  <div>Quick-add: Pool of remaining courses from your major</div>
                  <div className="relative group">
                    <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer" />
                    <div className="absolute z-50 bottom-full mb-1.5 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900/95 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800/50 shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                      May not include all. Add manually if not.
                    </div>
                  </div>
                </div>
                {showPool ? (
                  <FiChevronUp className="w-3.5 h-3.5 text-gray-500" />
                ) : (
                  <FiChevronDown className="w-3.5 h-3.5 text-gray-500" />
                )}
              </button>

              <AnimatePresence>
                {showPool && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="p-3"
                  >
                    {availableCourses.length === 0 ? (
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 italic">
                        All available courses have been scheduled. Remove one from a
                        semester to add it back.
                      </p>
                    ) : (
                      <div className="max-h-28 overflow-y-auto pr-1 flex flex-wrap gap-1.5">
                        {availableCourses.map((course) => (
                          <motion.div
                            key={course.code}
                            draggable
                            onDragStart={() => handleDragStart(course)}
                            onClick={() =>
                              setSelectedPoolCourse((prev) =>
                                prev?.code === course.code ? null : course,
                              )
                            }
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className={`px-2 py-1 rounded-lg text-xs cursor-grab active:cursor-grabbing select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] border ${
                              selectedPoolCourse?.code === course.code
                                ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-400 dark:border-purple-600 ring-2 ring-purple-400/50"
                                : "bg-pink-100 dark:bg-pink-900/25 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700/40"
                            }`}
                          >
                            {course.code}
                            <span className="text-[10px] text-pink-500/70 dark:text-pink-200/50 ml-1">
                              {(getCourseNameFromCode(course.code) ?? "").length > 0
                                ? ` ${getCourseNameFromCode(course.code)}`
                                : ""}
                            </span>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          )}

          {/* The Canvas control row: the per-course editor toggles and the
              verbs that act on the grid below it. Canvas only. */}
          <SimulatorCanvasActions
            showGrades={showGrades}
            onToggleGrades={() => setShowGrades((v) => !v)}
            showDistributionals={showDistributionals}
            onToggleDistributionals={() => setShowDistributionals((v) => !v)}
            helpOpen={showHelp}
            onToggleHelp={() => setShowHelp((v) => !v)}
            showSave={!!user}
            canSave={hasChanges}
            onSave={quickSave}
            onClear={resetSimulator}
          />

          {/* Semesters Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3" data-tour="simulator-board">
            {semesters.map((semester) => {
              const semCredits = getSemesterCredits(semester);
              const semCreditsLabel = Number.isInteger(semCredits)
                ? String(semCredits)
                : semCredits.toFixed(1);
              const isPast = isPastSemester(semester.name);
              // Tap-to-place only exists to land a course picked out of the
              // pool, so it goes quiet with the pool.
              const isPlaceTarget =
                SHOW_QUICK_ADD_POOL && !!selectedPoolCourse && !isPast;

              return (
                <motion.div
                  key={semester.id}
                  onClick={() => {
                    if (isPlaceTarget && selectedPoolCourse) {
                      placeCourseInSemester(selectedPoolCourse, semester.id);
                    }
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!isPast) setHoveredSemester(semester.id);
                  }}
                  onDragLeave={() => setHoveredSemester(null)}
                  onDrop={() => {
                    if (isPast) return;
                    handleDrop(semester.id);
                    setHoveredSemester(null);
                  }}
                  className={`bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md rounded-xl border p-3 min-h-[160px] flex flex-col transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)]
                    ${
                      isCurrentSemester(semester.name)
                        ? "border-blue-700/50 ring-1 ring-blue-500/30"
                        : isPast
                          ? "border-gray-300 dark:border-gray-700/60 opacity-80"
                          : "border-gray-200 dark:border-gray-800/50"
                    }
                    ${
                      hoveredSemester === semester.id && draggedCourse && !isPast
                        ? "ring-2 ring-pink-400/60 scale-[0.98] bg-gray-100 dark:bg-gray-800/60"
                        : ""
                    }
                    ${
                      isPlaceTarget ? "ring-2 ring-purple-400/50 cursor-pointer" : ""
                    }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      {semester.name}
                      {isPast && (
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-medium uppercase tracking-wider bg-gray-200 dark:bg-gray-800/80 text-gray-500 dark:text-gray-400 border border-gray-300 dark:border-gray-700/50"
                          title="Past semesters are locked"
                        >
                          <FiLock size={9} />
                          Locked
                        </span>
                      )}
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="px-1.5 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/40"
                        title="Sum of credits in this semester"
                      >
                        {semCreditsLabel} cr
                      </span>
                      {!isPast && (
                        <button
                          onClick={() => setLookupSemesterId(semester.id)}
                          data-tour="simulator-semester-add"
                          className="px-1.5 py-0.5 text-[10px] rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 border border-blue-300 dark:border-blue-800/40 transition-all"
                          type="button"
                        >
                          <FiPlus className="inline-block mr-0.5" size={10} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>

                  {semester.courses.length === 0 ? (
                    <div
                      className={`flex-1 flex items-center justify-center border border-dashed rounded-lg p-3 min-h-[48px] transition-all
                        ${
                          hoveredSemester === semester.id && draggedCourse && !isPast
                            ? "border-pink-400/60 bg-pink-50 dark:bg-pink-900/15"
                            : "border-gray-200 dark:border-gray-700/50"
                        }`}
                    >
                      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center opacity-70">
                        {isPlaceTarget
                          ? "Tap to place selected course"
                          : SHOW_QUICK_ADD_POOL
                            ? "Drag from pool or add manually"
                            : "Add a course, or drag one in from another semester"}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {semester.courses.map((course) => (
                        <motion.div
                          key={`${semester.id}-${course.code}`}
                          draggable={course.status === "not-taken"}
                          onDragStart={
                            course.status === "not-taken"
                              ? () => handleDragStart(course, semester.id)
                              : undefined
                          }
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`w-full flex ${
                            course.status === "not-taken" &&
                            (showGrades || showDistributionals)
                              ? "flex-col items-stretch"
                              : "items-center justify-between"
                          } px-2 py-1 rounded-lg text-xs select-none transition-all border relative group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
                            ${
                              course.status === "completed"
                                ? "bg-emerald-100 dark:bg-emerald-900/25 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700/40"
                                : course.status === "in-progress"
                                  ? "bg-blue-100 dark:bg-blue-900/25 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/40"
                                  : "bg-pink-100 dark:bg-pink-900/20 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700/40 hover:bg-pink-200 dark:hover:bg-pink-800/30 cursor-grab active:cursor-grabbing"
                            }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <div>
                              {course.code}
                              <span className="text-[10px] opacity-60 ml-1">
                                {getCourseNameFromCode(course.code) ?? ""}
                              </span>
                            </div>
                            {course.status === "not-taken" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeCourseFromSemester(
                                    semester.id,
                                    course.code,
                                  );
                                }}
                                className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-200"
                              >
                                <FiTrash2 className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                          {course.status === "not-taken" &&
                            (showGrades || showDistributionals) && (
                              <div
                                className="w-full mt-1.5 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08] flex flex-col gap-1.5"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                draggable
                                onDragStart={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                              >
                                {showGrades && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] opacity-60">
                                      Grade
                                    </span>
                                    <CourseGradeControl
                                      value={course.grade}
                                      onChange={(grade) =>
                                        updatePlannedCourse(
                                          semester.id,
                                          course.code,
                                          { grade },
                                        )
                                      }
                                    />
                                  </div>
                                )}
                                {showDistributionals && (
                                  <CourseDistributionalControl
                                    value={course.distributionals ?? []}
                                    onChange={(codes) =>
                                      updatePlannedCourse(semester.id, course.code, {
                                        distributionals: codes,
                                      })
                                    }
                                  />
                                )}
                              </div>
                            )}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </>
      ) : (
        <SimulatorProgressPane
          majorIds={majorIds}
          certificateIds={certificateIds}
          expanded={showMajorPreview}
          onToggleExpanded={() => setShowMajorPreview((v) => !v)}
          isPreviewLoading={isPreviewLoading}
          previewError={previewError}
          breakdown={
            <SimulatorRequirementsBreakdown
              majorIds={majorIds}
              certificateIds={certificateIds}
              previewProgress={previewProgress}
              certificatePreviewProgress={certificatePreviewProgress}
              plannedCodes={plannedCodes}
              simulatorManualReqs={simulatorManualReqs}
              courses={completedCourses}
              policyOptions={policyOptions}
              onRemoveManualReq={(code, requirement) => {
                setSimulatorManualReqs((prev) =>
                  prev.filter(
                    (m) => !(m.code === code && m.requirement === requirement),
                  ),
                );
              }}
            />
          }
          gpaTimelineTerms={gpaTimelineTerms}
          distributionalAssignments={[
            ...completedDistAssignments,
            ...plannedDistAssignments,
          ]}
        />
      )}

      {/* Save Plan Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.15),0_0_80px_rgba(139,92,246,0.04),inset_0_1px_0_rgba(255,255,255,0.08)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
            >
              {/* Header */}
              <div className="mb-5">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {selectedPlanToOverwrite !== null
                    ? `Overwrite "${savedPlans[selectedPlanToOverwrite]?.name ?? ""}"`
                    : "Save new plan"}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  {selectedPlanToOverwrite !== null
                    ? "Replace this plan with your current canvas, or save as a new plan instead."
                    : "Give your plan a name to save your progress."}
                </p>
              </div>

              {/* Plan Name Input */}
              <div className="mb-4">
                <input
                  type="text"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  placeholder="e.g., Senior Year Schedule, Plan B..."
                  className="w-full px-4 py-3 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-purple-500/40 focus:ring-1 focus:ring-purple-500/20 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                  autoFocus
                />
              </div>

              {/* Overwrite existing plans */}
              {savedPlans.length > 0 && (
                <div className="mb-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      Overwrite an existing plan
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                  </div>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
                    {savedPlans.map((plan, index) => {
                      const selected = selectedPlanToOverwrite === index;
                      return (
                        <button
                          key={`${plan.createdAt}-${index}`}
                          aria-pressed={selected}
                          className={`w-full p-3 text-left border-b border-gray-100 dark:border-white/[0.04] last:border-b-0 hover:bg-gray-100 dark:hover:bg-white/[0.04] text-sm transition-all ${
                            selected
                              ? "bg-purple-500/10 border-l-2 border-l-purple-500"
                              : "border-l-2 border-l-transparent"
                          }`}
                          onClick={() => {
                            setSelectedPlanToOverwrite(index);
                            setPlanName(plan.name);
                          }}
                        >
                          <div className="flex justify-between items-center gap-2">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                                {plan.name}
                              </span>
                              {plan.isDefault && (
                                <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/40 shrink-0">
                                  Default
                                </span>
                              )}
                            </span>
                            <span className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                {new Date(plan.createdAt).toLocaleDateString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                  },
                                )}
                              </span>
                              {selected && (
                                <FiCheck
                                  size={13}
                                  className="text-purple-500 dark:text-purple-300"
                                />
                              )}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {selectedPlanToOverwrite !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPlanToOverwrite(null);
                        setPlanName("");
                      }}
                      className="mt-2 text-xs text-gray-400 dark:text-gray-500 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                    >
                      + Save as a new plan instead
                    </button>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <motion.button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSelectedPlanToOverwrite(null);
                    setPlanName("");
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 text-sm rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] transition-all"
                >
                  Cancel
                </motion.button>
                <motion.button
                  onClick={savePlan}
                  disabled={!planName.trim() || !hasChanges}
                  whileHover={
                    planName.trim() && hasChanges ? { scale: 1.02 } : {}
                  }
                  whileTap={
                    planName.trim() && hasChanges ? { scale: 0.98 } : {}
                  }
                  className={`px-4 py-2 text-sm rounded-xl font-medium transition-all ${
                    planName.trim() && hasChanges
                      ? "bg-gradient-to-r from-purple-500/30 to-blue-500/30 text-gray-900 dark:text-white border border-purple-500/30 hover:border-purple-400/40 shadow-[0_2px_12px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
                      : "bg-black/[0.02] dark:bg-white/[0.02] text-gray-400 dark:text-gray-600 border border-black/[0.04] dark:border-white/[0.04] cursor-not-allowed"
                  }`}
                >
                  {selectedPlanToOverwrite !== null
                    ? "Overwrite"
                    : "Save new plan"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan manager, opened by the toolbar's plan selector */}
      <SimulatorPlansModal
        isOpen={showPlansModal}
        plans={savedPlans}
        currentPlanName={currentPlanName}
        canSaveCurrent={!!user && hasChanges}
        onClose={() => setShowPlansModal(false)}
        onLoad={loadPlan}
        onSetDefault={setDefaultPlan}
        onDelete={deletePlan}
        onSaveCurrent={openSaveModal}
      />

      {/* Manual Course Lookup Modal */}
      <ManualCourseLookupModal
        isOpen={lookupSemesterId !== null}
        onClose={() => setLookupSemesterId(null)}
        onSelect={(manualCourse) => {
          if (!lookupSemesterId || !manualCourse?.code) return;

          const isDuplicate = semesters.some((s) =>
            s.courses.some((c) => c.code === manualCourse.code),
          );
          if (isDuplicate) {
            toast.error("This course is already on your plan.");
            return;
          }

          // Same guard as the pool drop: a course every program refuses would
          // earn nothing on the grid, so it is turned away with the reasons.
          const admission = admitPlannedCourse(manualCourse);
          if (!admission.admitted) {
            setBlockedDrop({
              courseCode: manualCourse.code,
              refusals: admission.refusals,
            });
            setLookupSemesterId(null);
            return;
          }

          setSemesters((prev) =>
            prev.map((sem) =>
              sem.id === lookupSemesterId
                ? { ...sem, courses: [...sem.courses, manualCourse] }
                : sem,
            ),
          );

          setAvailableCourses((prev) =>
            prev.filter((c) => c.code !== manualCourse.code),
          );

          // Auto-detect: prompt manual assignment if not in any requirement
          if (!isCourseInAnyRequirement(manualCourse.code)) {
            setManualAssignPending({
              course: manualCourse,
              semesterId: lookupSemesterId,
            });
          } else {
            // Show toast for auto-matched course
            showAutoMatchToast(manualCourse.code);
          }

          setLookupSemesterId(null);
        }}
        userId={user?.uid || ""}
      />

      {/* Refused-drop error modal */}
      <PlannedCourseBlockedModal
        isOpen={blockedDrop !== null}
        courseCode={blockedDrop?.courseCode ?? null}
        refusals={blockedDrop?.refusals ?? []}
        onClose={() => setBlockedDrop(null)}
      />

      {/* Manual requirement assignment modal */}
      <SimulatorManualAssignModal
        isOpen={manualAssignPending !== null}
        course={manualAssignPending?.course ?? null}
        majorIds={majorIds}
        certificateIds={certificateIds}
        previewProgress={previewProgress}
        certificatePreviewProgress={certificatePreviewProgress}
        courses={completedCourses}
        policyOptions={policyOptions}
        onAssign={(entry) => {
          setSimulatorManualReqs((prev) => [...prev, entry]);
          setManualAssignPending(null);
        }}
        onSkip={() => setManualAssignPending(null)}
        onClose={() => setManualAssignPending(null)}
      />

      {/* Plan Selector Modal - shown on initial load */}
      <AnimatePresence>
        {showPlanSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowPlanSelector(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.1)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-1">
                  Welcome to your Yale Simulator.
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {savedPlans.length > 0
                    ? "Pick up where you left off, or start fresh."
                    : "Drag and drop courses to map out the rest of your degree."}
                </p>
              </div>

              {/* Saved Plans List */}
              {savedPlans.length > 0 && (
              <div className="space-y-2 max-h-[280px] overflow-y-auto px-1 mb-4">
                {savedPlans.map((plan, index) => {
                  const plannedCount = plan.semesters.reduce(
                    (acc, sem) =>
                      acc +
                      sem.courses.filter((c) => c.status === "not-taken")
                        .length,
                    0,
                  );
                  return (
                    <motion.button
                      key={`${plan.createdAt}-${index}`}
                      onClick={() => {
                        loadPlan(index);
                        setShowPlanSelector(false);
                      }}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full p-4 rounded-xl text-left bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-transparent border border-gray-200 dark:border-white/[0.06] hover:border-purple-500/30 hover:bg-purple-50 dark:hover:bg-white/[0.06] transition-all duration-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                            {plan.name}
                          </h4>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {plannedCount} planned course
                            {plannedCount !== 1 ? "s" : ""} ·{" "}
                            {new Date(plan.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </p>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <FiChevronUp className="w-4 h-4 text-purple-300 rotate-90" />
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
              )}

              {/* Divider */}
              {savedPlans.length > 0 && (
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    or
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/10 to-transparent" />
                </div>
              )}

              {/* Start Fresh Button */}
              <motion.button
                onClick={() => setShowPlanSelector(false)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full py-3 px-4 rounded-xl font-medium text-sm text-gray-800 dark:text-white bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-pink-500/30 border border-black/[0.08] dark:border-white/[0.08] shadow-[0_2px_12px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200 flex items-center justify-center gap-2"
              >
                <FiPlus size={14} className="opacity-70" />
                Start Fresh / Create New Plan
              </motion.button>

              {/* Skip hint */}
              <p className="text-center text-[11px] text-gray-400 dark:text-gray-600 mt-4">
                Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.08] text-gray-500 dark:text-gray-400">
                  Esc
                </kbd>{" "}
                or click outside to dismiss
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
