"use client";

import { RefObject } from "react";
import { Course } from "@/lib/types";
import { CardBoop } from "./CardBoop";
import { CourseCard } from "./CourseCard";

interface FlatCourseListProps {
  filteredCourses: Course[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  distSelectorCourseId: string | null;
  onCardClick: (course: Course) => void;
  onDeleteClick: (course: Course) => void;
  onDistSelectorToggle: (courseId: string) => void;
  onToggleDistributional: (courseId: string, dist: string) => Promise<void>;
  onClearFilters: () => void;
}

export function FlatCourseList({
  filteredCourses,
  scrollContainerRef,
  distSelectorCourseId,
  onCardClick,
  onDeleteClick,
  onDistSelectorToggle,
  onToggleDistributional,
  onClearFilters,
}: FlatCourseListProps) {
  if (filteredCourses.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-gray-400 dark:text-gray-500">
          No courses match your filters.
        </p>
        <button
          onClick={onClearFilters}
          className="mt-2 text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline underline-offset-2"
        >
          Clear all filters
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {filteredCourses.map((course, idx) => (
        <CardBoop
          key={course.id || `${course.code}-${idx}`}
          scrollRef={scrollContainerRef}
        >
          <CourseCard
            course={course}
            distSelectorCourseId={distSelectorCourseId}
            onCardClick={onCardClick}
            onDeleteClick={onDeleteClick}
            onDistSelectorToggle={onDistSelectorToggle}
            onToggleDistributional={onToggleDistributional}
          />
        </CardBoop>
      ))}
    </div>
  );
}
