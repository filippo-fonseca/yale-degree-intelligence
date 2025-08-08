"use client";

import { MajorProgress } from "@/lib/majors";
import { MAJORS } from "@/lib/majors";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiChevronDown, FiInfo, FiPlus } from "react-icons/fi";
import { skipCourse, unskipCourse } from "@/lib/utils/courseOperations";
import CourseModal from "./CourseModal";
import DegreeIntelligenceBlurb from "./DegreeIntelligenceBlurb";
import AddManualCourseModal from "../AddManualCourseModal/AddManualCourseModal";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import { setDoc, doc } from "firebase/firestore";
import { getCourseInfo } from "@/lib/courseCatalog";
import { InfoCard } from "../ui/InfoCard";

// Status color mapping for course pills
function getCourseStatusColor({
  completed,
  inProgress,
  skipped,
  grade,
}: {
  completed: boolean;
  inProgress: boolean;
  skipped?: boolean;
  grade?: string | null;
}) {
  if (skipped)
    return "bg-gray-800 text-gray-300 border border-dashed border-gray-600";
  if (completed && grade && grade !== "In Progress")
    return "bg-emerald-900/20 text-emerald-300 border border-emerald-700";
  if (inProgress || grade === "In Progress")
    return "bg-blue-900/20 text-blue-300 border border-blue-700";
  return "bg-amber-900/20 text-amber-300 border border-amber-700";
}

