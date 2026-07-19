"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { FiInfo } from "react-icons/fi";

import {
  getMajorDescriptionById,
  getReqsForMajor,
  MajorProgress,
} from "@/lib/majors";
import { MAJORS } from "@/lib/majors";
import { useAuth } from "@/context/AuthContext";
import { skipCourse, unskipCourse } from "@/lib/utils/courseOperations";
import CourseModal from "./CourseModal";
import RequirementCard from "./RequirementCard";
import HeatMapView from "./HeatMapView";
import { STATUS_CLASSES, type ReqStats } from "./requirementStatus";
import AddManualCourseModal from "../AddManualCourseModal/AddManualCourseModal";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import { setDoc, doc } from "firebase/firestore";
import { getCourseInfo } from "@/lib/courseCatalog";
import { InfoCard } from "../ui/InfoCard";
import RequirementModal from "./RequirementModal";
import MajorTipModal, {
  MajorTipHelpButton,
  resetMajorTipSeen,
} from "./MajorTipModal";
import { Skeleton } from "@/components/ui/Skeleton";
import toast from "react-hot-toast";

function MajorProgressLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      {/* Progress bar card */}
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-neu">
        <Skeleton rounded="rounded-full" className="h-2 w-full" />
        <Skeleton rounded="rounded-lg" className="h-6 w-44 mt-2" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} rounded="rounded-xl" className="h-16" />
        ))}
      </div>
      {/* Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, c) => (
          <div
            key={c}
            className="rounded-xl border border-gray-200 dark:border-gray-800/50 p-3 space-y-3"
          >
            <Skeleton rounded="rounded-lg" className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, r) => (
              <Skeleton key={r} rounded="rounded-xl" className="h-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Requirement Modal (inline)
   ========================= */
type ReqOption = {
  code: string;
  name?: string;
  credits?: number;
  completed?: boolean;
  inProgress?: boolean;
  skipped?: boolean;
  manual?: boolean;
};

type Requirement = {
  id?: string;
  name: string;
  description?: string;
  required?: number; // credits or count, depending on schema
  options: ReqOption[];
};

function MajorStatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  infoTooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  infoTooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all relative shadow-neu"
    >
      {infoTooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {infoTooltip}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-medium mt-0.5 ${color}`}>{value}</p>
    </motion.div>
  );
}

export default function MajorProgressView({
  selectedMajor,
  progress,
  onRequirementChange,
  courses,
}: {
  selectedMajor: string;
  progress: MajorProgress;
  onRequirementChange: () => void;
  courses: Course[];
}) {
  const { user } = useAuth();
  const [showInProgressStats, setShowInProgressStats] = useState(false);
  const [view, setView] = useState<"board" | "heatmap">("board");
  const [mobileColumn, setMobileColumn] = useState<
    "remaining" | "inProgress" | "completed"
  >("remaining");

  // Restore the saved view on mount (client-only to avoid hydration mismatch).
  useEffect(() => {
    const saved = window.localStorage.getItem("myMajorView");
    if (saved === "board" || saved === "heatmap") setView(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("myMajorView", view);
  }, [view]);

  //help button
  const [forceMajorTipOpen, setForceMajorTipOpen] = useState(false);

  // manual add:
  const [manualCourseModal, setManualCourseModal] = useState<{
    isOpen: boolean;
    requirement: string;
  }>({ isOpen: false, requirement: "" });

  const [modalOpen, setModalOpen] = useState<{
    isOpen: boolean;
    course: {
      code: string;
      name: string;
      status: "completed" | "in-progress" | "not-taken" | "skipped";
      skipped: boolean;
    } | null;
  }>({ isOpen: false, course: null });

  // requirement modal state
  const [reqModal, setReqModal] = useState<{
    isOpen: boolean;
    req: Requirement | null;
  }>({ isOpen: false, req: null });

  const handleSkip = async (courseCode: string, courseName: string) => {
    if (!user) return;
    try {
      await skipCourse(user.uid, courseCode, courseName);
      await onRequirementChange();
    } catch (error) {
      console.error("Error skipping course:", error);
      toast.error("Failed to skip course. Please try again.");
    }
  };

  const handleUnskip = async (courseCode: string) => {
    if (!user) return;
    try {
      await unskipCourse(user.uid, courseCode);
      await onRequirementChange();
    } catch (error) {
      console.error("Error unskipping course:", error);
      toast.error("Failed to unskip course. Please try again.");
    }
  };

  const findCourseByCode = useCallback(
    (courseCode: string) =>
      courses.find((c) => {
        const courseInfo = getCourseInfo(c.code);
        if (!courseInfo) return c.code === courseCode;
        return courseInfo.codes.includes(courseCode);
      }),
    [courses],
  );

  const handleRemoveManualCourse = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;
    try {
      const courseToUpdate = findCourseByCode(courseCode);

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        toast.error("Course not found.");
        return;
      }

      const currentManual = courseToUpdate.manualRequirementsFulfilled || [];
      const updatedManual = currentManual.filter(
        (m) =>
          !(
            m.major_id === selectedMajor &&
            m.requirement_title === requirementTitle
          ),
      );

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          manualRequirementsFulfilled:
            updatedManual.length > 0 ? updatedManual : [],
        },
        { merge: true },
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error removing manual course:", error);
      toast.error("Failed to remove manual fulfillment. Please try again.");
    }
  };

  // Exclude a completed course from fulfilling a specific requirement
  const handleExcludeFromRequirement = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;

    if (
      !window.confirm(
        `Remove ${courseCode} from "${requirementTitle}"? You can undo this later.`,
      )
    ) {
      return;
    }

    try {
      const courseToUpdate = findCourseByCode(courseCode);

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        toast.error("Course not found.");
        return;
      }

      const currentExclusions = courseToUpdate.excludedFromRequirements || [];
      const newExclusion = {
        major_id: selectedMajor,
        requirement_title: requirementTitle,
      };

      const alreadyExcluded = currentExclusions.some(
        (e) =>
          e.major_id === selectedMajor &&
          e.requirement_title === requirementTitle,
      );

      if (alreadyExcluded) return;

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          excludedFromRequirements: [...currentExclusions, newExclusion],
        },
        { merge: true },
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error excluding course from requirement:", error);
      toast.error("Failed to exclude course from requirement. Please try again.");
    }
  };

  const handleReIncludeFromRequirement = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;
    try {
      const courseToUpdate = findCourseByCode(courseCode);

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        toast.error("Course not found.");
        return;
      }

      const currentExclusions = courseToUpdate.excludedFromRequirements || [];
      const updatedExclusions = currentExclusions.filter(
        (e) =>
          !(
            e.major_id === selectedMajor &&
            e.requirement_title === requirementTitle
          ),
      );

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          excludedFromRequirements:
            updatedExclusions.length > 0 ? updatedExclusions : [],
        },
        { merge: true },
      );

      await onRequirementChange();
      toast.success("Course re-included in requirement.");
    } catch (error) {
      console.error("Error re-including course in requirement:", error);
      toast.error("Failed to re-include course. Please try again.");
    }
  };

  // Calculate stats from server progress
  const completedCredits = progress?.completedCredits;
  const inProgressCredits = progress?.inProgressCredits || 0;
  const totalCredits = progress?.totalCredits;
  // Clamp to 0-100 so the bar fill can never render empty (NaN) or overflow.
  const clampPct = (n: number | undefined) =>
    Math.min(100, Math.max(0, Number.isFinite(n) ? (n as number) : 0));
  const completionPercentage = clampPct(progress?.percentage);
  const withInProgressPercentage = clampPct(
    progress?.inProgressPercentage ?? progress?.percentage,
  );

  // 1) Build status map from user's transcript across all alias codes
  const codeStatusMap = useMemo(() => {
    const m = new Map<
      string,
      "completed" | "in-progress" | "not-taken" | "skipped"
    >();
    for (const c of courses || []) {
      const info = getCourseInfo(c.code);
      const status =
        (c as any).status ||
        (c.grade === "In Progress"
          ? "in-progress"
          : c.grade
            ? "completed"
            : "not-taken");
      const codes = info?.codes?.length ? info.codes : [c.code];
      for (const k of codes) m.set(k, status);
    }
    return m;
  }, [courses]);

  const excludedLookup = useMemo(() => {
    const set = new Set<string>();
    for (const c of courses) {
      const info = getCourseInfo(c.code);
      const codes = info?.codes?.length ? info.codes : [c.code];
      for (const ex of c.excludedFromRequirements || []) {
        if (ex.major_id !== selectedMajor) continue;
        for (const code of codes) {
          set.add(`${ex.requirement_title}:${code}`);
        }
      }
    }
    return set;
  }, [courses, selectedMajor]);

  // 2) Normalize a single option using user's real status
  const normalizeOpt = useCallback(
    (opt: any) => {
      const status = codeStatusMap.get(opt.code);
      let inProgress = !!opt.inProgress;
      let completed = !!opt.completed;
      const skipped = !!opt.skipped;
      const manual = !!opt.manual;

      if (status === "in-progress") {
        inProgress = true;
        completed = false; // manual+in-progress must behave as in-progress
      } else if (status === "completed") {
        // Only set completed=true if the server didn't explicitly set it to false
        // (server sets completed=false when course is excluded from this requirement)
        if (opt.completed !== false) {
          completed = true;
        }
        inProgress = false;
      }
      return { ...opt, inProgress, completed, skipped, manual };
    },
    [codeStatusMap],
  );

  // 3) Normalize each requirement (completed + remaining buckets from server)
  const normalizeReq = useCallback(
    (req: any) => ({
      ...req,
      options: (req.options || []).map((opt: any) => ({
        ...normalizeOpt(opt),
        excluded: excludedLookup.has(`${req.name}:${opt.code}`),
      })),
    }),
    [normalizeOpt, excludedLookup],
  );

  const completedNorm = useMemo(
    () => (progress.completedRequirements || []).map(normalizeReq),
    [progress.completedRequirements, normalizeReq],
  );
  const inProgressNorm = useMemo(
    () => (progress.inProgressRequirements || []).map(normalizeReq),
    [progress.inProgressRequirements, normalizeReq],
  );
  const remainingNorm = useMemo(
    () => (progress.remainingRequirements || []).map(normalizeReq),
    [progress.remainingRequirements, normalizeReq],
  );

  // 4) Strict completed = sum of credits from options that are completed after normalization
  const strictCompletedReqs = useMemo(() => {
    return completedNorm.filter((req: any) => {
      const done = req.options
        .filter((o: any) => o.completed)
        .reduce((s: number, o: any) => s + (o.credits || 0), 0);
      return done >= (req.required || 0);
    });
  }, [completedNorm]);

  // 5) Demote any "completed" that isn't strictly completed
  const demotedFromCompleted = useMemo(() => {
    return completedNorm.filter((req: any) => {
      const done = req.options
        .filter((o: any) => o.completed)
        .reduce((s: number, o: any) => s + (o.credits || 0), 0);
      return done < (req.required || 0);
    });
  }, [completedNorm]);

  // ----- De-dupe + merge helpers -----
  const reqKeyFn = useCallback((req: any) => req.id ?? req.name, []);

  const mergeOptions = useCallback((opts: any[]) => {
    const map = new Map<string, any>();
    for (const o of opts) {
      const k = o.code;
      const prev = map.get(k);
      if (!prev) {
        map.set(k, { ...o });
      } else {
        map.set(k, {
          ...prev,
          inProgress: !!(prev.inProgress || o.inProgress),
          completed: !!(prev.completed || o.completed),
          skipped: !!(prev.skipped || o.skipped),
          manual: !!(prev.manual || o.manual),
          credits: Math.max(prev.credits ?? 0, o.credits ?? 0),
        });
      }
    }
    return Array.from(map.values());
  }, []);

  const mergeReq = useCallback(
    (a: any, b: any) => ({
      ...a,
      required: a.required ?? b.required,
      description: a.description ?? b.description,
      options: mergeOptions([...(a.options || []), ...(b.options || [])]),
    }),
    [mergeOptions],
  );

  // 6) Build remainingForUI WITHOUT duplicates
  // Includes: remainingNorm, inProgressNorm (from majors.ts), and demotedFromCompleted
  const remainingForUI = useMemo(() => {
    const map = new Map<string, any>();
    for (const r of remainingNorm) map.set(reqKeyFn(r), r);
    for (const r of inProgressNorm) {
      const k = reqKeyFn(r);
      map.set(k, map.has(k) ? mergeReq(map.get(k), r) : r);
    }
    for (const r of demotedFromCompleted) {
      const k = reqKeyFn(r);
      map.set(k, map.has(k) ? mergeReq(map.get(k), r) : r);
    }
    return Array.from(map.values());
  }, [remainingNorm, inProgressNorm, demotedFromCompleted, mergeReq, reqKeyFn]);

  // Precompute stats/splits for Remaining
  const withStats = useMemo(() => {
    return remainingForUI.map((req: any) => {
      const reqCompleted = req.options
        .filter((o: any) => o.completed)
        .reduce((sum: number, o: any) => sum + (o.credits || 0), 0);
      const reqInProgress = req.options
        .filter((o: any) => o.inProgress)
        .reduce((sum: number, o: any) => sum + (o.credits || 0), 0);
      return {
        req,
        reqCompleted,
        reqInProgress,
        notStarted: reqCompleted === 0 && reqInProgress === 0,
      };
    });
  }, [remainingForUI]);

  const inProgressReqs = useMemo(
    () =>
      withStats.filter(
        (r) => r.reqInProgress > 0 && r.reqCompleted < (r.req.required || 0),
      ),
    [withStats],
  );
  const idleReqs = useMemo(
    () =>
      withStats.filter(
        (r) => r.reqInProgress === 0 && r.reqCompleted < (r.req.required || 0),
      ),
    [withStats],
  );

  // Stable callbacks passed to subgrid
  const handleOpenCourse = useCallback((opt: any, reqName: string) => {
    setModalOpen({
      isOpen: true,
      course: {
        code: opt.code,
        name: opt.name,
        status: opt.skipped
          ? "skipped"
          : opt.inProgress
            ? "in-progress"
            : opt.completed
              ? "completed"
              : "not-taken",
        skipped: opt.skipped || false,
      },
    });
  }, []);

  const handleAddManual = useCallback(
    (reqName: string) => {
      setReqModal({ isOpen: false, req: null });
      setManualCourseModal({
        isOpen: true,
        requirement: `${selectedMajor}|${reqName}`,
      });
    },
    [selectedMajor],
  );

  // Completed requirements wrapped in the shared ReqStats shape
  const completedStats: ReqStats[] = useMemo(
    () =>
      strictCompletedReqs.map((req: any) => {
        const reqCompleted = req.options
          .filter((o: any) => o.completed)
          .reduce((s: number, o: any) => s + (o.credits || 0), 0);
        const reqInProgress = req.options
          .filter((o: any) => o.inProgress)
          .reduce((s: number, o: any) => s + (o.credits || 0), 0);
        return { req, reqCompleted, reqInProgress, notStarted: false };
      }),
    [strictCompletedReqs],
  );

  // Heat-map cells: every requirement, ordered by the major catalog
  const heatCells: ReqStats[] = useMemo(() => {
    const byName = new Map<string, ReqStats>();
    for (const s of completedStats) byName.set(s.req.name, s);
    for (const s of withStats) if (!byName.has(s.req.name)) byName.set(s.req.name, s);

    const catalog = getReqsForMajor(selectedMajor);
    if (!catalog) return Array.from(byName.values());

    const ordered: ReqStats[] = [];
    const seen = new Set<string>();
    for (const r of catalog.requirements) {
      const s = byName.get(r.name);
      if (s) {
        ordered.push(s);
        seen.add(r.name);
      }
    }
    for (const s of Array.from(byName.values()))
      if (!seen.has(s.req.name)) ordered.push(s);
    return ordered;
  }, [completedStats, withStats, selectedMajor]);

  const openRequirement = useCallback(
    (req: any) =>
      setReqModal({
        isOpen: true,
        req: {
          id: req.id,
          name: req.name,
          description: req.description,
          required: req.required,
          options: req.options,
        },
      }),
    [],
  );

  const cardHandlers = {
    onOpenCourse: handleOpenCourse,
    onUnskip: handleUnskip,
    onRemoveManual: handleRemoveManualCourse,
    onAddManual: handleAddManual,
    onOpenRequirement: openRequirement,
    onExcludeFromRequirement: handleExcludeFromRequirement,
    onReIncludeFromRequirement: handleReIncludeFromRequirement,
  };

  const columns: {
    key: "remaining" | "inProgress" | "completed";
    label: string;
    status: "notStarted" | "inProgress" | "completed";
    items: ReqStats[];
    credits: number;
    emptyText: string;
  }[] = [
    {
      key: "remaining",
      label: "Remaining",
      status: "notStarted",
      items: idleReqs,
      credits: progress.remainingCredits || 0,
      emptyText: "Nothing left here. Nice work!",
    },
    {
      key: "inProgress",
      label: "In progress",
      status: "inProgress",
      items: inProgressReqs,
      credits: inProgressCredits,
      emptyText: "No requirements currently in progress.",
    },
    {
      key: "completed",
      label: "Completed",
      status: "completed",
      items: completedStats,
      credits: completedCredits || 0,
      emptyText:
        "Upload your transcript on My courses to see completed requirements here.",
    },
  ];

  // Data not ready yet: show a skeleton instead of crashing on undefined stats.
  if (!progress) {
    return <MajorProgressLoadingSkeleton />;
  }

  return (
    <div className="space-y-6 font-louize">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">
            {MAJORS[selectedMajor]}
          </h3>
          <p className="text-sm text-gray-500">
            {getMajorDescriptionById(selectedMajor)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
            {showInProgressStats
              ? withInProgressPercentage.toFixed(0)
              : completionPercentage.toFixed(0)}
            %
          </div>
        </div>
      </div>

      <MajorTipHelpButton
        onClick={() => {
          resetMajorTipSeen("myMajorTipModalShown");
          setForceMajorTipOpen(true);
        }}
      />

      <MajorTipModal
        storageKey="myMajorTipModalShown"
        autoOpenOnMount
        forceOpen={forceMajorTipOpen}
        onDismiss={() => setForceMajorTipOpen(false)}
      />

      {/* Progress bar + Stats toggle - Compact neumorphic */}
      <div
        data-tour="major-progress-bar"
        className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu"
      >
        <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
          {/* Lighter in-progress segment sits behind, only in the +In Progress view. */}
          {showInProgressStats && (
            <motion.div
              key="inprogress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${withInProgressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full bg-purple-400 dark:bg-purple-500/70"
            />
          )}
          {/* Solid completed segment paints on top. Re-keyed per mode so it
              always animates to the correct completed width, including the
              Completed Only view where it is the only fill shown. */}
          <motion.div
            key={showInProgressStats ? "completed-fill-ip" : "completed-fill-only"}
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
          />
        </div>

        {/* Stats toggle */}
        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Show:
          </span>
          <button
            onClick={() => setShowInProgressStats(false)}
            className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              !showInProgressStats
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
            }`}
          >
            Completed Only
          </button>
          <button
            onClick={() => setShowInProgressStats(true)}
            className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              showInProgressStats
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
            }`}
          >
            + In Progress
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        className={`grid grid-cols-1 gap-4 ${
          showInProgressStats ? "md:grid-cols-3" : "md:grid-cols-2"
        }`}
      >
        <MajorStatCard
          label="Total Credits"
          value={
            showInProgressStats
              ? `${completedCredits + inProgressCredits}/${totalCredits}`
              : `${completedCredits}/${totalCredits}`
          }
          color={showInProgressStats ? "text-purple-600 dark:text-purple-300" : "text-blue-600 dark:text-blue-300"}
          infoTooltip="This shows your completed credits out of the total—including any prereqs!—required for your indicated major."
        />
        <MajorStatCard
          label="Completion"
          value={`${(showInProgressStats
            ? withInProgressPercentage
            : completionPercentage
          ).toFixed(0)}%`}
          color="text-emerald-600 dark:text-emerald-300"
        />
        {showInProgressStats && (
          <MajorStatCard
            label="In-progress Credits"
            value={`${inProgressCredits}`}
            color="text-blue-600 dark:text-blue-300"
            infoTooltip="Credits from courses you're currently taking that count toward this major but aren't finished yet."
          />
        )}
      </div>

      <div className="p-1" data-tour="major-manual-tip">
        <InfoCard
          autoHide
          previewText="A few tips on how to navigate this page. It's complex at first, we get it!"
        >
          Pro tip: Click on each course for actions and more info. Also, while
          our infrastructure is robust, sometimes there are cases where we
          weren't able to garner all plausible options for a given requirement;
          this is why we have enabled manual course fulfillment. Just click on
          the "Fulfill manually" button for that requirement and add a course
          from your transcript; we'll automatically count it towards your major
          progress and requirements stats. This also applies, for example, for
          interdepartmental courses and/or exceptions that your DUS has perhaps
          given you permission to use for a certain requirement, etc. Our
          platform is modular!
        </InfoCard>
      </div>

      {/* View switcher (sticky) */}
      <div
        data-tour="major-view-switcher"
        className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-gradient-to-b from-white via-white to-white/0 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/0 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              View:
            </span>
            <button
              type="button"
              onClick={() => setView("board")}
              data-tour="major-board-toggle"
              className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
                view === "board"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
              }`}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("heatmap")}
              data-tour="major-heatmap-toggle"
              className={`inline-flex items-center px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
                view === "heatmap"
                  ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
              }`}
            >
              Heat map
              <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/40">
                New
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Board view: Remaining · In progress · Completed columns */}
      {view === "board" && (
        <div>
          {/* Mobile column selector */}
          <div className="md:hidden flex items-center gap-1.5 mb-3">
            {columns.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileColumn(col.key)}
                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg transition-all duration-200 border ${
                  mobileColumn === col.key
                    ? "bg-gray-100 dark:bg-gray-800/60 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    : "bg-transparent border-gray-200 dark:border-gray-800/50 text-gray-400 dark:text-gray-500"
                }`}
              >
                {col.label} ({col.items.length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="major-requirements-board">
            {columns.map((col) => (
              <div
                key={col.key}
                className={`${
                  mobileColumn === col.key ? "flex" : "hidden"
                } md:flex flex-col rounded-xl border border-gray-200 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/20 max-h-[70vh]`}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md">
                  <h4
                    className={`font-medium text-sm ${STATUS_CLASSES[col.status].accent}`}
                  >
                    {col.label}
                  </h4>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {col.items.length} reqs · {col.credits} cr
                  </span>
                </div>
                <div className="overflow-y-auto p-3 space-y-3">
                  {col.items.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {col.emptyText}
                    </p>
                  ) : (
                    col.items.map((stats) => (
                      <RequirementCard
                        key={stats.req.id ?? stats.req.name}
                        stats={stats}
                        handlers={cardHandlers}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Heat map view */}
      {view === "heatmap" && (
        <div data-tour="major-heatmap-view">
          <HeatMapView cells={heatCells} onOpenRequirement={openRequirement} />
        </div>
      )}

      {/* Course Info Modal */}
      <CourseModal
        isOpen={modalOpen.isOpen}
        course={modalOpen.course}
        onClose={() => setModalOpen({ isOpen: false, course: null })}
        onSkip={handleSkip}
        onRefresh={onRequirementChange}
      />

      <AddManualCourseModal
        isOpen={manualCourseModal.isOpen}
        requirement={manualCourseModal.requirement}
        onClose={() => setManualCourseModal({ isOpen: false, requirement: "" })}
        onSuccess={onRequirementChange}
        userCourses={courses}
      />
      {/* Requirement Modal */}
      <RequirementModal
        isOpen={reqModal.isOpen}
        requirement={reqModal.req}
        onClose={() => setReqModal({ isOpen: false, req: null })}
        onOpenCourse={handleOpenCourse}
        onUnskip={handleUnskip}
        onRemoveManual={handleRemoveManualCourse}
        onAddManual={(reqName) => handleAddManual(reqName)}
        onSkip={handleSkip}
      />
    </div>
  );
}
