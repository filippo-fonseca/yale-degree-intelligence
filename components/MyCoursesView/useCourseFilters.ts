import { useMemo, useState } from "react";
import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { sortSemesters } from "./helpers";
import { SortKey, StatusFilter } from "./types";

export function useCourseFilters(courses: Course[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [semesterFilter, setSemesterFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("semester");
  const [sortAsc, setSortAsc] = useState(true);

  const allSemesters = useMemo(() => {
    const keys = Array.from(
      new Set(
        courses.filter((c) => !c.skipped).map((c) => `${c.semester} ${c.year}`),
      ),
    ).sort((a, b) => sortSemesters(b, a));
    return keys;
  }, [courses]);

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

    const sorted = Array.from(map.entries()).sort(
      ([a], [b]) => sortSemesters(b, a),
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

  const clearFilters = () => {
    setStatusFilter("all");
    setSemesterFilter("all");
    setSearchQuery("");
  };

  return {
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
  };
}
