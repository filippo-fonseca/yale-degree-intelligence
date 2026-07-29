import { useEffect, useMemo, useRef, useState } from "react";
import { Course } from "@/lib/types";
import { getDefaultOpenSemesters } from "./helpers";
import { SemesterOpenPrefs } from "./types";

export function useSemesterNavigation(
  semesterGroups: [string, Course[]][] | null,
  courses: Course[],
  userUid: string | undefined,
) {
  const [collapsedSemesters, setCollapsedSemesters] = useState<Set<string>>(
    new Set(),
  );
  const [loadedSemesterStorageKey, setLoadedSemesterStorageKey] = useState<
    string | null
  >(null);
  const [activeSemester, setActiveSemester] = useState<string | null>(null);
  const semesterSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const semesterStorageKey = useMemo(
    () => `ydi:my-courses:open-semesters:${userUid ?? "anonymous"}`,
    [userUid],
  );

  const defaultOpenSemesterSet = useMemo(
    () => new Set(semesterGroups ? getDefaultOpenSemesters(semesterGroups) : []),
    [semesterGroups],
  );

  const defaultActiveSemester = useMemo(() => {
    if (!semesterGroups) return null;
    return (
      getDefaultOpenSemesters(semesterGroups)[0] ?? semesterGroups[0]?.[0] ?? null
    );
  }, [semesterGroups]);

  useEffect(() => {
    if (!semesterGroups) return;

    const semesterKeys = semesterGroups.map(([semester]) => semester);
    const semesterKeySet = new Set(semesterKeys);
    let openSemesters: string[] | null = null;
    let knownSemesters: string[] | null = null;

    try {
      const raw = window.localStorage.getItem(semesterStorageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as SemesterOpenPrefs | string[];
        if (Array.isArray(parsed)) {
          openSemesters = parsed;
        } else if (
          parsed &&
          Array.isArray(parsed.openSemesters) &&
          Array.isArray(parsed.knownSemesters)
        ) {
          openSemesters = parsed.openSemesters;
          knownSemesters = parsed.knownSemesters;
        }
      }
    } catch {
      openSemesters = null;
      knownSemesters = null;
    }

    let nextOpen = new Set(
      (openSemesters ?? getDefaultOpenSemesters(semesterGroups)).filter((key) =>
        semesterKeySet.has(key),
      ),
    );

    if (knownSemesters) {
      const knownSet = new Set(knownSemesters);
      for (const [semester, semCourses] of semesterGroups) {
        if (
          !knownSet.has(semester) &&
          semCourses.some((c) => c.status === "in-progress" && !c.skipped)
        ) {
          nextOpen.add(semester);
        }
      }
    }

    setCollapsedSemesters(
      new Set(semesterKeys.filter((semester) => !nextOpen.has(semester))),
    );
    setLoadedSemesterStorageKey(semesterStorageKey);
  }, [semesterGroups, semesterStorageKey]);

  useEffect(() => {
    if (!semesterGroups || semesterGroups.length === 0) {
      setActiveSemester(null);
      return;
    }

    const visibleSemesters = new Set(
      semesterGroups.map(([semester]) => semester),
    );
    if (!activeSemester || !visibleSemesters.has(activeSemester)) {
      setActiveSemester(defaultActiveSemester);
    }
  }, [activeSemester, defaultActiveSemester, semesterGroups]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !semesterGroups || semesterGroups.length === 0) return;

    const semesterKeys = semesterGroups.map(([semester]) => semester);

    const computeActive = () => {
      const containerTop = container.getBoundingClientRect().top;
      const threshold = containerTop + 24;

      let current: string | null = null;
      for (const key of semesterKeys) {
        const node = semesterSectionRefs.current[key];
        if (!node) continue;
        const top = node.getBoundingClientRect().top;
        if (top <= threshold) {
          current = key;
        } else {
          break;
        }
      }

      if (!current) current = semesterKeys[0] ?? null;

      if (current) {
        setActiveSemester((prev) => (prev === current ? prev : current));
      }
    };

    computeActive();
    container.addEventListener("scroll", computeActive, { passive: true });
    window.addEventListener("resize", computeActive);

    return () => {
      container.removeEventListener("scroll", computeActive);
      window.removeEventListener("resize", computeActive);
    };
  }, [semesterGroups]);

  useEffect(() => {
    if (loadedSemesterStorageKey !== semesterStorageKey || !semesterGroups) {
      return;
    }

    const semesterKeys = semesterGroups.map(([semester]) => semester);
    const openSemesters = semesterKeys.filter(
      (semester) => !collapsedSemesters.has(semester),
    );
    const prefs: SemesterOpenPrefs = {
      openSemesters,
      knownSemesters: semesterKeys,
    };

    try {
      window.localStorage.setItem(semesterStorageKey, JSON.stringify(prefs));
    } catch {
      // Ignore storage failures; the UI should still work normally.
    }
  }, [
    collapsedSemesters,
    loadedSemesterStorageKey,
    semesterGroups,
    semesterStorageKey,
  ]);

  const toggleSemesterCollapse = (key: string) => {
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setActiveSemester(key);
  };

  const jumpToSemester = (key: string) => {
    setActiveSemester(key);
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });

    window.requestAnimationFrame(() => {
      semesterSectionRefs.current[key]?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  };

  const semesterHasInProgress = (key: string) =>
    courses.some(
      (c) =>
        `${c.semester} ${c.year}` === key &&
        c.status === "in-progress" &&
        !c.skipped,
    );

  return {
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
  };
}