function MajorStatCard({
  label,
  value,
  color = "text-white",
  infoTooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  infoTooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all relative"
    >
      {infoTooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-4 h-4 text-gray-400 hover:text-gray-300" />
          <div className="absolute z-10 right-0 w-48 p-2 text-xs text-gray-300 bg-gray-800 rounded-md shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {infoTooltip}
          </div>
        </div>
      )}
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`text-xl font-medium mt-1 ${color}`}>{value}</p>
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
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState({
    completed: true,
    remaining: true,
  });
  const [showInProgressStats, setShowInProgressStats] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  //manual add:
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

  const handleSkip = async (courseCode: string, courseName: string) => {
    if (!user) return;
    try {
      await skipCourse(user.uid, courseCode, courseName);
      await onRequirementChange();
    } catch (error) {
      console.error("Error skipping course:", error);
    }
  };

  const handleUnskip = async (courseCode: string) => {
    if (!user) return;
    try {
      await unskipCourse(user.uid, courseCode);
      await onRequirementChange();
    } catch (error) {
      console.error("Error unskipping course:", error);
    }
  };

  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
    };
  }, [dropdownOpen]);

  const toggleDropdown = (reqIdx: number, optIdx: number) => {
    const key = `${reqIdx}-${optIdx}`;
    setDropdownOpen(dropdownOpen === key ? null : key);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRemoveManualCourse = async (
    courseCode: string,
    requirementTitle: string
  ) => {
    if (!user) return;

    try {
      // Find the course in the courses array by checking all possible codes
      const courseToUpdate = courses.find((c) => {
        const courseInfo = getCourseInfo(c.code);
        if (!courseInfo) return false;
        return courseInfo.codes.includes(courseCode);
      });

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        return;
      }

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          ...courseToUpdate,
          manualRequirementsFulfilled: null,
        },
        { merge: true }
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error removing manual course:", error);
    }
  };

  // Calculate stats
  const completedCredits = progress.completedCredits;
  const inProgressCredits = progress.inProgressCredits || 0;
  const totalCredits = progress.totalCredits;
  const completionPercentage = progress.percentage;
  const withInProgressPercentage =
    progress.inProgressPercentage || progress.percentage;

  // ---------------------------
  // NORMALIZATION LAYER
  // ---------------------------
  // 1) Build status map from user's transcript across all alias codes
  const codeStatusMap = new Map<
    string,
    "completed" | "in-progress" | "not-taken" | "skipped"
  >();
  for (const c of courses || []) {
    const info = getCourseInfo(c.code);
    // infer a status if your Course type doesn't store it explicitly
    const status =
      (c.status as any) ||
      (c.grade === "In Progress"
        ? "in-progress"
        : c.grade
        ? "completed"
        : "not-taken");
    const codes = info?.codes?.length ? info.codes : [c.code];
    for (const k of codes) codeStatusMap.set(k, status);
  }

  // 2) Normalize a single option using user's real status
  const normalizeOpt = (opt: any) => {
    const status = codeStatusMap.get(opt.code);
    let inProgress = !!opt.inProgress;
    let completed = !!opt.completed;
    const skipped = !!opt.skipped;
    const manual = !!opt.manual;

    if (status === "in-progress") {
      inProgress = true;
      completed = false; // ensure manual+in-progress is treated as in-progress, not completed
    } else if (status === "completed") {
      completed = true;
      inProgress = false;
    }
    // else, leave original flags

    return { ...opt, inProgress, completed, skipped, manual };
  };

  // 3) Normalize each requirement (completed + remaining buckets from server)
  const normalizeReq = (req: any) => ({
    ...req,
    options: (req.options || []).map(normalizeOpt),
  });

  const completedNorm = (progress.completedRequirements || []).map(
    normalizeReq
  );
  const remainingNorm = (progress.remainingRequirements || []).map(
    normalizeReq
  );

  // 4) Strict completed = sum of credits from options that are completed after normalization
  const strictCompletedReqs = completedNorm.filter((req: any) => {
    const done = req.options
      .filter((o: any) => o.completed)
      .reduce((s: number, o: any) => s + (o.credits || 0), 0);
    return done >= (req.required || 0);
  });

  // 5) Demote any "completed" that isn't strictly completed
  const demotedFromCompleted = completedNorm.filter((req: any) => {
    const done = req.options
      .filter((o: any) => o.completed)
      .reduce((s: number, o: any) => s + (o.credits || 0), 0);
    return done < (req.required || 0);
  });

  // ----- De-dupe + merge helpers -----
  const reqKey = (req: any) => req.id ?? req.name; // stable key (prefer id if you have it)

  const mergeOptions = (opts: any[]) => {
    const map = new Map<string, any>();
    for (const o of opts) {
      const k = o.code;
      const prev = map.get(k);
      if (!prev) {
        map.set(k, { ...o });
      } else {
        map.set(k, {
          ...prev,
          // OR the boolean flags so we don't lose state
          inProgress: !!(prev.inProgress || o.inProgress),
          completed: !!(prev.completed || o.completed),
          skipped: !!(prev.skipped || o.skipped),
          manual: !!(prev.manual || o.manual),
          // keep one credits value (assume same); if they differ, prefer the max
          credits: Math.max(prev.credits ?? 0, o.credits ?? 0),
        });
      }
    }
    return Array.from(map.values());
  };

  const mergeReq = (a: any, b: any) => {
    // prefer a's top-level fields, merge options
    return {
      ...a,
      required: a.required ?? b.required,
      description: a.description ?? b.description,
      options: mergeOptions([...(a.options || []), ...(b.options || [])]),
    };
  };

  // Build remainingForUI WITHOUT duplicates
  const remainingByKey = new Map<string, any>();
  for (const r of remainingNorm) {
    remainingByKey.set(reqKey(r), r);
  }
  for (const r of demotedFromCompleted) {
    const k = reqKey(r);
    if (remainingByKey.has(k)) {
      remainingByKey.set(k, mergeReq(remainingByKey.get(k), r));
    } else {
      remainingByKey.set(k, r);
    }
  }
  const remainingForUI = Array.from(remainingByKey.values());

  return (
    <div className="space-y-6 font-louize">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            {MAJORS[selectedMajor]}
          </h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            {showInProgressStats
              ? withInProgressPercentage.toFixed(0)
              : completionPercentage.toFixed(0)}
            %
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-900 rounded-full h-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{
            width: `${
              showInProgressStats
                ? withInProgressPercentage
                : completionPercentage
            }%`,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
        />
      </div>

      {/* Stats toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">Show:</span>
        <button
          onClick={() => setShowInProgressStats(false)}
          className={`px-3 py-1 text-xs rounded-full ${
            !showInProgressStats
              ? "bg-blue-900/50 text-blue-300 border border-blue-700"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Completed Credits Only
        </button>
        <button
          onClick={() => setShowInProgressStats(true)}
          className={`px-3 py-1 text-xs rounded-full ${
            showInProgressStats
              ? "bg-purple-900/50 text-purple-300 border border-purple-700"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700"
          }`}
        >
          Including In Progress Credits
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MajorStatCard
          label="Total Credits"
          value={
            showInProgressStats
              ? `${completedCredits + inProgressCredits}/${totalCredits}`
              : `${completedCredits}/${totalCredits}`
          }
          color={showInProgressStats ? "text-purple-300" : "text-blue-300"}
          infoTooltip="This shows your completed credits out of the total—including any prereqs!—required for your indicated major."
        />
        <MajorStatCard
          label="Completion"
          value={`${(showInProgressStats
            ? withInProgressPercentage
            : completionPercentage
          ).toFixed(0)}%`}
          color="text-emerald-300"
        />
      </div>

      <DegreeIntelligenceBlurb />

      <InfoCard
        autoHide
        previewText="A few tips on how to navegate this page. It's complex at first, we get it!"
      >
        Pro tip: Click on each course for actions and more info. Also, while our
        infrastructure is robust, sometimes there are cases where we weren't
        able to garner all plausible options for a given requirement; this is
        why we have enabled manual course fulfillment. Just click on the
        "Fulfill manually" button for that requirement and add a course from
        your transcript; we'll automatically count it towards your major
        progress and requirements stats. This also applies, for example, for
        interdepartmental courses and/or excpetions that your DUS has perhaps
        given you permission to use for a certain requirement, etc. Our platform
        is modular!
      </InfoCard>

      {/* Requirements Sections */}
      <div className="space-y-6">
        {/* Completed Requirements (STRICT after normalization) */}
        {strictCompletedReqs.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => toggleSection("completed")}
              className="flex items-center gap-2 text-emerald-300 hover:text-emerald-200 transition-colors"
            >
              <motion.div
                animate={{ rotate: expandedSections.completed ? 0 : -90 }}
              >
                <FiChevronDown />
              </motion.div>
              <h4 className="font-medium">
                Completed ({progress.completedCredits}/{progress.totalCredits}{" "}
                credits)
              </h4>
            </button>

            <AnimatePresence>
              {expandedSections.completed && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {strictCompletedReqs.map((req: any, i: number) => {
                      const isFullyCompleted = true; // by construction
                      const hasManualCourses = req.options.some(
                        (o: any) => o.manual
                      );

                      return (
                        <motion.div
                          key={`completed-${i}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className={`p-4 rounded-xl border ${
                            isFullyCompleted
                              ? "bg-emerald-900/10 border-emerald-800/30"
                              : "bg-amber-900/10 border-amber-800/30"
                          }`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h5
                              className={`font-medium ${
                                isFullyCompleted
                                  ? "text-emerald-300"
                                  : "text-amber-300"
                              }`}
                            >
                              {req.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              <span className="text-xs bg-emerald-900/20 text-emerald-300 px-2 py-1 rounded-full">
                                ✓
                              </span>
                            </div>
                          </div>
                          {req.description && (
                            <p className="text-xs mb-3 text-emerald-300/80">
                              {req.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-1.5">
                            {req.options
                              .filter(
                                (opt: any) =>
                                  opt.completed || opt.manual || opt.skipped
                              )
                              .map((opt: any, j: number) => (
                                <div
                                  key={`opt-${j}`}
                                  className={`relative px-2 py-0.5 rounded-full text-xs flex items-center ${
                                    opt.manual
                                      ? "bg-purple-900/20 text-purple-300 border border-purple-700"
                                      : opt.completed
                                      ? "bg-emerald-900/20 text-emerald-300 border border-emerald-700"
                                      : "bg-gray-900/20 text-gray-300 border border-dashed border-gray-600"
                                  }`}
                                >
                                  {opt.code}
                                  <span className="ml-1 text-[0.65rem]">
                                    ({opt.credits}cr
                                    {opt.manual && ", manual"}
                                    {opt.skipped && ", skipped"})
                                  </span>
                                  {(opt.skipped || opt.manual) && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (opt.skipped) {
                                          handleUnskip(opt.code);
                                        } else if (opt.manual) {
                                          handleRemoveManualCourse(
                                            opt.code,
                                            req.name
                                          );
                                        }
                                      }}
                                      className="ml-1 text-[0.65rem] text-gray-400 hover:text-gray-200"
                                      title={
                                        opt.manual
                                          ? "Remove manual course"
                                          : "Unskip this course"
                                      }
                                    >
                                      <FiX size={10} />
                                    </button>
                                  )}
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Remaining Requirements (normalized + demoted) */}
        {remainingForUI.length > 0 && (
          <div className="space-y-4">
            <button
              onClick={() => toggleSection("remaining")}
              className="flex items-center gap-2 text-amber-300 hover:text-amber-200 transition-colors"
            >
              <motion.div
                animate={{ rotate: expandedSections.remaining ? 0 : -90 }}
              >
                <FiChevronDown />
              </motion.div>
              <h4 className="font-medium">
                Remaining (
                {remainingForUI.reduce(
                  (total: number, req: any) => total + (req.required || 0),
                  0
                )}{" "}
                credits)
              </h4>
            </button>

            <AnimatePresence>
              {expandedSections.remaining && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  {(() => {
                    const withStats = remainingForUI.map((req: any) => {
                      const reqCompleted = req.options
                        .filter((o: any) => o.completed)
                        .reduce(
                          (sum: number, o: any) => sum + (o.credits || 0),
                          0
                        );
                      const reqInProgress = req.options
                        .filter((o: any) => o.inProgress)
                        .reduce(
                          (sum: number, o: any) => sum + (o.credits || 0),
                          0
                        );
                      return { req, reqCompleted, reqInProgress };
                    });

                    const inProgressReqs = withStats.filter(
                      (r) =>
                        r.reqInProgress > 0 &&
                        r.reqCompleted < (r.req.required || 0)
                    );
                    const idleReqs = withStats.filter(
                      (r) =>
                        r.reqInProgress === 0 &&
                        r.reqCompleted < (r.req.required || 0)
                    );

                    const SectionGrid = ({
                      title,
                      subtitleClass,
                      items,
                      emptyText,
                    }: {
                      title: string;
                      subtitleClass: string;
                      items: {
                        req: any;
                        reqCompleted: number;
                        reqInProgress: number;
                      }[];
                      emptyText: string;
                    }) => (
                      <div className="space-y-3">
                        <div className={`text-sm font-medium ${subtitleClass}`}>
                          {title}{" "}
                          <span className="text-gray-400 font-normal">
                            ({items.length})
                          </span>
                        </div>
                        {items.length === 0 ? (
                          <div className="text-xs text-gray-500">
                            {emptyText}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map(
                              (
                                { req, reqCompleted, reqInProgress },
                                reqIdx
                              ) => {
                                const notStarted =
                                  reqCompleted === 0 && reqInProgress === 0;

                                return (
                                  <motion.div
                                    key={`remaining-${req.name}-${reqIdx}`}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: reqIdx * 0.03 }}
                                    className={`p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border transition-all relative ${
                                      reqInProgress > 0
                                        ? "border-blue-800/40 hover:border-blue-500/40"
                                        : notStarted
                                        ? "border-red-800/30 hover:border-red-500/30"
                                        : "border-amber-800/30 hover:border-amber-500/30"
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-2">
                                      <h5
                                        className={`font-medium ${
                                          reqInProgress > 0
                                            ? "text-blue-300"
                                            : notStarted
                                            ? "text-red-300"
                                            : "text-amber-300"
                                        }`}
                                      >
                                        {req.name}
                                      </h5>
                                      <div className="flex items-center gap-2">
                                        <span
                                          className={`text-xs px-2 py-1 rounded-full ${
                                            reqInProgress > 0
                                              ? "bg-blue-900/20 text-blue-300"
                                              : notStarted
                                              ? "bg-red-900/20 text-red-300"
                                              : "bg-amber-900/20 text-amber-300"
                                          }`}
                                        >
                                          {reqInProgress + reqCompleted}/
                                          {req.required}
                                        </span>
                                      </div>
                                    </div>

                                    {req.description && (
                                      <p
                                        className={`text-xs mb-3 ${
                                          reqInProgress > 0
                                            ? "text-blue-300/80"
                                            : notStarted
                                            ? "text-red-300/80"
                                            : "text-amber-300/80"
                                        }`}
                                      >
                                        {req.description}
                                      </p>
                                    )}

                                    <div className="flex flex-wrap gap-1.5">
                                      {req.options.map(
                                        (opt: any, optIdx: number) => (
                                          <div
                                            key={`opt-${opt.code}-${optIdx}`}
                                            className={`relative px-2 py-0.5 rounded-full text-xs flex items-center transition-all duration-150 cursor-pointer hover:scale-[1.05] ${
                                              opt.manual
                                                ? "bg-purple-900/20 text-purple-300 border border-purple-700"
                                                : opt.completed
                                                ? "bg-emerald-900/20 text-emerald-300 border border-emerald-700"
                                                : opt.inProgress
                                                ? "bg-blue-900/20 text-blue-300 border border-blue-700"
                                                : opt.skipped
                                                ? "bg-gray-900/20 text-gray-300 border border-dashed border-gray-600"
                                                : notStarted
                                                ? "bg-red-900/20 text-red-300 border border-red-700"
                                                : "bg-amber-900/20 text-amber-300 border border-amber-700"
                                            }`}
                                            onClick={() => {
                                              if (
                                                !opt.completed &&
                                                !opt.skipped
                                              ) {
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
                                                    skipped:
                                                      opt.skipped || false,
                                                  },
                                                });
                                              }
                                            }}
                                          >
                                            {opt.code}
                                            <span className="ml-1 text-[0.65rem]">
                                              ({opt.credits}cr
                                              {opt.manual
                                                ? ", manual"
                                                : opt.skipped
                                                ? ", skipped"
                                                : opt.inProgress
                                                ? ", in progress"
                                                : opt.completed
                                                ? ", complete"
                                                : ""}
                                              )
                                            </span>
                                            {(opt.skipped || opt.manual) && (
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  if (opt.skipped) {
                                                    handleUnskip(opt.code);
                                                  } else if (opt.manual) {
                                                    handleRemoveManualCourse(
                                                      opt.code,
                                                      req.name
                                                    );
                                                  }
                                                }}
                                                className="ml-1 text-[0.65rem] text-gray-400 hover:text-gray-200"
                                                title={
                                                  opt.manual
                                                    ? "Remove manual course"
                                                    : "Unskip this course"
                                                }
                                              >
                                                <FiX size={10} />
                                              </button>
                                            )}
                                          </div>
                                        )
                                      )}

                                      {/* Add manual course button */}
                                      <button
                                        onClick={() =>
                                          setManualCourseModal({
                                            isOpen: true,
                                            requirement: `${selectedMajor}|${req.name}`,
                                          })
                                        }
                                        className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 ${
                                          reqInProgress > 0
                                            ? "bg-blue-900/20 text-blue-300 hover:bg-blue-800/30"
                                            : notStarted
                                            ? "bg-red-900/20 text-red-300 hover:bg-red-800/30"
                                            : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                                        } transition-colors`}
                                        title="Add a course manually for this requirement"
                                      >
                                        <FiPlus size={12} />
                                        Fulfill manually
                                      </button>
                                    </div>
                                  </motion.div>
                                );
                              }
                            )}
                          </div>
                        )}
                      </div>
                    );

                    return (
                      <div className="space-y-6">
                        {/* Subsection: In Progress */}
                        <SectionGrid
                          title="Currently in progress"
                          subtitleClass="text-blue-300"
                          items={inProgressReqs}
                          emptyText="No requirements currently in progress."
                        />

                        {/* Subsection: Not started / No current progress */}
                        <SectionGrid
                          title="Not started / no current progress"
                          subtitleClass="text-red-300"
                          items={idleReqs}
                          emptyText="Everything here has some progress — nice!"
                        />
                      </div>
                    );
                  })()}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

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
    </div>
  );
}
