"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { FiPlus, FiRefreshCw } from "react-icons/fi";
import { Course } from "@/lib/types";
import { toggleDistributionalTag } from "@/lib/distributionalTags";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { effectiveDistributionals } from "@/lib/utils/effectiveDistributionals";
import { StatCard } from "./StatCard";
import { CoursesLoadingSkeleton } from "./CoursesLoadingSkeleton";
import { OnboardingState } from "./OnboardingState";
import { CoursesFilterToolbar } from "./CoursesFilterToolbar";
import { SemesterCourseList } from "./SemesterCourseList";
import { FlatCourseList } from "./FlatCourseList";
import { PrivacyDisclaimer } from "./PrivacyDisclaimer";
import { useCourseFilters } from "./useCourseFilters";
import { useSemesterNavigation } from "./useSemesterNavigation";
import { computeStats, getNumericGPAColor } from "./helpers";
import {
  ConfirmDeleteState,
  CourseModalState,
  MyCoursesViewProps,
} from "./types";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal/ConfirmDeleteModal";
import CourseModal from "@/components/MajorProgressView/CourseModal";

export type { MyCoursesViewProps };

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
  onOpenSimulator,
}: MyCoursesViewProps) {
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

  const stats = useMemo(() => computeStats(courses), [courses]);

  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    semesterFilter,
    setSemesterFilter,
    sortKey,
    setSortKey,
    sortAsc,
    setSortAsc,
    allSemesters,
    filteredCourses,
    groupBySemester,
    semesterGroups,
    skippedCourses,
    clearFilters,
  } = useCourseFilters(courses);

  const {
    collapsedSemesters,
    loadedSemesterStorageKey,
    activeSemester,
    semesterSectionRefs,
    scrollContainerRef,
    semesterStorageKey,
    defaultOpenSemesterSet,
    defaultActiveSemester,
    toggleSemesterCollapse,
    jumpToSemester,
    semesterHasInProgress,
  } = useSemesterNavigation(semesterGroups, courses, user?.uid);

  const openCourseModal = (course: Course) => {
    setModalState({
      isOpen: true,
      course: {
        id: course.id,
        code: course.code,
        name: getCourseNameFromCode(course.code) ?? "Course",
        status: course.status,
        skipped: course.skipped || false,
        distributionals: effectiveDistributionals(course),
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

  const gpaStr = stats.gpa !== null ? stats.gpa.toFixed(2) : "N/A";

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
          onOpenSimulator={onOpenSimulator}
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

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* ---- Header ---- */}
      <div className="shrink-0 mb-4 lg:mb-6 flex flex-col sm:flex-row justify-between items-start gap-3">
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
            data-tour="courses-manual-add"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-pink-500/40 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-pink-600 dark:hover:text-pink-300 transition-all text-sm"
            title="Add courses manually"
          >
            <FiPlus size={14} />
            <span className="hidden sm:inline">Manual course add</span>
          </motion.button>
          <motion.button
            whileHover={{ y: -1 }}
            onClick={onReupload}
            data-tour="courses-reupload"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-blue-500/40 hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-300 transition-all text-sm"
          >
            <FiRefreshCw size={14} />
            <span className="hidden sm:inline">Re-upload transcript</span>
          </motion.button>
        </div>
      </div>

      {/* ---- Stat cards ---- */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
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
          infoTooltip="Weighted GPA across all completed, graded courses. Same math as the Academic Stats view."
        />
      </div>

      <CoursesFilterToolbar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        semesterFilter={semesterFilter}
        onSemesterFilterChange={setSemesterFilter}
        allSemesters={allSemesters}
        sortKey={sortKey}
        onSortKeyChange={setSortKey}
        sortAsc={sortAsc}
        onSortAscToggle={() => setSortAsc((v) => !v)}
        filteredCount={filteredCourses.length}
        totalCount={courses.length}
        onClearFilters={clearFilters}
      />

      {/* ---- Scrollable region: ONLY the course list + disclaimer scroll ---- */}
      <div
        ref={scrollContainerRef}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-clip -mx-1 px-1"
      >
        <div className="space-y-8">
          {groupBySemester && semesterGroups ? (
            <SemesterCourseList
              semesterGroups={semesterGroups}
              skippedCourses={skippedCourses}
              scrollContainerRef={scrollContainerRef}
              semesterSectionRefs={semesterSectionRefs}
              collapsedSemesters={collapsedSemesters}
              loadedSemesterStorageKey={loadedSemesterStorageKey}
              semesterStorageKey={semesterStorageKey}
              defaultOpenSemesterSet={defaultOpenSemesterSet}
              activeSemester={activeSemester}
              defaultActiveSemester={defaultActiveSemester}
              distSelectorCourseId={distSelectorCourseId}
              onManualAdd={onManualAdd}
              onToggleSemesterCollapse={toggleSemesterCollapse}
              onJumpToSemester={jumpToSemester}
              semesterHasInProgress={semesterHasInProgress}
              onCardClick={openCourseModal}
              onDeleteClick={openDeleteConfirm}
              onDistSelectorToggle={(id) =>
                setDistSelectorCourseId((prev) => (prev === id ? null : id))
              }
              onToggleDistributional={onToggleDistributional}
            />
          ) : (
            <FlatCourseList
              filteredCourses={filteredCourses}
              scrollContainerRef={scrollContainerRef}
              distSelectorCourseId={distSelectorCourseId}
              onCardClick={openCourseModal}
              onDeleteClick={openDeleteConfirm}
              onDistSelectorToggle={(id) =>
                setDistSelectorCourseId((prev) => (prev === id ? null : id))
              }
              onToggleDistributional={onToggleDistributional}
              onClearFilters={clearFilters}
            />
          )}
        </div>

        <PrivacyDisclaimer />
      </div>

      {/* ---- Modals ---- */}
      {/* Distributional editing retired here 2026-07-21: tags resolve in
          realtime from the catalog, so the modal is read-only for them
          (onToggleDistributional deliberately not passed). */}
      <CourseModal
        isOpen={modalState.isOpen}
        course={modalState.course}
        onClose={() => setModalState({ isOpen: false, course: null })}
        allowSkip={false}
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
