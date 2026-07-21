"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import { FiInfo } from "react-icons/fi";

import {
  CERTIFICATES,
  getCertificate,
  getCertificateDescriptionById,
  type CertificateProgress,
} from "@/lib/certificates";
import {
  certificateEligibility,
  resolvePolicy,
} from "@/lib/certificatePolicy";
import {
  getCertificateOverlapBudget,
  getCertificateViolations,
} from "@/lib/utils/programClaims";
import { useAuth } from "@/context/AuthContext";
import { skipCourse, unskipCourse } from "@/lib/utils/courseOperations";
import CourseModal from "./CourseModal";
import RequirementCard, {
  type RequirementConflict,
} from "./RequirementCard";
import HeatMapView from "./HeatMapView";
import { STATUS_CLASSES, type ReqStats } from "./requirementStatus";
import AddManualCourseModal from "../AddManualCourseModal/AddManualCourseModal";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import { setDoc, doc } from "firebase/firestore";
import { getCourseInfo, normalizeCourseCode } from "@/lib/courseCatalog";
import { InfoCard } from "../ui/InfoCard";
import RequirementModal from "./RequirementModal";
import CertificateTipModal, {
  CertificateTipHelpButton,
  resetCertificateTipSeen,
} from "./CertificateTipModal";
import { Skeleton } from "@/components/ui/Skeleton";

function CertificateProgressLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-neu">
        <Skeleton rounded="rounded-full" className="h-2 w-full" />
        <Skeleton rounded="rounded-lg" className="h-6 w-44 mt-2" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} rounded="rounded-xl" className="h-16" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, c) => (
          <div
            key={c}
            className="rounded-xl border border-gray-200 dark:border-gray-800/50 p-3 space-y-3"
          >
            <Skeleton rounded="rounded-lg" className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, r) => (
              <Skeleton key={r} rounded="rounded-xl" className="h-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

type ReqOption = {
  code: string;
  name?: string;
  credits?: number;
  completed?: boolean;
  inProgress?: boolean;
  skipped?: boolean;
  manual?: boolean;
};

type Requirement = {
  id?: string;
  name: string;
  description?: string;
  required?: number;
  options: ReqOption[];
};

function CertificateStatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  infoTooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  infoTooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all relative shadow-neu"
    >
      {infoTooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {infoTooltip}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-medium mt-0.5 ${color}`}>{value}</p>
    </motion.div>
  );
}

/**
 * Warn but allow. Yale bars a few major and certificate pairings outright, and
 * this banner is the single voice for it inside the certificate: the manual
 * picker stays quiet about eligibility so the reasons it does show are the ones
 * that differ from course to course.
 *
 * The copy is the engine's, split at the sentence break so the finding leads and
 * the advice follows.
 */
function IneligibilityBanner({ warning }: { warning: string }) {
  const breakAt = warning.indexOf(". ");
  const lead = breakAt === -1 ? warning : warning.slice(0, breakAt + 1);
  const rest = breakAt === -1 ? "" : warning.slice(breakAt + 2);
  return (
    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2.5">
      <p className="text-sm text-amber-700 dark:text-amber-300">
        <span className="font-medium">{lead}</span>
        {rest && (
          <span className="text-amber-700/80 dark:text-amber-200/80"> {rest}</span>
        )}
      </p>
    </div>
  );
}

/** The overlap budget, in the quiet pill idiom the cards already use. */
function OverlapPill({ label, tooltip }: { label: string; tooltip: string }) {
  return (
    <div className="relative group ml-auto">
      <span className="inline-block px-2 py-1 rounded-lg text-[10px] font-mono bg-gray-100 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800/50 cursor-default">
        {label}
      </span>
      <div className="absolute z-10 right-0 bottom-full mb-1.5 w-52 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        {tooltip}
      </div>
    </div>
  );
}

export default function CertificateProgressView({
  selectedCertificate,
  progress,
  onRequirementChange,
  courses,
  userMajors = [],
  userCertificates = [],
}: {
  selectedCertificate: string;
  progress: CertificateProgress;
  onRequirementChange: () => void;
  courses: Course[];
  /**
   * Declared programs. The certificate view is the one surface that has to
   * reason across programs (eligibility, overlap budget, stored conflicts), and
   * nothing below app/page.tsx can see the student's majors otherwise.
   */
  userMajors?: string[];
  userCertificates?: string[];
}) {
  const { user } = useAuth();
  const [showInProgressStats, setShowInProgressStats] = useState(false);
  const [view, setView] = useState<"board" | "heatmap">("board");
  const [mobileColumn, setMobileColumn] = useState<
    "remaining" | "inProgress" | "completed"
  >("remaining");

  useEffect(() => {
    const saved = window.localStorage.getItem("myCertificateView");
    if (saved === "board" || saved === "heatmap") setView(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("myCertificateView", view);
  }, [view]);

  const [forceCertificateTipOpen, setForceCertificateTipOpen] = useState(false);

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

  const [reqModal, setReqModal] = useState<{
    isOpen: boolean;
    req: Requirement | null;
  }>({ isOpen: false, req: null });

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

  const handleRemoveManualCourse = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;
    try {
      const courseToUpdate = courses.find((c) => {
        const courseInfo = getCourseInfo(c.code);
        if (!courseInfo) return false;
        return courseInfo.codes.includes(courseCode);
      });

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        return;
      }

      const updatedManuals = (
        courseToUpdate.manualRequirementsFulfilled || []
      ).filter(
        (m) =>
          !(
            m.certificate_id === selectedCertificate &&
            m.requirement_title === requirementTitle
          ),
      );

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          manualRequirementsFulfilled:
            updatedManuals.length > 0 ? updatedManuals : null,
        },
        { merge: true },
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error removing manual course:", error);
    }
  };

  const handleExcludeFromRequirement = async (
    courseCode: string,
    requirementTitle: string,
  ) => {
    if (!user) return;
    try {
      const courseToUpdate = courses.find((c) => {
        const courseInfo = getCourseInfo(c.code);
        if (!courseInfo) return c.code === courseCode;
        return courseInfo.codes.includes(courseCode);
      });

      if (!courseToUpdate) {
        console.error("Course not found:", courseCode);
        return;
      }

      const currentExclusions = courseToUpdate.excludedFromRequirements || [];
      const newExclusion = {
        certificate_id: selectedCertificate,
        requirement_title: requirementTitle,
      };

      const alreadyExcluded = currentExclusions.some(
        (e) =>
          e.certificate_id === selectedCertificate &&
          e.requirement_title === requirementTitle,
      );

      if (alreadyExcluded) return;

      await setDoc(
        doc(db, "courses", courseToUpdate.id),
        {
          excludedFromRequirements: [...currentExclusions, newExclusion],
        },
        { merge: true },
      );

      await onRequirementChange();
    } catch (error) {
      console.error("Error excluding course from requirement:", error);
    }
  };

  // The caller rebuilds these arrays every render, so memoize on their
  // contents rather than on their identity.
  const majorKey = userMajors.join(",");
  const certificateKey = userCertificates.join(",");

  const eligibility = useMemo(
    () => certificateEligibility(selectedCertificate, majorKey ? majorKey.split(",") : []),
    [selectedCertificate, majorKey],
  );

  const zeroOverlap = resolvePolicy(selectedCertificate).zeroOverlap;

  const overlap = useMemo(
    () =>
      getCertificateOverlapBudget(courses, selectedCertificate, {
        majorIds: majorKey ? majorKey.split(",") : [],
        certificateIds: certificateKey ? certificateKey.split(",") : [],
      }),
    [courses, selectedCertificate, majorKey, certificateKey],
  );

  /**
   * A certificate that shares nothing always says so. One that has a budget
   * only speaks once the student has actually spent some of it, otherwise every
   * language certificate would carry a meter reading zero forever.
   */
  const overlapPill = zeroOverlap
    ? {
        label: "no overlap",
        tooltip:
          "No course may count toward both this certificate and another program.",
      }
    : overlap.cap > 0 && overlap.used > 0
      ? {
          label: `overlap ${overlap.used}/${overlap.cap}`,
          tooltip: `Shared with your other programs: ${overlap.courses.join(", ")}.`,
        }
      : null;

  /**
   * Stored assignments this certificate would lose today, keyed by the
   * requirement they were filed under.
   *
   * Only assignments the student actually stored get a chip. The engine also
   * audits the overlaps it infers from auto-matching, and those have no
   * document to edit, so offering to remove one would do nothing.
   */
  const conflictsByRequirement = useMemo(() => {
    const stored = new Set<string>();
    for (const course of courses || []) {
      for (const manual of course.manualRequirementsFulfilled || []) {
        if (manual.certificate_id !== selectedCertificate) continue;
        stored.add(
          `${normalizeCourseCode(course.code)}::${manual.requirement_title}`,
        );
      }
    }

    const byRequirement = new Map<string, RequirementConflict[]>();
    const violations = getCertificateViolations(courses, selectedCertificate, {
      majorIds: majorKey ? majorKey.split(",") : [],
      certificateIds: certificateKey ? certificateKey.split(",") : [],
    });
    for (const violation of violations) {
      const key = `${violation.courseCode}::${violation.requirementTitle}`;
      if (!stored.has(key)) continue;
      const list = byRequirement.get(violation.requirementTitle) || [];
      list.push({
        courseCode: violation.courseCode,
        reason: violation.reason,
      });
      byRequirement.set(violation.requirementTitle, list);
    }
    return byRequirement;
  }, [courses, selectedCertificate, majorKey, certificateKey]);

  /**
   * The parts of a certificate that are not courses: forms, applications, and
   * the lecture write-ups a few programs ask for. We have no way to observe any
   * of it, so it is listed and labeled as the student's own to track.
   */
  const extraRequirements = useMemo(() => {
    const policy = resolvePolicy(selectedCertificate);
    const rows: string[] = [];
    if (getCertificate(selectedCertificate)?.requiresApplication && policy.extraForms.length === 0) {
      // Certificates that spell out their application in extraForms describe it
      // better than this line does, so it only fills in for the ones that do not.
      rows.push("Apply to the program before you can be enrolled in it.");
    }
    rows.push(...policy.extraForms, ...policy.nonCourseRequirements);
    return rows;
  }, [selectedCertificate]);

  const completedCredits = progress?.completedCredits;
  const inProgressCredits = progress?.inProgressCredits || 0;
  const totalCredits = progress?.totalCredits;
  const clampPct = (n: number | undefined) =>
    Math.min(100, Math.max(0, Number.isFinite(n) ? (n as number) : 0));
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
      options: (req.options || []).map(normalizeOpt),
    }),
    [normalizeOpt],
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
    return completedNorm.filter((req: any) => {
      const done = req.options
        .filter((o: any) => o.completed)
        .reduce((s: number, o: any) => s + (o.credits || 0), 0);
      return done >= (req.required || 0);
    });
  }, [completedNorm]);

  const demotedFromCompleted = useMemo(() => {
    return completedNorm.filter((req: any) => {
      const done = req.options
        .filter((o: any) => o.completed)
        .reduce((s: number, o: any) => s + (o.credits || 0), 0);
      return done < (req.required || 0);
    });
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
      const reqCompleted = req.options
        .filter((o: any) => o.completed)
        .reduce((sum: number, o: any) => sum + (o.credits || 0), 0);
      const reqInProgress = req.options
        .filter((o: any) => o.inProgress)
        .reduce((sum: number, o: any) => sum + (o.credits || 0), 0);
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

  const handleOpenCourse = useCallback((opt: any, reqName: string) => {
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
        skipped: opt.skipped || false,
      },
    });
  }, []);

  const handleAddManual = useCallback(
    (reqName: string) => {
      setReqModal({ isOpen: false, req: null });
      setManualCourseModal({
        isOpen: true,
        requirement: `${selectedCertificate}|${reqName}`,
      });
    },
    [selectedCertificate],
  );

  const completedStats: ReqStats[] = useMemo(
    () =>
      strictCompletedReqs.map((req: any) => {
        const reqCompleted = req.options
          .filter((o: any) => o.completed)
          .reduce((s: number, o: any) => s + (o.credits || 0), 0);
        const reqInProgress = req.options
          .filter((o: any) => o.inProgress)
          .reduce((s: number, o: any) => s + (o.credits || 0), 0);
        return { req, reqCompleted, reqInProgress, notStarted: false };
      }),
    [strictCompletedReqs],
  );

  const heatCells: ReqStats[] = useMemo(() => {
    const byName = new Map<string, ReqStats>();
    for (const s of completedStats) byName.set(s.req.name, s);
    for (const s of withStats) if (!byName.has(s.req.name)) byName.set(s.req.name, s);

    const catalog = getCertificate(selectedCertificate);
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
  }, [completedStats, withStats, selectedCertificate]);

  const openRequirement = useCallback(
    (req: any) =>
      setReqModal({
        isOpen: true,
        req: {
          id: req.id,
          name: req.name,
          description: req.description,
          required: req.required,
          options: req.options,
        },
      }),
    [],
  );

  const cardHandlers = {
    onOpenCourse: handleOpenCourse,
    onUnskip: handleUnskip,
    onRemoveManual: handleRemoveManualCourse,
    onAddManual: handleAddManual,
    onOpenRequirement: openRequirement,
    onExcludeFromRequirement: handleExcludeFromRequirement,
  };

  const columns: {
    key: "remaining" | "inProgress" | "completed";
    label: string;
    status: "notStarted" | "inProgress" | "completed";
    items: ReqStats[];
    credits: number;
    emptyText: string;
  }[] = [
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
        "Nothing here yet! Upload your transcript on the My courses page to get started.",
    },
  ];

  if (!progress) {
    return <CertificateProgressLoadingSkeleton />;
  }

  return (
    <div className="space-y-6 font-louize">
      {!eligibility.eligible && eligibility.warning && (
        <IneligibilityBanner warning={eligibility.warning} />
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-teal-600 dark:text-teal-400 mb-1">
            My certificate(s)
          </p>
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">
            {CERTIFICATES[selectedCertificate]}
          </h3>
          <p className="text-sm text-gray-500">
            {getCertificateDescriptionById(selectedCertificate)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
            {showInProgressStats
              ? withInProgressPercentage.toFixed(0)
              : completionPercentage.toFixed(0)}
            %
          </div>
        </div>
      </div>

      <div
        data-tour="certificate-progress-bar"
        className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu"
      >
        {/* Light mode needs its own teal ramp. The dark shades read against a
            near-black card, but on the light gray-200 track a teal-400 fill is
            only 1.5:1, so the far edge of the bar (how far along you are) all
            but disappears. Both fills step down two stops in light mode and
            keep their original values under dark:. */}
        <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
          {showInProgressStats && (
            <motion.div
              key="inprogress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${withInProgressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-y-0 left-0 rounded-full bg-teal-600 dark:bg-teal-500/70"
            />
          )}
          <motion.div
            key={showInProgressStats ? "completed-fill-ip" : "completed-fill-only"}
            initial={{ width: 0 }}
            animate={{ width: `${completionPercentage}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-teal-800 dark:bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.6)]"
          />
        </div>

        <div className="flex items-center gap-1.5 mt-2">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            Show:
          </span>
          <button
            onClick={() => setShowInProgressStats(false)}
            className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              !showInProgressStats
                ? "bg-blue-500/15 text-blue-600 dark:text-blue-300 border border-blue-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
            }`}
          >
            Completed Only
          </button>
          <button
            onClick={() => setShowInProgressStats(true)}
            className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              showInProgressStats
                ? "bg-teal-500/15 text-teal-600 dark:text-teal-300 border border-teal-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
            }`}
          >
            + In Progress
          </button>
          {overlapPill && (
            <OverlapPill
              label={overlapPill.label}
              tooltip={overlapPill.tooltip}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CertificateStatCard
          label="Total Credits"
          value={
            showInProgressStats
              ? `${completedCredits + inProgressCredits}/${totalCredits}`
              : `${completedCredits}/${totalCredits}`
          }
          color={showInProgressStats ? "text-teal-600 dark:text-teal-300" : "text-blue-600 dark:text-blue-300"}
          infoTooltip="This shows your completed credits out of the total required for your indicated certificate(s)."
        />
        <CertificateStatCard
          label="Completion"
          value={`${(showInProgressStats
            ? withInProgressPercentage
            : completionPercentage
          ).toFixed(0)}%`}
          color="text-emerald-600 dark:text-emerald-300"
        />
        <CertificateStatCard
          label="In-progress Credits"
          value={`${inProgressCredits}`}
          color="text-blue-600 dark:text-blue-300"
          infoTooltip="Credits from courses you're currently taking that count toward this certificate but aren't finished yet."
        />
      </div>

      <div className="p-1" data-tour="certificate-manual-tip">
        <InfoCard
          autoHide
          previewText="A few tips on how to navigate this page. It's complex at first, we get it!"
        >
          Pro tip: Click on each course for actions and more info. Also, while
          our infrastructure is robust, sometimes there are cases where we
          weren't able to garner all plausible options for a given requirement;
          this is why we have enabled manual course fulfillment. Just click on
          the "Fulfill manually" button for that requirement and add a course
          from your transcript; we'll automatically count it towards your
          certificate progress and requirements stats. This also applies, for
          example, for interdepartmental courses and/or exceptions that your
          program coordinator has perhaps given you permission to use for a
          certain requirement, etc. Our platform is modular!
        </InfoCard>
      </div>

      <div
        data-tour="certificate-view-switcher"
        className="sticky top-0 z-20 -mx-1 px-1 py-2.5"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              View:
            </span>
            <button
              type="button"
              onClick={() => setView("board")}
              data-tour="certificate-board-toggle"
              className={`h-9 px-3.5 text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center ${
                view === "board"
                  ? "bg-teal-500/15 text-teal-600 dark:text-teal-200 border border-teal-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              Board
            </button>
            <button
              type="button"
              onClick={() => setView("heatmap")}
              data-tour="certificate-heatmap-toggle"
              className={`h-9 px-3.5 text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center gap-1.5 ${
                view === "heatmap"
                  ? "bg-teal-500/15 text-teal-600 dark:text-teal-200 border border-teal-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                  : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]"
              }`}
            >
              Heat map
              <span className="px-1.5 py-px rounded text-[10px] leading-none font-semibold uppercase tracking-wide bg-teal-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/40">
                New
              </span>
            </button>
          </div>
          <CertificateTipHelpButton
            onClick={() => {
              resetCertificateTipSeen("myCertificateTipModalShown");
              setForceCertificateTipOpen(true);
            }}
          />
        </div>
      </div>

      <CertificateTipModal
        storageKey="myCertificateTipModalShown"
        autoOpenOnMount={false}
        forceOpen={forceCertificateTipOpen}
        onDismiss={() => setForceCertificateTipOpen(false)}
      />

      {view === "board" && (
        <div>
          <div className="md:hidden flex items-center gap-1.5 mb-3">
            {columns.map((col) => (
              <button
                key={col.key}
                type="button"
                onClick={() => setMobileColumn(col.key)}
                className={`flex-1 px-2 py-1.5 text-[11px] rounded-lg transition-all duration-200 border ${
                  mobileColumn === col.key
                    ? "bg-gray-100 dark:bg-gray-800/60 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
                    : "bg-transparent border-gray-200 dark:border-gray-800/50 text-gray-400 dark:text-gray-500"
                }`}
              >
                {col.label} ({col.items.length})
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-tour="certificate-requirements-board">
            {columns.map((col) => (
              <div
                key={col.key}
                className={`${
                  mobileColumn === col.key ? "flex" : "hidden"
                } md:flex flex-col rounded-xl border border-gray-200 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/20 max-h-[70vh]`}
              >
                <div className="sticky top-0 z-10 flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b border-gray-200 dark:border-gray-800/50 bg-white/80 dark:bg-gray-900/70 backdrop-blur-md">
                  <h4
                    className={`font-medium text-sm ${STATUS_CLASSES[col.status].accent}`}
                  >
                    {col.label}
                  </h4>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">
                    {col.items.length} reqs · {col.credits} cr
                  </span>
                </div>
                <div className="overflow-y-auto p-3 space-y-3">
                  {col.items.length === 0 ? (
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      {col.emptyText}
                    </p>
                  ) : (
                    col.items.map((stats) => (
                      <RequirementCard
                        key={stats.req.id ?? stats.req.name}
                        stats={stats}
                        handlers={cardHandlers}
                        conflicts={conflictsByRequirement.get(stats.req.name)}
                      />
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "heatmap" && (
        <div data-tour="certificate-heatmap-view">
          <HeatMapView cells={heatCells} onOpenRequirement={openRequirement} />
        </div>
      )}

      {extraRequirements.length > 0 && (
        <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800/50 bg-white/40 dark:bg-gray-900/20">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Also required by Yale
            </h4>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              tracked by you, not DegreeIntelligence
            </span>
          </div>
          <ul className="mt-2 space-y-1.5">
            {extraRequirements.map((item) => (
              <li
                key={item}
                className="flex gap-2 text-[11px] text-gray-500 dark:text-gray-400"
              >
                <span className="text-gray-300 dark:text-gray-600 select-none">
                  •
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

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
        programType="certificate"
        userMajors={userMajors}
        userCertificates={userCertificates}
      />

      <RequirementModal
        isOpen={reqModal.isOpen}
        requirement={reqModal.req}
        onClose={() => setReqModal({ isOpen: false, req: null })}
        onOpenCourse={handleOpenCourse}
        onUnskip={handleUnskip}
        onRemoveManual={handleRemoveManualCourse}
        onAddManual={(reqName) => handleAddManual(reqName)}
        onSkip={handleSkip}
      />
    </div>
  );
}
