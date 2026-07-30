"use client";

import { gradePoints } from "@/lib/constants";

// Order the grade options high -> low (A, A-, B+, ... F) for the dropdown.
const GRADE_OPTIONS = Object.keys(gradePoints);

interface CourseGradeControlProps {
  value: string | null;
  onChange: (grade: string | null) => void;
  disabled?: boolean;
}

export default function CourseGradeControl({
  value,
  onChange,
  disabled = false,
}: CourseGradeControlProps) {
  return (
    <select
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      title="Projected grade"
      aria-label="Projected grade"
      className="text-[11px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">-</option>
      {GRADE_OPTIONS.map((g) => (
        <option key={g} value={g}>
          {g}
        </option>
      ))}
    </select>
  );
}
