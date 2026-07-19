"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiInfo,
  FiPlus,
  FiRefreshCw,
} from "react-icons/fi";
import { Course } from "@/lib/types";
import {
  codesReferToSameCourse,
  getCanonicalCode,
  resolveCanonicalCode,
} from "@/lib/courseCatalog";
import toast from "react-hot-toast";
import { useAuth } from "@/context/AuthContext";
import ManualCourseLookupModal from "./ManualCourseLookupModal";
import SimulatorManualAssignModal from "./SimulatorManualAssignModal";
import SimulatorRequirementsBreakdown from "./SimulatorRequirementsBreakdown";
import SimulatorGradesSection from "./SimulatorGradesSection";
import SimulatorDistributionalsSection from "./SimulatorDistributionalsSection";
import SimulatorPlanModals from "./SimulatorPlanModals";
import SimulatorSemesterBoard from "./SimulatorSemesterBoard";
import {
  calculatePreviewMajorProgressByMajors,
  ManualRequirementEntry,
  majorRequirements,
} from "@/lib/majors";
import type { GPAEntry } from "@/lib/gpa";
import { allocateDistributionals } from "@/lib/distributionalAllocation";
import type {
  MaybeCreditFields,
  PlannedCoursePick,
  PreviewProgressMap,
  Semester,
  SimulatorProps,
} from "./simulatorTypes";
import { getCourseCredits } from "./simulatorUtils";
import { useSimulatorDragDrop } from "./useSimulatorDragDrop";
import { useSimulatorPlans } from "./useSimulatorPlans";

