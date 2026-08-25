"use client";

import { FiArrowDown, FiArrowUp, FiSearch, FiX } from "react-icons/fi";
import { SelectMenu, type SelectMenuOption } from "../ui/SelectMenu";
import { SortKey, StatusFilter } from "./types";

const STATUS_OPTIONS: SelectMenuOption<StatusFilter>[] = [
  { value: "all", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "in-progress", label: "In progress" },
  { value: "skipped", label: "Skipped" },
];

const SORT_OPTIONS: SelectMenuOption<SortKey>[] = [
  { value: "semester", label: "By semester" },
  { value: "code", label: "By code" },
  { value: "grade", label: "By grade" },
  { value: "credits", label: "By credits" },
];

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

  const semesterOptions: SelectMenuOption<string>[] = [
    { value: "all", label: "All semesters" },
    ...allSemesters.map((semester) => ({ value: semester, label: semester })),
  ];

  return (
    // One hairline card, the same surface as everything else on the page. The
    // three filters were native selects, which paint their own menu: on a dark
    // page the highlighted row came back in the operating system's blue, and
    // the panel could not be styled to match anything around it.
    <div className="shrink-0 z-20 mb-6 rounded-2xl border border-black/[0.08] bg-white p-3 dark:border-white/[0.09] dark:bg-white/[0.03]">
      <div className="flex flex-col gap-2 sm:flex-row">
        {/* Search */}
        <div className="relative min-w-0 flex-1">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search by code or name..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="w-full rounded-xl border border-black/[0.08] bg-white py-2 pl-9 pr-8 font-sf text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black/25 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-white/25"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchQueryChange("")}
              aria-label="Clear search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-colors hover:text-gray-700 dark:hover:text-gray-200"
            >
              <FiX className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <SelectMenu
          label="Filter by status"
          value={statusFilter}
          options={STATUS_OPTIONS}
          onChange={onStatusFilterChange}
          className="sm:w-40"
          menuWidth={160}
        />

        <SelectMenu
          label="Filter by semester"
          value={semesterFilter}
          options={semesterOptions}
          onChange={onSemesterFilterChange}
          className="sm:w-44"
          menuWidth={176}
        />

        <div className="flex items-center gap-1.5">
          <SelectMenu
            label="Sort courses"
            value={sortKey}
            options={SORT_OPTIONS}
            onChange={onSortKeyChange}
            className="min-w-0 flex-1 sm:w-40"
            menuWidth={160}
          />
          <button
            type="button"
            onClick={onSortAscToggle}
            className="shrink-0 rounded-xl border border-black/[0.08] bg-white p-2 text-gray-500 transition-colors hover:border-black/[0.16] hover:text-gray-900 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-white/[0.18] dark:hover:text-white"
            title={sortAsc ? "Ascending" : "Descending"}
            aria-label={sortAsc ? "Sort ascending" : "Sort descending"}
          >
            {sortAsc ? (
              <FiArrowUp className="h-3.5 w-3.5" />
            ) : (
              <FiArrowDown className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Active filter summary */}
      {hasActiveFilters && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            Showing {filteredCount} of {totalCount}
          </span>
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-black/[0.08] px-2.5 py-0.5 font-sf text-[11px] text-gray-500 transition-colors hover:border-black/20 hover:text-gray-900 dark:border-white/[0.1] dark:text-gray-400 dark:hover:border-white/25 dark:hover:text-white"
          >
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
