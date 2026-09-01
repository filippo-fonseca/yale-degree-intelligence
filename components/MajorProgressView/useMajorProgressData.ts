"use client";

import { useMemo, useCallback } from "react";

import { countReqProgress, getReqsForMajor, MajorProgress } from "@/lib/majors";
import { getCourseInfo } from "@/lib/courseCatalog";
import { Course } from "@/lib/types";
import type { ReqStats } from "./requirementStatus";

export type BoardColumn = {
  key: "remaining" | "inProgress" | "completed";
  label: string;
  status: "notStarted" | "inProgress" | "completed";
  items: ReqStats[];
  credits: number;
  emptyText: string;
};

function clampPct(n: number | undefined) {
  return Math.min(100, Math.max(0, Number.isFinite(n) ? (n as number) : 0));
}

export function useMajorProgressData(
  progress: MajorProgress,
  courses: Course[],
  selectedMajor: string,
) {
  const completedCredits = progress?.completedCredits;
  const inProgressCredits = progress?.inProgressCredits || 0;
  const totalCredits = progress?.totalCredits;
  const completionPercentage = clampPct(progress?.percentage);
  const withInProgressPercentage = clampPct(
    progress?.inProgressPercentage ?? progress?.percentage,
  );

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

  const normalizeOpt = useCallback(
    (opt: any) => {
      const status = codeStatusMap.get(opt.code);
      let inProgress = !!opt.inProgress;
      let completed = !!opt.completed;
      const skipped = !!opt.skipped;
      const manual = !!opt.manual;

      if (status === "in-progress") {
        inProgress = true;
        completed = false;
      } else if (status === "completed") {
        if (opt.completed !== false) {
          completed = true;
        }
        inProgress = false;
      }
      return { ...opt, inProgress, completed, skipped, manual };
    },
    [codeStatusMap],
  );

  const normalizeReq = useCallback(
    (req: any) => ({
      ...req,
      options: (req.options || []).map((opt: any) => {
        const normalized = normalizeOpt(opt);
        return {
          ...normalized,
          // A skip outranks an exclusion in the calculation, so it has to here
          // too: otherwise the pill would offer "re-include" on a course the
          // student just skipped, and never offer the unskip that undoes it.
          excluded:
            !normalized.skipped &&
            excludedLookup.has(`${req.name}:${opt.code}`),
        };
      }),
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

  const strictCompletedReqs = useMemo(() => {
    return completedNorm.filter(
      (req: any) =>
        countReqProgress(req.options, req.required || 0).reqCompleted >=
        (req.required || 0),
    );
  }, [completedNorm]);

  const demotedFromCompleted = useMemo(() => {
    return completedNorm.filter(
      (req: any) =>
        countReqProgress(req.options, req.required || 0).reqCompleted <
        (req.required || 0),
    );
  }, [completedNorm]);

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

  const withStats = useMemo(() => {
    return remainingForUI.map((req: any) => {
      const { reqCompleted, reqInProgress } = countReqProgress(
        req.options,
        req.required || 0,
      );
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

  const completedStats: ReqStats[] = useMemo(
    () =>
      strictCompletedReqs.map((req: any) => {
        const { reqCompleted, reqInProgress } = countReqProgress(
          req.options,
          req.required || 0,
        );
        return { req, reqCompleted, reqInProgress, notStarted: false };
      }),
    [strictCompletedReqs],
  );

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

  const columns: BoardColumn[] = [
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

  return {
    completedCredits,
    inProgressCredits,
    totalCredits,
    completionPercentage,
    withInProgressPercentage,
    heatCells,
    columns,
  };
}