// ----------------- Component -----------------
export default function Simulator({
  remainingCourses,
  completedCourses,
  graduationYear,
  userMajors,
  onRegisterNavCheck,
}: SimulatorProps) {
  const { user } = useAuth();

  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const [lookupSemesterId, setLookupSemesterId] = useState<string | null>(null);
  const [showPool, setShowPool] = useState(false);
  const [showMajorPreview, setShowMajorPreview] = useState(true);
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

  const {
    savedPlans,
    planName,
    setPlanName,
    showSaveModal,
    setShowSaveModal,
    showPlansModal,
    setShowPlansModal,
    selectedPlanToOverwrite,
    setSelectedPlanToOverwrite,
    hasChanges,
    showDistributionals,
    setShowDistributionals,
    showGrades,
    setShowGrades,
    showPlanSelector,
    setShowPlanSelector,
    currentPlanName,
    distribAutoAllocate,
    distribOverrides,
    loadedPlanIndex,
    loadedPlanIsDefault,
    initialSemestersRef,
    initialManualReqsRef,
    planLoadedRef,
    hasInitializedRef,
    hasChangesRef,
    currentPlanNameRef,
    savePlan,
    loadPlan,
    setDefaultPlan,
    deletePlan,
    resetSimulator: resetPlans,
  } = useSimulatorPlans({
    user,
    semesters,
    setSemesters,
    simulatorManualReqs,
    setSimulatorManualReqs,
    remainingCourses,
    completedCourses,
    setAvailableCourses,
    onRegisterNavCheck,
  });

  // Manual assignment modal state
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

  const {
    draggedCourse,
    hoveredSemester,
    setHoveredSemester,
    selectedPoolCourse,
    setSelectedPoolCourse,
    handleDragStart,
    placeCourseInSemester,
    handleDrop,
    removeCourseFromSemester,
    updatePlannedCourse,
    clearDragState,
  } = useSimulatorDragDrop({
    semesters,
    setSemesters,
    setAvailableCourses,
    remainingCourses,
    isCourseInAnyRequirement,
    showAutoMatchToast,
    setManualAssignPending,
    setSimulatorManualReqs,
  });

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
          !completedCourses.some((cc) =>
            codesReferToSameCourse(cc.code, rc.code),
          ) &&
          rc.status === "not-taken",
      ),
    );
    hasInitializedRef.current = true;
  }, [graduationYear, remainingCourses, completedCourses]);

  // ------------ Scroll detection for sticky nav ------------
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

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

  const resetSimulator = () => {
    resetPlans();
    setSelectedPoolCourse(null);
  };

  // ----------------- Render -----------------
  return (
    <div
      className="space-y-4 font-louize"
      onDragEnd={clearDragState}
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
          <div className="flex items-center gap-3 min-w-0 sm:flex-1">
            <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider shrink-0">
              Plan:
            </span>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] min-w-0 max-w-full">
              {currentPlanName ? (
                <>
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${hasChanges ? "bg-amber-400 animate-pulse" : "bg-emerald-400"}`}
                  />
                  <span
                    className="text-base font-medium text-gray-800 dark:text-gray-200 truncate"
                    title={currentPlanName}
                  >
                    {currentPlanName}
                  </span>
                  {loadedPlanIsDefault && (
                    <span className="text-[9px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/40 shrink-0">
                      Default
                    </span>
                  )}
                  {hasChanges && (
                    <span className="text-xs text-amber-400 ml-1 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 shrink-0">
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
          <div className="flex items-center gap-2 flex-wrap shrink-0" data-tour="simulator-plan-actions">
            <button
              type="button"
              onClick={() => setShowGrades((v) => !v)}
              aria-pressed={showGrades}
              className={`px-4 py-2 text-sm rounded-xl backdrop-blur-sm border flex items-center gap-2 transition-all ${
                showGrades
                  ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/15 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 hover:border-emerald-400/40"
                  : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              GPA
            </button>
            <button
              type="button"
              onClick={() => setShowDistributionals((v) => !v)}
              aria-pressed={showDistributionals}
              className={`px-4 py-2 text-sm rounded-xl backdrop-blur-sm border flex items-center gap-2 transition-all ${
                showDistributionals
                  ? "bg-gradient-to-r from-purple-500/15 to-blue-500/15 text-purple-600 dark:text-purple-300 border-purple-500/30 hover:border-purple-400/40"
                  : "bg-black/[0.04] dark:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border-black/[0.06] dark:border-white/[0.08]"
              }`}
            >
              Distributionals
            </button>
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
                  onClick={() => {
                    // Default to overwriting the currently-loaded plan (if any).
                    if (loadedPlanIndex >= 0) {
                      setSelectedPlanToOverwrite(loadedPlanIndex);
                      setPlanName(savedPlans[loadedPlanIndex]?.name ?? "");
                    } else {
                      setSelectedPlanToOverwrite(null);
                      setPlanName("");
                    }
                    setShowSaveModal(true);
                  }}
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
      <div className="space-y-3" data-tour="simulator-live-progress">
        <button
          onClick={() => setShowMajorPreview((v) => !v)}
          className="w-full flex items-start justify-between text-left group"
          aria-expanded={showMajorPreview}
        >
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Progress toward {majorIds.length > 1 ? "majors" : "major"}
            </h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Live preview — reflects completed, in-progress, and courses placed
              on the grid.
            </p>
          </div>
          <FiChevronDown
            className={`mt-1 shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${
              showMajorPreview ? "rotate-180" : ""
            }`}
            size={18}
          />
        </button>

        <AnimatePresence initial={false}>
          {showMajorPreview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden space-y-3"
            >
              {isPreviewLoading && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Updating preview…
                </div>
              )}
              {previewError && (
                <div className="text-sm text-red-600 dark:text-red-300">
                  {previewError}
                </div>
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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live GPA / Distributionals add-on sections */}
      {(showGrades || showDistributionals) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {showGrades && (
            <SimulatorGradesSection terms={gpaTimelineTerms} />
          )}
          {showDistributionals && (
            <SimulatorDistributionalsSection
              assignments={[
                ...completedDistAssignments,
                ...plannedDistAssignments,
              ]}
            />
          )}
        </div>
      )}

      <SimulatorSemesterBoard
        semesters={semesters}
        availableCourses={availableCourses}
        showPool={showPool}
        setShowPool={setShowPool}
        showGrades={showGrades}
        showDistributionals={showDistributionals}
        draggedCourse={draggedCourse}
        hoveredSemester={hoveredSemester}
        setHoveredSemester={setHoveredSemester}
        selectedPoolCourse={selectedPoolCourse}
        setSelectedPoolCourse={setSelectedPoolCourse}
        handleDragStart={handleDragStart}
        placeCourseInSemester={placeCourseInSemester}
        handleDrop={handleDrop}
        removeCourseFromSemester={removeCourseFromSemester}
        updatePlannedCourse={updatePlannedCourse}
        onAddCourse={setLookupSemesterId}
      />

      <SimulatorPlanModals
        savedPlans={savedPlans}
        planName={planName}
        setPlanName={setPlanName}
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        showPlansModal={showPlansModal}
        setShowPlansModal={setShowPlansModal}
        showPlanSelector={showPlanSelector}
        setShowPlanSelector={setShowPlanSelector}
        selectedPlanToOverwrite={selectedPlanToOverwrite}
        setSelectedPlanToOverwrite={setSelectedPlanToOverwrite}
        hasChanges={hasChanges}
        savePlan={savePlan}
        loadPlan={loadPlan}
        setDefaultPlan={setDefaultPlan}
        deletePlan={deletePlan}
      />

      {/* Manual Course Lookup Modal */}
      <ManualCourseLookupModal
        isOpen={lookupSemesterId !== null}
        onClose={() => setLookupSemesterId(null)}
        onSelect={(manualCourse) => {
          if (!lookupSemesterId || !manualCourse?.code) return;

          const courseToAdd = {
            ...manualCourse,
            code: resolveCanonicalCode(manualCourse.code),
          };

          const isDuplicate = semesters.some((s) =>
            s.courses.some((c) =>
              codesReferToSameCourse(c.code, courseToAdd.code),
            ),
          );
          if (isDuplicate) {
            toast.error("This course is already on your plan.");
            return;
          }

          setSemesters((prev) =>
            prev.map((sem) =>
              sem.id === lookupSemesterId
                ? { ...sem, courses: [...sem.courses, courseToAdd] }
                : sem,
            ),
          );

          setAvailableCourses((prev) =>
            prev.filter(
              (c) => !codesReferToSameCourse(c.code, courseToAdd.code),
            ),
          );

          // Auto-detect: prompt manual assignment if not in any requirement
          if (!isCourseInAnyRequirement(courseToAdd.code)) {
            setManualAssignPending({
              course: courseToAdd,
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

    </div>
  );
}
