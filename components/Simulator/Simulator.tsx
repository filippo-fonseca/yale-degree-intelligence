"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Info } from "lucide-react";
import { Course } from "@/lib/types";
import { getCourseNameFromCode, getCanonicalCode } from "@/lib/courseCatalog";
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
    0
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
  // treat Feb+ as "Fall is in the past"; treat Jun+ as "Spring is in the past"
  if (sem === "Fall" && currentMonth > 1) return true; // > Feb
  if (sem === "Spring" && currentMonth > 5) return true; // > Jun
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
  const [dragSourceSemester, setDragSourceSemester] = useState<string | null>(null);
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
    {}
  );
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // keep initial snapshot to detect changes
  const initialSemestersRef = useRef<Semester[]>([]);

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
            for (const code of (opt as { type: "group"; options: string[] }).options) {
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

  // ------------ Build initial semesters & pools ------------
  useEffect(() => {
    // 1) Build semester list starting from earliest known term or grad - 4y
    let semestersArr: Semester[] = [];
    let startYear = graduationYear - 4;
    let startSemester: "Fall" | "Spring" = "Fall";

    if (completedCourses.length > 0) {
      const minYear = Math.min(...completedCourses.map((c) => c.year));
      const coursesInMinYear = completedCourses.filter(
        (c) => c.year === minYear
      );
      const minSem: "Fall" | "Spring" = coursesInMinYear.some(
        (c) => c.semester === "Spring"
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
        (s) => s.name === `${course.semester} ${course.year}`
      );
      if (idx !== -1) {
        semestersArr[idx].courses.push(course);
      }
    });

    setSemesters(semestersArr);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(semestersArr)
    ) as Semester[];

    // 3) Build pool of available (not-taken & not already taken)
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken"
      )
    );
  }, [graduationYear, remainingCourses, completedCourses]);

  // ------------ Change detection ------------
  useEffect(() => {
    if (initialSemestersRef.current.length === 0) return;

    const currentCodes = semesters.flatMap((s) => s.courses.map((c) => c.code));
    const initialCodes = initialSemestersRef.current.flatMap((s) =>
      s.courses.map((c) => c.code)
    );

    const changed =
      currentCodes.length !== initialCodes.length ||
      currentCodes.some((code) => !initialCodes.includes(code)) ||
      initialCodes.some((code) => !currentCodes.includes(code)) ||
      simulatorManualReqs.length > 0;

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
        if (data?.savedPlans) setSavedPlans(data.savedPlans);
      } catch (e) {
        console.error("Error loading saved plans:", e);
      }
    };
    loadSavedPlans();
  }, [user]);

  // ------------ Drag & Drop ------------
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
      })
    );

    // Only remove from pool if dragged from pool (not from another semester)
    if (!dragSourceSemester) {
      setAvailableCourses((prev) =>
        prev.filter((c) => c.code !== draggedCourse.code)
      );

      // Auto-detect: prompt manual assignment if not in any requirement
      if (!isCourseInAnyRequirement(draggedCourse.code)) {
        setManualAssignPending({ course: draggedCourse, semesterId });
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
          : sem
      )
    );

    // Clean up any simulator manual reqs for this course
    setSimulatorManualReqs((prev) => prev.filter((m) => m.code !== courseCode));

    const rc = remainingCourses.find((c) => c.code === courseCode);
    if (rc && rc.status === "not-taken") {
      setAvailableCourses((prev) =>
        prev.some((c) => c.code === rc.code) ? prev : [...prev, rc]
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
    [plannedNow]
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
      s.courses.filter((c) => c.status === "in-progress").map((c) => c.code)
    );
    const plannedCodesLocal = plannedCodes; // from memo
    const skippedCodes: string[] = []; // wire up if you track skips

    // Extract permanent manual fulfillments from Firebase courses
    const permanentManualReqs: ManualRequirementEntry[] = completedCourses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => majorIds.includes(m.major_id))
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        }))
    );

    // Merge permanent manual reqs with simulator-local manual reqs
    // Simulator manuals are ALWAYS planned (for future courses)
    const manualReqs = [
      ...permanentManualReqs,
      ...simulatorManualReqs.map(m => ({ ...m, isPlanned: true }))
    ];

    try {
      // 1) Batch compute for all majors
      const all = calculatePreviewMajorProgressByMajors(
        majorIds,
        completedCodes,
        inProgCodes,
        skippedCodes,
        manualReqs,
        plannedCodesLocal
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
            plannedCodesLocal
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
  }, [user, majorIds, semesters, completedCourses, plannedCodes, simulatorManualReqs]);

  // ------------ Save / Load / Delete Plans ------------
  const savePlan = async () => {
    if (!user || !planName.trim()) return;
    try {
      const newPlan: Plan = {
        name: planName.trim(),
        semesters,
        manualRequirements: simulatorManualReqs,
        createdAt: new Date().toISOString(),
      };

      const updatedPlans: Plan[] =
        selectedPlanToOverwrite !== null
          ? savedPlans.map((p, i) =>
              i === selectedPlanToOverwrite ? newPlan : p
            )
          : [...savedPlans, newPlan];

      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true }
      );
      setSavedPlans(updatedPlans);
      setPlanName("");
      setSelectedPlanToOverwrite(null);
      setShowSaveModal(false);
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  const loadPlan = (planIndex: number) => {
    if (planIndex < 0 || planIndex >= savedPlans.length) return;
    const plan = savedPlans[planIndex];
    setSemesters(plan.semesters);
    setSimulatorManualReqs(plan.manualRequirements ?? []);
    initialSemestersRef.current = JSON.parse(
      JSON.stringify(plan.semesters)
    ) as Semester[];

    const usedCodes = new Set<string>();
    plan.semesters.forEach((sem) =>
      sem.courses.forEach((course) => usedCodes.add(course.code))
    );

    setAvailableCourses(
      remainingCourses.filter(
        (c) =>
          !usedCodes.has(c.code) &&
          !completedCourses.some((cc) => cc.code === c.code)
      )
    );

    setShowPlansModal(false);
  };

  const deletePlan = async (planIndex: number) => {
    if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
    try {
      const updatedPlans = savedPlans.filter((_, i) => i !== planIndex);
      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true }
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
          (c) => c.status === "completed" || c.status === "in-progress"
        ),
      }))
    );
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken"
      )
    );
    setSimulatorManualReqs([]);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="mb-6">
          <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            Need to visualize? No problem.
          </h2>
          <p>
            Your interactive, tailor-made, drag-and-drop Yale degree simulator
            is here.
          </p>
        </div>
        <div className="flex items-start gap-1.5 flex-wrap">
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-gradient-to-br from-gray-800/60 to-gray-900/60 backdrop-blur-sm text-gray-300 hover:text-white border border-gray-700/40 hover:border-gray-600/50 flex items-center gap-1 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            <FiInfo size={12} />
            Help
          </button>
          {user && (
            <>
              <button
                onClick={() => setShowPlansModal(true)}
                className="px-2.5 py-1 text-[11px] rounded-lg bg-gradient-to-br from-blue-900/40 to-blue-950/40 backdrop-blur-sm text-blue-300 hover:text-blue-200 border border-blue-700/30 hover:border-blue-600/40 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                Load Plan
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className={`px-2.5 py-1 text-[11px] rounded-lg backdrop-blur-sm transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ${
                  hasChanges
                    ? "bg-gradient-to-br from-purple-900/40 to-purple-950/40 text-purple-300 hover:text-purple-200 border border-purple-700/30 hover:border-purple-600/40"
                    : "bg-gray-800/40 text-gray-500 border border-gray-700/30 opacity-60 cursor-not-allowed"
                }`}
                disabled={!hasChanges}
              >
                Save Plan
              </button>
            </>
          )}
          <button
            onClick={resetSimulator}
            className="px-2.5 py-1 text-[11px] rounded-lg bg-gradient-to-br from-red-900/40 to-red-950/40 backdrop-blur-sm text-red-300 hover:text-red-200 border border-red-700/30 hover:border-red-600/40 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-md rounded-xl border border-gray-800/50 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)]"
          >
            <h4 className="font-medium text-sm text-gray-300 mb-1.5">
              How to use the simulator
            </h4>
            <ul className="text-[11px] text-gray-400 space-y-1 list-disc list-inside">
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
                Click a course pill already added to a semester to remove it (if
                it's not completed/in-progress).
              </li>
              <li>
                Completed/in-progress are pre-assigned and cannot be dragged
                from the pool.
              </li>
              <li>Save or load plans to explore what-ifs and revisit later.</li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Major Progress Preview */}
      <div className="space-y-3">
        <div>
          <h3 className="text-lg font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            Major progress
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Live preview — reflects completed, in-progress, and courses placed on the grid.
          </p>
        </div>

        {isPreviewLoading && (
          <div className="text-sm text-gray-400">Updating preview…</div>
        )}
        {previewError && (
          <div className="text-sm text-red-300">{previewError}</div>
        )}

        <SimulatorRequirementsBreakdown
          majorIds={majorIds}
          previewProgress={previewProgress}
          plannedCodes={plannedCodes}
          simulatorManualReqs={simulatorManualReqs}
          onRemoveManualReq={(code, requirement) => {
            setSimulatorManualReqs((prev) =>
              prev.filter(
                (m) => !(m.code === code && m.requirement === requirement)
              )
            );
          }}
        />
      </div>

      {/* Available Courses Pool */}
      <div className="sticky top-0 z-30 mb-2" style={{ top: "0px" }}>
        <div className="bg-gradient-to-br from-pink-950/30 via-gray-900/50 to-gray-950/50 backdrop-blur-md rounded-xl border border-pink-800/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)] overflow-hidden">
          <button
            onClick={() => setShowPool(!showPool)}
            className={`flex items-center justify-between w-full p-3 ${
              showPool ? "border-b border-pink-800/30" : ""
            } text-gray-300 hover:bg-pink-900/20 transition-colors`}
          >
            <div className="flex items-center gap-2 font-medium text-sm">
              <div>Quick-add: Pool of remaining courses from your major</div>
              <div className="relative group">
                <Info className="h-3.5 w-3.5 text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" />
                <div className="absolute z-50 bottom-full mt-2 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-sm text-gray-300 text-[10px] px-2 py-1 rounded-md border border-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
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
                  <p className="text-[11px] text-gray-500 italic">
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
                        className="px-2 py-1 rounded-lg bg-pink-900/25 text-pink-300 border border-pink-700/40 text-xs cursor-grab active:cursor-grabbing select-none shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                      >
                        {course.code}
                        <span className="text-[10px] text-pink-200/50 ml-1">
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
              className={`bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-md rounded-xl border p-3 min-h-[160px] flex flex-col transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)]
                ${
                  hasInProgress(semester)
                    ? "border-blue-700/50 ring-1 ring-blue-500/30"
                    : "border-gray-800/50"
                }
                ${
                  hoveredSemester === semester.id &&
                  draggedCourse &&
                  !isPastSemester(semester.name)
                    ? "ring-2 ring-pink-400/60 scale-[0.98] bg-gray-800/60"
                    : ""
                }`}
            >
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium text-sm text-gray-300">{semester.name}</h4>
                <div className="flex items-center gap-1.5">
                  <span
                    className="px-1.5 py-0.5 rounded-md text-[10px] bg-gray-800/60 text-gray-300 border border-gray-700/40"
                    title="Sum of credits in this semester"
                  >
                    {semCreditsLabel} cr
                  </span>
                  {!isPastSemester(semester.name) && (
                    <button
                      onClick={() => setLookupSemesterId(semester.id)}
                      className="px-1.5 py-0.5 text-[10px] rounded-md bg-blue-900/30 text-blue-300 hover:bg-blue-800/40 border border-blue-800/40 transition-all"
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
                        ? "border-pink-400/60 bg-pink-900/15"
                        : "border-gray-700/50"
                    }`}
                >
                  <p className="text-[11px] text-gray-500 text-center opacity-70">
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
                            ? "bg-emerald-900/25 text-emerald-300 border-emerald-700/40"
                            : course.status === "in-progress"
                            ? "bg-blue-900/25 text-blue-300 border-blue-700/40"
                            : "bg-pink-900/20 text-pink-300 border-pink-700/40 hover:bg-pink-800/30 cursor-grab active:cursor-grabbing"
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
                                course.code
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95 backdrop-blur-md p-5 rounded-xl border border-gray-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative"
            >
              <h4 className="text-base font-medium mb-3 text-gray-200">
                {selectedPlanToOverwrite !== null
                  ? "Overwrite Plan"
                  : "Save New Plan"}
              </h4>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Enter a name for this plan"
                className="w-full px-3 py-2 text-sm bg-gray-800/60 border border-gray-700/50 rounded-lg text-gray-200 mb-3 focus:outline-none focus:border-purple-600/50"
              />

              {savedPlans.length > 0 && (
                <div className="mb-3">
                  <label className="block text-xs text-gray-500 mb-1.5">
                    Or overwrite existing plan:
                  </label>
                  <div className="max-h-36 overflow-y-auto border border-gray-700/40 rounded-lg">
                    {savedPlans.map((plan, index) => (
                      <div
                        key={`${plan.createdAt}-${index}`}
                        className={`p-2.5 border-b border-gray-700/40 cursor-pointer hover:bg-gray-800/40 text-sm transition-colors ${
                          selectedPlanToOverwrite === index
                            ? "bg-blue-900/25"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPlanToOverwrite(index);
                          setPlanName(plan.name);
                        }}
                      >
                        <div className="flex justify-between">
                          <span className="text-gray-300">{plan.name}</span>
                          <span className="text-[10px] text-gray-500">
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-1.5">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSelectedPlanToOverwrite(null);
                  }}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-700/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePlan}
                  disabled={!planName.trim() || !hasChanges}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                    planName.trim() && hasChanges
                      ? "bg-purple-900/40 text-purple-300 hover:bg-purple-800/40 border border-purple-700/40"
                      : "bg-gray-800/40 text-gray-500 border border-gray-700/30 cursor-not-allowed"
                  }`}
                >
                  {selectedPlanToOverwrite !== null ? "Overwrite" : "Save"}
                </button>
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
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPlansModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95 backdrop-blur-md p-5 rounded-xl border border-gray-800/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] relative"
              style={{ maxHeight: "80vh", height: "450px" }}
            >
              <h4 className="text-base font-medium mb-3 text-gray-200">
                Your Saved Plans
              </h4>
              {savedPlans.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-500 text-sm py-4">No saved plans found</p>
                </div>
              ) : (
                <div
                  className="overflow-y-auto space-y-2"
                  style={{ maxHeight: "calc(80vh - 120px)" }}
                >
                  {savedPlans.map((plan, index) => (
                    <div
                      key={`${plan.createdAt}-${index}`}
                      className="p-2.5 bg-gray-800/40 rounded-lg border border-gray-700/40"
                    >
                      <div className="flex justify-between items-center">
                        <h5 className="font-medium text-sm text-gray-300">
                          {plan.name}
                        </h5>
                        <div className="text-[10px] text-gray-500">
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex justify-end gap-1.5 mt-2">
                        <button
                          onClick={() => loadPlan(index)}
                          className="px-2 py-1 text-[11px] rounded-md bg-blue-900/30 text-blue-300 hover:bg-blue-800/40 border border-blue-800/30 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deletePlan(index)}
                          className="px-2 py-1 text-[11px] rounded-md bg-red-900/30 text-red-300 hover:bg-red-800/40 border border-red-800/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => setShowPlansModal(false)}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gray-800/60 text-gray-300 hover:bg-gray-700/60 border border-gray-700/40 transition-colors"
                >
                  Close
                </button>
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
                : sem
            )
          );

          // Auto-detect: prompt manual assignment if not in any requirement
          if (!isCourseInAnyRequirement(manualCourse.code)) {
            setManualAssignPending({
              course: manualCourse,
              semesterId: lookupSemesterId,
            });
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
    </div>
  );
}
