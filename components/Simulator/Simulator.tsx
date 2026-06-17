"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
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
import {
  calculatePreviewMajorProgressByMajors,
  MajorProgress,
  ManualRequirementEntry,
  majorRequirements,
} from "@/lib/majors";

// ----------------- Types -----------------
interface Semester {
  id: string;
  name: string; // e.g. "Fall 2026"
  courses: Course[];
}

interface SimulatorProps {
  remainingCourses: Course[];
  completedCourses: Course[];
  graduationYear: number;
  userMajors: string[];
}

type Plan = {
  name: string;
  semesters: Semester[];
  manualRequirements?: ManualRequirementEntry[];
  createdAt: string; // ISO
};

type PreviewProgressMap = Record<string, MajorProgress>;

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

function compareSemesters(a: string, b: string) {
  const [semA, yearA] = a.split(" ");
  const [semB, yearB] = b.split(" ");
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);
  if (yA !== yB) return yA - yB;
  const order: Record<"Spring" | "Fall", number> = { Spring: 0, Fall: 1 };
  return order[semA as "Spring" | "Fall"] - order[semB as "Spring" | "Fall"];
}

function isPastSemester(semesterName: string) {
  const [sem, yearStr] = semesterName.split(" ");
  const year = parseInt(yearStr, 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan

  if (year < currentYear) return true;
  if (year > currentYear) return false;

  // Coarse cutoffs so you can't alter clearly past terms:
  // Fall of current year is editable until January of the next year
  // (at which point year < currentYear catches it)
  // Spring is past once it ends (June+)
  if (sem === "Fall" && currentMonth > 11) return true; // > Dec (never true, handled by next year check)
  if (sem === "Spring" && currentMonth >= 5) return true; // June 1+ (Spring ended)
  return false;
}

// ----------------- Component -----------------
export default function Simulator({
  remainingCourses,
  completedCourses,
  graduationYear,
  userMajors,
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
  const [showPool, setShowPool] = useState(false);
  // Plan selector modal shown on initial load
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  // Track currently loaded plan
  const [currentPlanName, setCurrentPlanName] = useState<string | null>(null);
  // Track scroll state for sticky nav background
  const [isScrolled, setIsScrolled] = useState(false);

  // Simulator-local manual requirements (plan-scoped, NOT in Firebase courses)
  const [simulatorManualReqs, setSimulatorManualReqs] = useState<
    ManualRequirementEntry[]
  >([]);
  // Manual assignment modal state
  const [manualAssignPending, setManualAssignPending] = useState<{
    course: Course;
    semesterId: string;
  } | null>(null);

  // Preview state
  const [previewProgress, setPreviewProgress] = useState<PreviewProgressMap>(
    {},
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // keep initial snapshot to detect changes
  const initialSemestersRef = useRef<Semester[]>([]);
  const initialManualReqsRef = useRef<ManualRequirementEntry[]>([]);

  // majors to compute – only the user's declared majors
  const majorIds = useMemo<string[]>(() => userMajors, [userMajors]);

  // Auto-detect: does a course code appear in any requirement option across all user majors?
  const isCourseInAnyRequirement = useMemo(() => {
    const allOptionCodes = new Set<string>();
    for (const majorId of majorIds) {
      const major = majorRequirements[majorId];
      if (!major) continue;
      for (const req of major.requirements) {
        for (const opt of req.options) {
          if (opt.type === "course") {
            allOptionCodes.add(opt.code);
            const canon = getCanonicalCode(opt.code);
            if (canon) allOptionCodes.add(canon);
          } else if (opt.type === "group") {
            for (const code of (opt as { type: "group"; options: string[] })
              .options) {
              allOptionCodes.add(code);
              const canon = getCanonicalCode(code);
              if (canon) allOptionCodes.add(canon);
            }
          }
        }
      }
    }
    return (courseCode: string): boolean => {
      const canon = getCanonicalCode(courseCode) || courseCode;
      return allOptionCodes.has(courseCode) || allOptionCodes.has(canon);
    };
  }, [majorIds]);

  // Find which requirement(s) a course matches for toast notification
  const getMatchedRequirements = useMemo(() => {
    return (
      courseCode: string,
    ): { majorName: string; requirementName: string }[] => {
      const matches: { majorName: string; requirementName: string }[] = [];
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
            matches.push({ majorName: major.name, requirementName: req.name });
          }
        }
      }
      return matches;
    };
  }, [majorIds]);

  // Show toast for auto-matched course
  const showAutoMatchToast = (courseCode: string) => {
    const matches = getMatchedRequirements(courseCode);
    if (matches.length === 0) return;

    const firstMatch = matches[0];

    if (matches.length === 1) {
      toast.success(
        `Auto-detected match: "${firstMatch.requirementName}" (${firstMatch.majorName})`,
        { duration: 3000 },
      );
    } else {
      toast.success(
        `Auto-detected match: "${firstMatch.requirementName}" (${firstMatch.majorName}) +${matches.length - 1} more`,
        { duration: 3000 },
      );
    }
  };

  // ------------ Build initial semesters & pools ------------
  useEffect(() => {
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
  }, [graduationYear, remainingCourses, completedCourses]);

  // ------------ Change detection ------------
  useEffect(() => {
    if (initialSemestersRef.current.length === 0) return;

    // Create a set of "semesterId:courseCode" to detect both additions/deletions AND moves
    const currentPlacements = new Set(
      semesters.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken") // Only track planned courses
          .map((c) => `${s.id}:${c.code}`),
      ),
    );
    const initialPlacements = new Set(
      initialSemestersRef.current.flatMap((s) =>
        s.courses
          .filter((c) => c.status === "not-taken")
          .map((c) => `${s.id}:${c.code}`),
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

    const changed = placementsChanged || manualReqsChanged;

    setHasChanges(changed);
  }, [semesters, simulatorManualReqs]);

  // ------------ Saved plans load ------------
  useEffect(() => {
    if (!user) return;
    const loadSavedPlans = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        const data = docSnap.exists()
          ? (docSnap.data() as { savedPlans?: Plan[] })
          : null;
        if (data?.savedPlans) {
          setSavedPlans(data.savedPlans);
          // Show plan selector on initial load if user has saved plans
          if (data.savedPlans.length > 0) {
            setShowPlanSelector(true);
          }
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
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPlanSelector, showSaveModal, showPlansModal]);

  // ------------ Scroll detection for sticky nav ------------
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const handleDrop = (semesterId: string) => {
    if (!draggedCourse) return;

    // Dropping back on the same semester — no-op
    if (dragSourceSemester === semesterId) {
      setDraggedCourse(null);
      setDragSourceSemester(null);
      return;
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

  // ------------ Live preview progress (local compute) ------------
  useEffect(() => {
    if (!user) {
      setPreviewProgress({});
      return;
    }

    setIsPreviewLoading(true);
    setPreviewError(null);

    // Inputs for progress calc
    const completedCodes = completedCourses.map((c) => c.code);
    const inProgCodes = semesters.flatMap((s) =>
      s.courses.filter((c) => c.status === "in-progress").map((c) => c.code),
    );
    const plannedCodesLocal = plannedCodes; // from memo
    const skippedCodes: string[] = []; // wire up if you track skips

    // Extract permanent manual fulfillments from Firebase courses
    const permanentManualReqs: ManualRequirementEntry[] =
      completedCourses.flatMap((course) =>
        (course.manualRequirementsFulfilled || [])
          .filter((m) => majorIds.includes(m.major_id))
          .map((m) => ({
            code: course.code,
            requirement: m.requirement_title,
            credits: course.credits || 1,
          })),
      );

    // Merge permanent manual reqs with simulator-local manual reqs
    // Simulator manuals are ALWAYS planned (for future courses)
    const manualReqs = [
      ...permanentManualReqs,
      ...simulatorManualReqs.map((m) => ({ ...m, isPlanned: true })),
    ];

    try {
      // 1) Batch compute for all majors
      const all = calculatePreviewMajorProgressByMajors(
        majorIds,
        completedCodes,
        inProgCodes,
        skippedCodes,
        manualReqs,
        plannedCodesLocal,
      );

      setPreviewProgress(all);
    } catch (batchErr) {
      // 2) Fallback: compute per-major so one bad major doesn't break others
      console.error("[PreviewProgress] batch compute failed:", batchErr);
      const result: PreviewProgressMap = {};
      let successes = 0;
      let failures = 0;

      for (const mid of majorIds) {
        try {
          const one = calculatePreviewMajorProgressByMajors(
            [mid],
            completedCodes,
            inProgCodes,
            skippedCodes,
            manualReqs,
            plannedCodesLocal,
          )[mid];

          if (one) {
            // keep only majors with any signal
            if (
              (one.completedCredits ?? 0) > 0 ||
              (one.inProgressCredits ?? 0) > 0
            ) {
              result[mid] = one;
              successes++;
            }
          }
        } catch (perErr) {
          failures++;
          console.error(`[PreviewProgress] failed for major "${mid}":`, perErr);
        }
      }

      setPreviewProgress(result);

      if (successes === 0) {
        setPreviewError("Could not load simulated major progress.");
      }
    } finally {
      setIsPreviewLoading(false);
    }
  }, [
    user,
    majorIds,
    semesters,
    completedCourses,
    plannedCodes,
    simulatorManualReqs,
  ]);

  // ------------ Save / Load / Delete Plans ------------

  // Helper to load a plan from Plan object directly
  const loadPlanData = (plan: Plan) => {
    setSemesters(plan.semesters);
    setSimulatorManualReqs(plan.manualRequirements ?? []);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(plan.semesters),
    ) as Semester[];
    initialManualReqsRef.current = JSON.parse(
      JSON.stringify(plan.manualRequirements ?? []),
    ) as ManualRequirementEntry[];

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
  };

  const savePlan = async () => {
    if (!user || !planName.trim()) return;
    try {
      const savedName = planName.trim();
      const newPlan: Plan = {
        name: savedName,
        semesters,
        manualRequirements: simulatorManualReqs,
        createdAt: new Date().toISOString(),
      };

      const updatedPlans: Plan[] =
        selectedPlanToOverwrite !== null
          ? savedPlans.map((p, i) =>
              i === selectedPlanToOverwrite ? newPlan : p,
            )
          : [...savedPlans, newPlan];

      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true },
      );
      setSavedPlans(updatedPlans);

      // Load the saved plan
      loadPlanData(newPlan);

      setPlanName("");
      setSelectedPlanToOverwrite(null);
      setShowSaveModal(false);
      toast.success(`Plan "${savedName}" saved!`);
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error("Failed to save plan");
    }
  };

  const loadPlan = (planIndex: number) => {
    if (planIndex < 0 || planIndex >= savedPlans.length) return;
    const plan = savedPlans[planIndex];
    loadPlanData(plan);
    setShowPlansModal(false);
  };

  const deletePlan = async (planIndex: number) => {
    if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
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
    setSemesters((prev) =>
      prev.map((sem) => ({
        ...sem,
        courses: sem.courses.filter(
          (c) => c.status === "completed" || c.status === "in-progress",
        ),
      })),
    );
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken",
      ),
    );
    setSimulatorManualReqs([]);
    setCurrentPlanName(null);
  };

  const hasInProgress = (semester: Semester) =>
    semester.courses.some((c) => c.status === "in-progress");

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
        className={`sticky top-0 z-30 -mx-4 px-6 py-3 mb-4 backdrop-blur-xl transition-all duration-200 ${
          isScrolled
            ? "bg-white/95 dark:bg-transparent dark:bg-gradient-to-r dark:from-gray-900/95 dark:via-gray-950/95 dark:to-gray-900/95 border-b border-gray-200 dark:border-white/[0.06] shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.3)]"
            : "bg-transparent border-b border-transparent"
        }`}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          {/* Current Plan Status */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Plan:
            </span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
              {currentPlanName ? (
                <>
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${hasChanges ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
                  />
                  <span className="text-base font-medium text-gray-800 dark:text-gray-200">
                    {currentPlanName}
                  </span>
                  {hasChanges && (
                    <span className="text-xs text-amber-400 ml-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                      unsaved
                    </span>
                  )}
                </>
              ) : (
                <>
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${hasChanges ? "bg-blue-400 animate-pulse" : "bg-gray-500"}`}
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {hasChanges ? "Unsaved new plan" : "No plan loaded"}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowHelp((v) => !v)}
              className="px-4 py-2 text-sm rounded-xl bg-black/[0.04] dark:bg-white/[0.04] backdrop-blur-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 transition-all"
            >
              <FiInfo size={14} />
              Help
            </button>
            {user && (
              <>
                <button
                  onClick={() => setShowPlansModal(true)}
                  className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-blue-500/15 to-purple-500/15 backdrop-blur-sm text-blue-300 hover:text-blue-200 hover:from-blue-500/20 hover:to-purple-500/20 border border-blue-500/30 hover:border-blue-400/40 flex items-center gap-2 transition-all"
                >
                  <FiChevronDown size={14} />
                  Load Plan
                </button>
                <button
                  onClick={() => setShowSaveModal(true)}
                  className={`px-4 py-2 text-sm rounded-xl backdrop-blur-sm transition-all flex items-center gap-2 ${
                    hasChanges
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 hover:text-emerald-200 hover:from-emerald-500/25 hover:to-teal-500/25 border border-emerald-500/30 hover:border-emerald-400/40"
                      : "bg-black/[0.02] dark:bg-white/[0.02] text-gray-400 dark:text-gray-600 border border-black/[0.04] dark:border-white/[0.04] cursor-not-allowed"
                  }`}
                  disabled={!hasChanges}
                >
                  <FiPlus size={14} />
                  Save Current
                </button>
              </>
            )}
            <button
              onClick={resetSimulator}
              className="px-4 py-2 text-sm rounded-xl bg-red-500/10 backdrop-blur-sm text-red-400 hover:text-red-300 hover:bg-red-500/15 border border-red-500/20 hover:border-red-400/30 flex items-center gap-2 transition-all"
            >
              <FiRefreshCw size={14} />
              Clear canvas
            </button>
          </div>
        </div>
      </div>

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
              <li>
                The pool shows remaining courses in your major; you can also add
                any course manually.
              </li>
              <li>
                Drag/add courses into any semester (multiple courses per term
                work fine).
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

      {/* Live Major Progress Preview */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Major progress
          </h3>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            Live preview — reflects completed, in-progress, and courses placed
            on the grid.
          </p>
        </div>

        {isPreviewLoading && (
          <div className="text-sm text-gray-500 dark:text-gray-400">Updating preview…</div>
        )}
        {previewError && (
          <div className="text-sm text-red-600 dark:text-red-300">{previewError}</div>
        )}

        <SimulatorRequirementsBreakdown
          majorIds={majorIds}
          previewProgress={previewProgress}
          plannedCodes={plannedCodes}
          simulatorManualReqs={simulatorManualReqs}
          onRemoveManualReq={(code, requirement) => {
            setSimulatorManualReqs((prev) =>
              prev.filter(
                (m) => !(m.code === code && m.requirement === requirement),
              ),
            );
          }}
        />
      </div>

      {/* Available Courses Pool */}
      <div className="sticky top-[72px] z-20 mb-2">
        <div className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-pink-950/30 dark:via-gray-900/50 dark:to-gray-950/50 backdrop-blur-md rounded-xl border border-pink-200 dark:border-pink-800/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)] overflow-hidden">
          <button
            onClick={() => setShowPool(!showPool)}
            className={`flex items-center justify-between w-full p-3 ${
              showPool ? "border-b border-pink-200 dark:border-pink-800/30" : ""
            } text-gray-700 dark:text-gray-300 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors`}
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <div>Quick-add: Pool of remaining courses from your major</div>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer" />
                <div className="absolute z-50 bottom-full mt-2 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-900/95 backdrop-blur-sm text-gray-700 dark:text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-2 py-1 rounded-lg bg-pink-100 dark:bg-pink-900/25 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-700/40 text-xs cursor-grab active:cursor-grabbing select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
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

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {semesters.map((semester) => {
          const semCredits = getSemesterCredits(semester);
          const semCreditsLabel = Number.isInteger(semCredits)
            ? String(semCredits)
            : semCredits.toFixed(1);

          return (
            <motion.div
              key={semester.id}
              onDragOver={(e) => {
                e.preventDefault();
                if (!isPastSemester(semester.name))
                  setHoveredSemester(semester.id);
              }}
              onDragLeave={() => setHoveredSemester(null)}
              onDrop={() => {
                if (isPastSemester(semester.name)) return;
                handleDrop(semester.id);
                setHoveredSemester(null);
              }}
              className={`bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md rounded-xl border p-3 min-h-[160px] flex flex-col transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)]
                ${
                  hasInProgress(semester)
                    ? "border-blue-700/50 ring-1 ring-blue-500/30"
                    : "border-gray-200 dark:border-gray-800/50"
                }
                ${
                  hoveredSemester === semester.id &&
                  draggedCourse &&
                  !isPastSemester(semester.name)
                    ? "ring-2 ring-pink-400/60 scale-[0.98] bg-gray-100 dark:bg-gray-800/60"
                    : ""
                }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300">
                  {semester.name}
                </h4>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] bg-gray-100 dark:bg-gray-800/60 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700/40"
                    title="Sum of credits in this semester"
                  >
                    {semCreditsLabel} cr
                  </span>
                  {!isPastSemester(semester.name) && (
                    <button
                      onClick={() => setLookupSemesterId(semester.id)}
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
                      hoveredSemester === semester.id &&
                      draggedCourse &&
                      !isPastSemester(semester.name)
                        ? "border-pink-400/60 bg-pink-50 dark:bg-pink-900/15"
                        : "border-gray-200 dark:border-gray-700/50"
                    }`}
                >
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center opacity-70">
                    Drag from pool or add manually
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
                      className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-xs select-none transition-all border relative group shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]
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
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

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
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {selectedPlanToOverwrite !== null
                    ? "Overwrite Plan"
                    : "Save Your Plan"}
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Give your plan a name to save your progress.
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
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                      or overwrite
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </div>
                  <div className="max-h-32 overflow-y-auto rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50/50 dark:bg-white/[0.02]">
                    {savedPlans.map((plan, index) => (
                      <button
                        key={`${plan.createdAt}-${index}`}
                        className={`w-full p-3 text-left border-b border-gray-100 dark:border-white/[0.04] last:border-b-0 hover:bg-gray-100 dark:hover:bg-white/[0.04] text-sm transition-all ${
                          selectedPlanToOverwrite === index
                            ? "bg-purple-500/10 border-l-2 border-l-purple-500"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPlanToOverwrite(index);
                          setPlanName(plan.name);
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            {plan.name}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            {new Date(plan.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                              },
                            )}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
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
                  {selectedPlanToOverwrite !== null ? "Overwrite" : "Save Plan"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load Plans Modal */}
      <AnimatePresence>
        {showPlansModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setShowPlansModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-6 rounded-2xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.1),0_0_80px_rgba(139,92,246,0.02)] dark:shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
              style={{ maxHeight: "80vh" }}
            >
              {/* Header */}
              <div className="mb-5">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Your Saved Plans
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Load a previous plan or manage your saved plans.
                </p>
              </div>

              {savedPlans.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-transparent border border-gray-200 dark:border-white/[0.06] flex items-center justify-center">
                    <FiPlus className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-500 text-sm">No saved plans yet</p>
                  <p className="text-gray-400 dark:text-gray-600 text-xs mt-1">
                    Make changes and save to create your first plan.
                  </p>
                </div>
              ) : (
                <div
                  className="space-y-2 overflow-y-auto pr-1"
                  style={{ maxHeight: "calc(80vh - 180px)" }}
                >
                  {savedPlans.map((plan, index) => {
                    const plannedCount = plan.semesters.reduce(
                      (acc, sem) =>
                        acc +
                        sem.courses.filter((c) => c.status === "not-taken")
                          .length,
                      0,
                    );
                    return (
                      <motion.div
                        key={`${plan.createdAt}-${index}`}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 rounded-xl bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.04] dark:to-transparent border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.1] transition-all group"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-medium text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                              {plan.name}
                            </h5>
                            <p className="text-[11px] text-gray-500 mt-0.5">
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
                        </div>
                        <div className="flex justify-end gap-2">
                          <motion.button
                            onClick={() => deletePlan(index)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 border border-red-500/20 transition-all flex items-center gap-1"
                          >
                            <FiTrash2 size={11} />
                            Delete
                          </motion.button>
                          <motion.button
                            onClick={() => loadPlan(index)}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 hover:text-blue-200 border border-blue-500/30 hover:border-blue-400/40 transition-all shadow-[0_2px_8px_rgba(59,130,246,0.15),inset_0_1px_0_rgba(255,255,255,0.08)]"
                          >
                            Load Plan
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Close button */}
              <div className="mt-5 flex justify-end">
                <motion.button
                  onClick={() => setShowPlansModal(false)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-2 text-sm rounded-xl bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-black/[0.06] dark:hover:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.06] transition-all"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manual Course Lookup Modal */}
      <ManualCourseLookupModal
        isOpen={lookupSemesterId !== null}
        onClose={() => setLookupSemesterId(null)}
        onSelect={(manualCourse) => {
          if (!lookupSemesterId || !manualCourse?.code) return;
          setSemesters((prev) =>
            prev.map((sem) =>
              sem.id === lookupSemesterId
                ? { ...sem, courses: [...sem.courses, manualCourse] }
                : sem,
            ),
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

      {/* Manual requirement assignment modal */}
      <SimulatorManualAssignModal
        isOpen={manualAssignPending !== null}
        course={manualAssignPending?.course ?? null}
        majorIds={majorIds}
        previewProgress={previewProgress}
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
                  Pick up where you left off, or start fresh.
                </p>
              </div>

              {/* Saved Plans List */}
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

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                  or
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              </div>

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
