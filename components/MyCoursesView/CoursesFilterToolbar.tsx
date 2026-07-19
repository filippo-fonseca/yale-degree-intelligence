"use client";

import { FiSearch, FiX } from "react-icons/fi";
import { SortKey, StatusFilter } from "./types";

interface CoursesFilterToolbarProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  semesterFilter: string;
  onSemesterFilterChange: (value: string) => void;
  allSemesters: string[];
  sortKey: SortKey;
  onSortKeyChange: (value: SortKey) => void;
  sortAsc: boolean;
  onSortAscToggle: () => void;
  filteredCount: number;
  totalCount: number;
  onClearFilters: () => void;
}

export function CoursesFilterToolbar({
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  semesterFilter,
  onSemesterFilterChange,
  allSemesters,
  sortKey,
  onSortKeyChange,
  sortAsc,
  onSortAscToggle,
  filteredCount,
  totalCount,
  onClearFilters,
}: CoursesFilterToolbarProps) {
  const hasActiveFilters =
    statusFilter !== "all" || semesterFilter !== "all" || searchQuery;

  return (
    <div className="shrink-0 z-20 mb-6 p-3 rounded-xl bg-white/95 dark:bg-gray-950/80 dark:bg-gradient-to-br dark:from-gray-900/80 dark:via-gray-900/70 dark:to-gray-950/80 backdrop-blur-xl border border-gray-200 dark:border-gray-800/50 shadow-neu">
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code or name…"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-sm rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchQueryChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) =>
            onStatusFilterChange(e.target.value as StatusFilter)
          }
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
          onChange={(e) => onSemesterFilterChange(e.target.value)}
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
            onChange={(e) => onSortKeyChange(e.target.value as SortKey)}
            className="py-1.5 px-2 text-sm rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
          >
            <option value="semester">By semester</option>
            <option value="code">By code</option>
            <option value="grade">By grade</option>
            <option value="credits">By credits</option>
          </select>
          <button
            onClick={onSortAscToggle}
            className="px-2 py-1.5 text-xs rounded-lg bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-all"
            title={sortAsc ? "Ascending" : "Descending"}
          >
            {sortAsc ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Showing {filteredCount} of {totalCount}
          </span>
          <button
            onClick={onClearFilters}
            className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-all"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
