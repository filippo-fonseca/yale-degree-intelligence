"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiPlus,
  FiRefreshCw,
  FiChevronDown,
  FiSearch,
  FiX,
} from "react-icons/fi";
import Link from "next/link";
import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { getGPAColor as getLetterGradeColor } from "@/lib/utils/utils";

/** Color class for a numeric GPA value (matches StatsView's logic). */
function getNumericGPAColor(gpa: number): string {
  if (gpa >= 3.7) return "text-emerald-600 dark:text-emerald-300";
  if (gpa >= 3.3) return "text-blue-600 dark:text-blue-300";
  if (gpa >= 2.9) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { StatCard } from "./StatCard";
import { CourseCard } from "./CourseCard";
import { CoursesLoadingSkeleton } from "./CoursesLoadingSkeleton";
import { OnboardingState } from "./OnboardingState";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal/ConfirmDeleteModal";
import CourseModal from "@/components/MajorProgressView/CourseModal";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

interface ConfirmDeleteState {
  open: boolean;
  course: Course | null;
}

interface CourseModalState {
  isOpen: boolean;
  course: {
    id: string;
    code: string;
    name: string;
    status: "completed" | "in-progress" | "not-taken" | "skipped";
    skipped: boolean;
    distributionals: string[];
  } | null;
}

export interface MyCoursesViewProps {
  courses: Course[];
  hasData: boolean;
  coursesLoading: boolean;
  user: {
    displayName: string | null;
    uid: string;
  } | null;
  isBrandNew: boolean;
  /** Handlers lifted from page.tsx */
  onManualAdd: (semester?: string) => void;
  onReupload: () => void;
  onUploadSuccess: (text: string) => Promise<void>;
  onDeleteCourse: (course: Course) => Promise<void>;
  onToggleDistributional: (courseId: string, dist: string) => Promise<void>;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const SEMESTER_ORDER = { Spring: 0, Summer: 1, Fall: 2 } as const;

function sortSemesters(a: string, b: string): number {
  const [semA, yearA] = a.split(" ");
  const [semB, yearB] = b.split(" ");
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);
  if (yA !== yB) return yA - yB;
  return (
    (SEMESTER_ORDER[semA as keyof typeof SEMESTER_ORDER] ?? 99) -
    (SEMESTER_ORDER[semB as keyof typeof SEMESTER_ORDER] ?? 99)
  );
}

function computeStats(courses: Course[]) {
  let totalCourses = 0;
  let completedCount = 0;
  let inProgressCount = 0;
  let earnedCredits = 0;
  let totalGradePoints = 0;
  let gradedCredits = 0;

  for (const c of courses) {
    if (c.skipped) continue;
    totalCourses++;

    if (c.status === "in-progress") {
      inProgressCount++;
      continue;
    }

    if (c.status === "completed") {
      completedCount++;
      if (c.grade && gradePoints[c.grade] !== undefined) {
        const pts = gradePoints[c.grade];
        const cr = c.credits || 1;
        earnedCredits += cr;
        totalGradePoints += pts * cr;
        gradedCredits += cr;
      }
    }
  }

  const gpa = gradedCredits > 0 ? totalGradePoints / gradedCredits : null;

  return { totalCourses, completedCount, inProgressCount, earnedCredits, gpa };
}

type SortKey = "semester" | "code" | "grade" | "credits";
type StatusFilter = "all" | "completed" | "in-progress" | "skipped";

/* ------------------------------------------------------------------ */
/*  Main component                                                      */
/* ------------------------------------------------------------------ */

export default function MyCoursesView({
  courses,
  hasData,
  coursesLoading,
  user,
  isBrandNew,
  onManualAdd,
  onReupload,
  onUploadSuccess,
  onDeleteCourse,
  onToggleDistributional,
}: MyCoursesViewProps) {
  /* ---------- local state ---------- */
  const [collapsedSemesters, setCollapsedSemesters] = useState<Set<string>>(
    new Set(),
  );
  const [distSelectorCourseId, setDistSelectorCourseId] = useState<
    string | null
  >(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState>({
    open: false,
    course: null,
  });
  const [modalState, setModalState] = useState<CourseModalState>({
    isOpen: false,
    course: null,
  });

  /* ---------- search / filter / sort ---------- */
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("semester");
  const [sortAsc, setSortAsc] = useState(true);

  /* ---------- derived stats ---------- */
  const stats = useMemo(() => computeStats(courses), [courses]);

  /* ---------- all semester keys (for filter dropdown) ---------- */
  const allSemesters = useMemo(() => {
    const keys = Array.from(
      new Set(
        courses.filter((c) => !c.skipped).map((c) => `${c.semester} ${c.year}`),
      ),
    ).sort(sortSemesters);
    return keys;
  }, [courses]);

  /* ---------- filtered + sorted courses ---------- */
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Status filter
    if (statusFilter !== "all") {
      if (statusFilter === "skipped") {
        result = result.filter((c) => c.skipped);
      } else {
        result = result.filter(
          (c) => !c.skipped && c.status === statusFilter,
        );
      }
    }

    // Semester filter
    if (semesterFilter !== "all") {
      result = result.filter(
        (c) => `${c.semester} ${c.year}` === semesterFilter,
      );
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((c) => {
        const name = getCourseNameFromCode(c.code)?.toLowerCase() ?? "";
        return c.code.toLowerCase().includes(q) || name.includes(q);
      });
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "semester") {
        cmp = sortSemesters(
          `${a.semester} ${a.year}`,
          `${b.semester} ${b.year}`,
        );
        if (cmp === 0) cmp = a.code.localeCompare(b.code);
      } else if (sortKey === "code") {
        cmp = a.code.localeCompare(b.code);
      } else if (sortKey === "grade") {
        const ga = a.grade ? (gradePoints[a.grade] ?? -1) : -1;
        const gb = b.grade ? (gradePoints[b.grade] ?? -1) : -1;
        cmp = gb - ga; // higher GPA first by default
      } else if (sortKey === "credits") {
        cmp = (b.credits || 0) - (a.credits || 0);
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [courses, statusFilter, semesterFilter, searchQuery, sortKey, sortAsc]);

  /* ---------- grouped by semester (only when not filtering by specific semester and sort=semester) ---------- */
  const groupBySemester =
    semesterFilter === "all" && sortKey === "semester" && !searchQuery.trim();

  const semesterGroups = useMemo(() => {
    if (!groupBySemester) return null;

    const map = new Map<string, Course[]>();
    for (const c of filteredCourses) {
      // skipped courses go into their own group at the end
      if (c.skipped) continue;
      const key = `${c.semester} ${c.year}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }

    const sorted = Array.from(map.entries()).sort(([a], [b]) =>
      sortSemesters(a, b),
    );
    return sorted;
  }, [filteredCourses, groupBySemester]);

  const skippedCourses = useMemo(
    () =>
      courses.filter((c) => c.skipped).filter((c) => {
        if (statusFilter !== "all" && statusFilter !== "skipped") return false;
        if (semesterFilter !== "all") return false;
        return true;
      }),
    [courses, statusFilter, semesterFilter],
  );

  /* ---------- helpers ---------- */
  const toggleSemesterCollapse = (key: string) => {
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const semesterHasInProgress = (key: string) =>
    courses.some(
      (c) =>
        `${c.semester} ${c.year}` === key &&
        c.status === "in-progress" &&
        !c.skipped,
    );

  const openCourseModal = (course: Course) => {
    setModalState({
      isOpen: true,
      course: {
        id: course.id,
        code: course.code,
        name: getCourseNameFromCode(course.code) ?? "Course",
        status: course.status,
        skipped: course.skipped || false,
        distributionals: course.distributionals || [],
      },
    });
  };

  const openDeleteConfirm = (course: Course) =>
    setConfirmDelete({ open: true, course });
  const closeDeleteConfirm = () =>
    setConfirmDelete({ open: false, course: null });

  const handleDeleteConfirm = async () => {
    if (confirmDelete.course) {
      await onDeleteCourse(confirmDelete.course);
    }
    closeDeleteConfirm();
  };

  /* ---------- render helpers ---------- */
  const gpaStr =
    stats.gpa !== null ? stats.gpa.toFixed(2) : "N/A";

  /* ================================================================ */
  /*  Early states                                                     */
  /* ================================================================ */
  if (coursesLoading) {
    return (
      <div className="p-6">
        <CoursesLoadingSkeleton />
      </div>
    );
  }

  if (!hasData) {
    return (
      <>
        <OnboardingState
          userName={user?.displayName ?? null}
          isBrandNew={isBrandNew}
          onManualEntry={onManualAdd}
          onUploadSuccess={onUploadSuccess}
        />
        <ConfirmDeleteModal
          isOpen={confirmDelete.open}
          course={confirmDelete.course}
          onCancel={closeDeleteConfirm}
          onConfirm={handleDeleteConfirm}
        />
      </>
    );
  }

  /* ================================================================ */
  /*  Loaded state                                                     */
  /* ================================================================ */
  return (
    <div className="space-y-6">
      {/* ---- Header ---- */}
      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row justify-between items-start gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
            Your academic journey at Yale
            {user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.
          </h2>
          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mt-1">
            All your classes, grades, and in-progress courses.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <motion.button
            whileHover={{ y: -1 }}
            onClick={() => onManualAdd()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-pink-500/40 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-300 transition-all text-sm"
            title="Add courses manually"
          >
            <FiPlus size={14} />
            <span className="hidden sm:inline">Manual add</span>
          </motion.button>
          <motion.button
            whileHover={{ y: -1 }}
            onClick={onReupload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-blue-500/40 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all text-sm"
          >
            <FiRefreshCw size={14} />
            <span className="hidden sm:inline">Re-upload transcript</span>
          </motion.button>
        </div>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard
          label="Total courses"
          value={stats.totalCourses}
          color="text-gray-900 dark:text-white"
        />
        <StatCard
          label="Completed"
          value={stats.completedCount}
          color="text-emerald-600 dark:text-emerald-300"
        />
        <StatCard
          label="In progress"
          value={stats.inProgressCount}
          color="text-blue-600 dark:text-blue-300"
        />
        <StatCard
          label="Credits earned"
          value={stats.earnedCredits}
          color="text-purple-600 dark:text-purple-300"
          infoTooltip="Credits from completed, graded courses (excluding in-progress and skipped)."
        />
        <StatCard
          label="Cumulative GPA"
          value={gpaStr}
          color={
            stats.gpa !== null ? getNumericGPAColor(stats.gpa) : "text-gray-400"
          }
          infoTooltip="Weighted GPA across all completed, graded courses — same math as the Academic Stats view."
        />
      </div>

      {/* ---- Search + filter + sort controls ---- */}
      <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu">
        <div className="flex flex-col sm:flex-row gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by code or name…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="py-1.5 px-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
          >
            <option value="all">All statuses</option>
            <option value="completed">Completed</option>
            <option value="in-progress">In progress</option>
            <option value="skipped">Skipped</option>
          </select>

          {/* Semester filter */}
          <select
            value={semesterFilter}
            onChange={(e) => setSemesterFilter(e.target.value)}
            className="py-1.5 px-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
          >
            <option value="all">All semesters</option>
            {allSemesters.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Sort */}
          <div className="flex items-center gap-1">
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="py-1.5 px-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
            >
              <option value="semester">By semester</option>
              <option value="code">By code</option>
              <option value="grade">By grade</option>
              <option value="credits">By credits</option>
            </select>
            <button
              onClick={() => setSortAsc((v) => !v)}
              className="px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
              title={sortAsc ? "Ascending" : "Descending"}
            >
              {sortAsc ? "↑" : "↓"}
            </button>
          </div>
        </div>

        {/* Active filter summary */}
        {(statusFilter !== "all" ||
          semesterFilter !== "all" ||
          searchQuery) && (
          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
              Showing {filteredCourses.length} of {courses.length}
            </span>
            <button
              onClick={() => {
                setStatusFilter("all");
                setSemesterFilter("all");
                setSearchQuery("");
              }}
              className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* ---- Course list ---- */}
      <div className="space-y-8">
        {groupBySemester && semesterGroups ? (
          /* Grouped by semester */
          <>
            {semesterGroups.map(([semester, semCourses]) => {
              const isCollapsed = collapsedSemesters.has(semester);
              const hasInProgress = semesterHasInProgress(semester);

              return (
                <motion.div
                  key={semester}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mb-6"
                >
                  {/* Header row: collapse toggle + add-course button as siblings
                      (never a button nested in a button). */}
                  <div className="flex items-center justify-between mb-3 gap-2">
                    <button
                      onClick={() => toggleSemesterCollapse(semester)}
                      className="flex-1 min-w-0 flex items-center justify-between group"
                      aria-expanded={!isCollapsed}
                      aria-label={`${isCollapsed ? "Expand" : "Collapse"} ${semester}`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                          {semester}
                        </h3>
                        {hasInProgress && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-300">
                            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                            In Progress
                          </span>
                        )}
                        <span className="text-xs text-gray-400 dark:text-gray-600">
                          {semCourses.length} course
                          {semCourses.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <motion.div
                        animate={{ rotate: isCollapsed ? 0 : 180 }}
                        transition={{ duration: 0.2 }}
                        className="p-1 rounded-md text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 group-hover:bg-black/[0.04] dark:group-hover:bg-white/[0.05] transition-all"
                      >
                        <FiChevronDown size={16} />
                      </motion.div>
                    </button>
                    <motion.button
                      whileHover={{ y: -1 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onManualAdd(semester);
                      }}
                      data-add-semester={semester}
                      aria-label={`Add a course to ${semester}`}
                      title={`Add a course to ${semester}`}
                      className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-lg border bg-transparent border-gray-200 dark:border-gray-700/50 text-gray-500 dark:text-gray-400 hover:border-pink-500/40 hover:text-pink-600 dark:hover:text-pink-300 transition-all text-xs"
                    >
                      <FiPlus size={13} />
                      <span className="hidden sm:inline">Add course</span>
                    </motion.button>
                  </div>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {semCourses.map((course, idx) => (
                            <CourseCard
                              key={course.id || `${course.code}-${idx}`}
                              course={course}
                              distSelectorCourseId={distSelectorCourseId}
                              onCardClick={openCourseModal}
                              onDeleteClick={openDeleteConfirm}
                              onDistSelectorToggle={(id) =>
                                setDistSelectorCourseId((prev) =>
                                  prev === id ? null : id,
                                )
                              }
                              onToggleDistributional={onToggleDistributional}
                            />
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Skipped courses section */}
            {skippedCourses.length > 0 && (
              <SkippedSection
                courses={skippedCourses}
                hasMultipleMajors={false}
              />
            )}
          </>
        ) : (
          /* Flat list (search active or non-semester sort) */
          <>
            {filteredCourses.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  No courses match your filters.
                </p>
                <button
                  onClick={() => {
                    setStatusFilter("all");
                    setSemesterFilter("all");
                    setSearchQuery("");
                  }}
                  className="mt-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredCourses.map((course, idx) => (
                  <CourseCard
                    key={course.id || `${course.code}-${idx}`}
                    course={course}
                    distSelectorCourseId={distSelectorCourseId}
                    onCardClick={openCourseModal}
                    onDeleteClick={openDeleteConfirm}
                    onDistSelectorToggle={(id) =>
                      setDistSelectorCourseId((prev) =>
                        prev === id ? null : id,
                      )
                    }
                    onToggleDistributional={onToggleDistributional}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ---- Privacy disclaimer ---- */}
      <div className="mt-10 p-4 rounded-xl bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/80 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-gray-950/40 border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
          <span className="font-medium text-gray-600 dark:text-gray-400">
            By using DegreeIntelligence, you voluntarily share your grades.
          </span>{" "}
          Your transcript PDF is processed locally and is{" "}
          <span className="text-emerald-600 dark:text-emerald-400/80">
            never stored
          </span>{" "}
          on our servers. However, we do store your course and grade data in our
          database (private only to your profile) to provide you with insights,
          progress tracking, and recommendations for your major. By uploading
          academic information, you confirm that you are providing your own data
          and consent to its storage and processing for academic planning
          purposes.{" "}
          <Link
            href="/terms"
            target="_blank"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2"
          >
            Read our full terms
          </Link>
          .
        </p>
        <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
          DegreeIntelligence is{" "}
          <span className="font-medium">not affiliated</span> in any way, shape,
          or form with Yale University, Yale College, or DegreeAudit. We are
          simply a free, student-built personal project that we wanted to share
          with the community because we genuinely found it helpful for ourselves.
        </p>
      </div>

      {/* ---- Modals ---- */}
      <CourseModal
        isOpen={modalState.isOpen}
        course={modalState.course}
        onClose={() => setModalState({ isOpen: false, course: null })}
        allowSkip={false}
        onToggleDistributional={async (courseId, dist) => {
          await onToggleDistributional(courseId, dist);
          // Sync modal state so the modal UI reflects the change immediately
          setModalState((prev) => {
            if (!prev.course || prev.course.id !== courseId) return prev;
            const cur = prev.course.distributionals || [];
            const next = cur.includes(dist)
              ? cur.filter((d) => d !== dist)
              : [...cur, dist];
            return { ...prev, course: { ...prev.course, distributionals: next } };
          });
        }}
      />

      <ConfirmDeleteModal
        isOpen={confirmDelete.open}
        course={confirmDelete.course}
        onCancel={closeDeleteConfirm}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skipped courses section                                             */
/* ------------------------------------------------------------------ */

function SkippedSection({
  courses,
  hasMultipleMajors,
}: {
  courses: Course[];
  hasMultipleMajors: boolean;
}) {

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-8"
    >
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          "Skipped" courses for your major{hasMultipleMajors ? "s" : ""}
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          You indicated in the{" "}
          <i>My major</i> page that you qualify to "skip" these classes, which
          fulfill requirements.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id || `skipped-${course.code}-${idx}`}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.12 }}
            className="p-4 rounded-xl bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-950/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/40 border-l-2 border-l-gray-300 dark:border-l-gray-700 shadow-sm dark:shadow-none"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  {course.code}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {getCourseNameFromCode(course.code)}
                </p>
                <span className="inline-block mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {course.credits} credit{course.credits !== 1 ? "s" : ""}
                </span>
              </div>
              {course.grade && (
                <span
                  className={`text-lg font-medium ${getLetterGradeColor(course.grade)}`}
                >
                  {course.grade}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
