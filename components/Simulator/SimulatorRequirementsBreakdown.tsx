"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import { getCanonicalCode, normalizeCourseCode } from "@/lib/courseCatalog";
import { MAJORS, MajorProgress, ManualRequirementEntry } from "@/lib/majors";
import { CERTIFICATES, type CertificateProgress } from "@/lib/certificates";
import { Course } from "@/lib/types";
import { programLabel, resolvePolicy } from "@/lib/certificatePolicy";
import {
  buildProgramClaimContext,
  getCertificateOverlapBudget,
  getCertificateViolations,
  type ProgramClaimOptions,
} from "@/lib/utils/programClaims";

type ProgressData = MajorProgress | CertificateProgress;
type CompletedRequirement = MajorProgress["completedRequirements"][number];
type Accent = "purple" | "teal";

/** A conflict or a skipped auto-match, hung on the requirement it affects. */
type RequirementNote = { code: string; text: string };

type CertificatePolicyView = {
  /** Mono microcopy for the stat row: `overlap 1/2`, or `no overlap`. */
  meter: string | null;
  /** Stored or plan-scoped claims the audit refuses, by requirement name. */
  conflicts: Map<string, RequirementNote[]>;
  /** Courses auto-matching handed to another program, by requirement name. */
  skips: Map<string, RequirementNote[]>;
};

/**
 * Catalog program names carry their degree ("Computer Science, B.S."), which
 * reads badly mid-sentence in the skip note. Only the copy is shortened; every
 * verdict reason still arrives from the engine untouched.
 */
function shortProgramName(name: string): string {
  return name.replace(/,\s*B\.[AS]\.?.*$/, "").trim();
}

const noteKey = (code: string, requirement: string) =>
  `${normalizeCourseCode(code)}::${requirement}`;

/** "Fall 2026" → "Fall '26", so the term fits inside a 10px pill. */
function shortTermName(name: string): string {
  return name.replace(/\b(?:19|20)(\d{2})\b/, "'$1");
}

function addNote(
  map: Map<string, RequirementNote[]>,
  requirement: string,
  note: RequirementNote,
) {
  const existing = map.get(requirement);
  if (existing) existing.push(note);
  else map.set(requirement, [note]);
}

// ---------- SVG ring progress ----------
function ProgressRing({
  percentage,
  size = 36,
  strokeWidth = 3.5,
  accent = "purple",
  showLabel = false,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  accent?: Accent;
  /** Print the percentage in the middle of the ring. */
  showLabel?: boolean;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, percentage));
  const offset = circumference - (pct / 100) * circumference;
  const gradientId = `simRingGrad-${accent}`;

  // The label has to be overlaid rather than put inside the <svg>: the svg is
  // counter-rotated so the arc starts at 12 o'clock, and any text within it
  // would be rotated with it.
  const ring = (
    <svg
      width={size}
      height={size}
      className="flex-shrink-0 -rotate-90"
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* The 15% gray reads as a ring against a near-black card but nearly
          vanishes on a white one, so light mode gets a heavier track. */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(100,100,100,0.15)"
        className="[stroke:rgba(100,100,100,0.35)] dark:[stroke:rgba(100,100,100,0.15)]"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <defs>
        {/* Same story as the bar fills: the 400-level stops sit at 1.5:1 (teal)
            and 2.2:1 (indigo) on a light card, so light mode walks them down
            the same ramp. The dark: stops are the ones that shipped. */}
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          {accent === "teal" ? (
            <>
              <stop
                offset="0%"
                className="[stop-color:#0d9488] dark:[stop-color:#2dd4bf]"
              />
              <stop
                offset="100%"
                className="[stop-color:#0f766e] dark:[stop-color:#14b8a6]"
              />
            </>
          ) : (
            <>
              <stop
                offset="0%"
                className="[stop-color:#6366f1] dark:[stop-color:#818cf8]"
              />
              <stop
                offset="100%"
                className="[stop-color:#8b5cf6] dark:[stop-color:#a78bfa]"
              />
            </>
          )}
        </linearGradient>
      </defs>
    </svg>
  );

  if (!showLabel) return ring;

  return (
    <span
      className="relative inline-flex flex-shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {ring}
      <span className="absolute inset-0 flex items-center justify-center text-[9px] font-semibold tabular-nums leading-none text-gray-700 dark:text-gray-200">
        {Math.round(pct)}%
      </span>
    </span>
  );
}

// ---------- Status dot ----------
type DotColor = "green" | "blue" | "amber" | "red" | "purple" | "teal";

function StatusDot({ color }: { color: DotColor }) {
  const cls: Record<DotColor, string> = {
    green: "bg-emerald-400",
    blue: "bg-blue-400",
    amber: "bg-amber-400",
    red: "bg-red-400/70",
    purple: "bg-purple-400",
    teal: "bg-teal-400",
  };
  return (
    <span
      className={`inline-block w-1.5 h-1.5 rounded-full ${cls[color]} mr-1.5 flex-shrink-0`}
    />
  );
}

// ---------- Main component ----------
interface SimulatorRequirementsBreakdownProps {
  majorIds: string[];
  certificateIds: string[];
  previewProgress: Record<string, MajorProgress>;
  certificatePreviewProgress: Record<string, CertificateProgress>;
  plannedCodes: string[];
  /** Which plan semester each planned course sits in, by course code. */
  plannedSemesterByCode: Record<string, string>;
  simulatorManualReqs: ManualRequirementEntry[];
  /** Stored courses, so the engine sees the claims the student already made. */
  courses: Course[];
  /** The plan's engine inputs, built once in the Simulator. */
  policyOptions: ProgramClaimOptions;
  onRemoveManualReq: (code: string, requirement: string) => void;
}

export default function SimulatorRequirementsBreakdown({
  majorIds,
  certificateIds,
  previewProgress,
  certificatePreviewProgress,
  plannedCodes,
  plannedSemesterByCode,
  simulatorManualReqs,
  courses,
  policyOptions,
  onRemoveManualReq,
}: SimulatorRequirementsBreakdownProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  /**
   * What the audit says about each certificate in this plan.
   *
   * Two different things land on a requirement row and they read differently,
   * so they are told apart here rather than in the markup. A conflict is a
   * claim the student made that the audit now refuses. A skip is a course
   * auto-matching gave to another program, which the student never chose and
   * should not be scolded for.
   */
  const certificatePolicy = useMemo(() => {
    const byCertificate: Record<string, CertificatePolicyView> = {};
    if (certificateIds.length === 0) return byCertificate;

    const context = buildProgramClaimContext(courses, policyOptions);

    for (const certId of certificateIds) {
      const conflicts = new Map<string, RequirementNote[]>();
      const skips = new Map<string, RequirementNote[]>();

      // Claims the student made by hand, stored or plan-scoped. Anything the
      // audit refuses that is NOT in here came from auto-matching.
      const claimed = new Set<string>();
      for (const course of courses) {
        for (const manual of course.manualRequirementsFulfilled || []) {
          if (manual.certificate_id === certId) {
            claimed.add(noteKey(course.code, manual.requirement_title));
          }
        }
      }
      for (const allocation of policyOptions.extraAllocations ?? []) {
        if (
          allocation.program.type === "certificate" &&
          allocation.program.id === certId
        ) {
          claimed.add(
            noteKey(allocation.courseCode, allocation.requirementTitle),
          );
        }
      }

      for (const violation of getCertificateViolations(
        courses,
        certId,
        policyOptions,
      )) {
        const key = noteKey(violation.courseCode, violation.requirementTitle);
        if (claimed.has(key)) {
          addNote(conflicts, violation.requirementTitle, {
            code: violation.courseCode,
            text: violation.reason,
          });
          continue;
        }
        const holder = context.allocations.find(
          (allocation) =>
            normalizeCourseCode(allocation.courseCode) ===
              violation.courseCode &&
            !(
              allocation.program.type === "certificate" &&
              allocation.program.id === certId
            ),
        );
        if (!holder) continue;
        addNote(skips, violation.requirementTitle, {
          code: violation.courseCode,
          text: `${violation.courseCode} not counted: used by your ${shortProgramName(
            programLabel(holder.program),
          )} ${holder.program.type}.`,
        });
      }

      const policy = resolvePolicy(certId);
      let meter: string | null = null;
      if (policy.zeroOverlap) {
        meter = "no overlap";
      } else if (policy.overlapCap > 0) {
        const budget = getCertificateOverlapBudget(
          courses,
          certId,
          policyOptions,
        );
        meter = `overlap ${budget.used}/${budget.cap}`;
      }

      byCertificate[certId] = { meter, conflicts, skips };
    }

    return byCertificate;
  }, [certificateIds, courses, policyOptions]);

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const plannedSet = useMemo(() => {
    const s = new Set<string>();
    for (const code of plannedCodes) {
      s.add(code);
      const canon = getCanonicalCode(code);
      if (canon) s.add(canon);
    }
    return s;
  }, [plannedCodes]);

  const isPlanned = (code: string): boolean => {
    if (plannedSet.has(code)) return true;
    const canon = getCanonicalCode(code);
    return canon ? plannedSet.has(canon) : false;
  };

  // The engine may hand back a canonical code while the plan stored the raw
  // one (or vice versa), so the semester map is keyed under both spellings.
  const plannedSemesterLookup = useMemo(() => {
    const byCode = new Map<string, string>();
    for (const [code, semesterName] of Object.entries(plannedSemesterByCode)) {
      if (!byCode.has(code)) byCode.set(code, semesterName);
      const canon = getCanonicalCode(code);
      if (canon && !byCode.has(canon)) byCode.set(canon, semesterName);
    }
    return byCode;
  }, [plannedSemesterByCode]);

  const plannedSemesterFor = (code: string): string | null => {
    const direct = plannedSemesterLookup.get(code);
    if (direct) return direct;
    const canon = getCanonicalCode(code);
    return (canon && plannedSemesterLookup.get(canon)) || null;
  };

  const hasAnyProgress =
    majorIds.some((id) => previewProgress[id]) ||
    certificateIds.some((id) => certificatePreviewProgress[id]);

  if (!hasAnyProgress) {
    return (
      <div className="text-sm text-gray-500">
        No declared majors or certificates found for preview.
      </div>
    );
  }

  const majorCards = majorIds
    .map((majorId) => {
      const prog = previewProgress[majorId];
      if (!prog) return null;

      const manualForProgram = simulatorManualReqs.filter((m) => {
        const isMajorManual =
          m.programType === "major" || m.programType === undefined;
        if (!isMajorManual) return false;
        if (m.programId && m.programId !== majorId) return false;
        const allReqs = [
          ...prog.completedRequirements,
          ...prog.inProgressRequirements,
          ...prog.remainingRequirements,
        ];
        return allReqs.some((r) => r.name === m.requirement);
      });

      return (
        <ProgramProgressCard
          key={`major-${majorId}`}
          programKey={`major-${majorId}`}
          title={MAJORS[majorId] ?? majorId}
          prog={prog}
          accent="purple"
          manualReqs={manualForProgram}
          isOpen={!!expanded[`major-${majorId}`]}
          onToggle={() => toggle(`major-${majorId}`)}
          isPlanned={isPlanned}
          plannedSemesterFor={plannedSemesterFor}
          onRemoveManual={onRemoveManualReq}
        />
      );
    })
    .filter(Boolean);

  const certificateCards = certificateIds
    .map((certId) => {
      const prog = certificatePreviewProgress[certId];
      if (!prog) return null;

      const manualForProgram = simulatorManualReqs.filter((m) => {
        if (m.programType !== "certificate") return false;
        if (m.programId && m.programId !== certId) return false;
        const allReqs = [
          ...prog.completedRequirements,
          ...prog.inProgressRequirements,
          ...prog.remainingRequirements,
        ];
        return allReqs.some((r) => r.name === m.requirement);
      });

      return (
        <ProgramProgressCard
          key={`cert-${certId}`}
          programKey={`cert-${certId}`}
          title={CERTIFICATES[certId] ?? certId}
          prog={prog}
          accent="teal"
          manualReqs={manualForProgram}
          isOpen={!!expanded[`cert-${certId}`]}
          onToggle={() => toggle(`cert-${certId}`)}
          isPlanned={isPlanned}
          plannedSemesterFor={plannedSemesterFor}
          onRemoveManual={onRemoveManualReq}
          policy={certificatePolicy[certId]}
        />
      );
    })
    .filter(Boolean);

  // Majors and certificates are different kinds of thing and follow different
  // rules, so they get labeled groups instead of one flat list. A student with
  // only one kind sees no label, since there is nothing to tell apart.
  const showGroupLabels =
    majorCards.length > 0 && certificateCards.length > 0;

  return (
    <div className="space-y-4">
      {majorCards.length > 0 && (
        <div className="space-y-3">
          {showGroupLabels && (
            <GroupLabel accent="purple">
              {majorCards.length > 1 ? "Majors" : "Major"}
            </GroupLabel>
          )}
          {majorCards}
        </div>
      )}

      {certificateCards.length > 0 && (
        <div className="space-y-3">
          {showGroupLabels && (
            <GroupLabel accent="teal">
              {certificateCards.length > 1 ? "Certificates" : "Certificate"}
            </GroupLabel>
          )}
          {certificateCards}
        </div>
      )}
    </div>
  );
}

/** The one-line heading over a group of program cards. */
function GroupLabel({
  accent,
  children,
}: {
  accent: Accent;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-[10px] font-medium uppercase tracking-wide ${
          accent === "teal"
            ? "text-teal-600 dark:text-teal-400"
            : "text-purple-600 dark:text-purple-400"
        }`}
      >
        {children}
      </span>
      <span
        className={`h-px flex-1 ${
          accent === "teal"
            ? "bg-teal-200 dark:bg-teal-800/40"
            : "bg-purple-200 dark:bg-purple-900/40"
        }`}
        aria-hidden
      />
    </div>
  );
}

function ProgramProgressCard({
  title,
  prog,
  accent,
  manualReqs,
  isOpen,
  onToggle,
  isPlanned,
  plannedSemesterFor,
  onRemoveManual,
  policy,
}: {
  programKey: string;
  title: string;
  prog: ProgressData;
  accent: Accent;
  manualReqs: ManualRequirementEntry[];
  isOpen: boolean;
  onToggle: () => void;
  isPlanned: (code: string) => boolean;
  plannedSemesterFor: (code: string) => string | null;
  onRemoveManual: (code: string, requirement: string) => void;
  policy?: CertificatePolicyView;
}) {
  const pctCompleted = prog.percentage;

  const trueInProgress: CompletedRequirement[] = [];
  const planned: CompletedRequirement[] = [];

  for (const req of prog.inProgressRequirements) {
    const hasRealIP = req.options.some(
      (opt) => opt.inProgress && !isPlanned(opt.code) && !opt.manual,
    );
    if (hasRealIP) {
      trueInProgress.push(req);
    } else {
      planned.push(req);
    }
  }

  const totalReqs =
    prog.completedRequirements.length +
    prog.inProgressRequirements.length +
    prog.remainingRequirements.length;

  const getFractionCompleted = (req: CompletedRequirement) => {
    const completedCredits = req.options
      .filter((o) => o.completed)
      .reduce((sum, o) => sum + o.credits, 0);
    const inProgressCredits = req.options
      .filter((o) => o.inProgress)
      .reduce((sum, o) => sum + o.credits, 0);
    const totalProgress = Math.min(
      completedCredits + inProgressCredits,
      req.required,
    );
    return req.required > 0 ? totalProgress / req.required : 0;
  };

  const completedCount = prog.completedRequirements.length;
  const trueIPFraction = trueInProgress.reduce(
    (sum, req) => sum + getFractionCompleted(req),
    0,
  );
  const withIPCount = completedCount + trueIPFraction;
  const plannedFraction = planned.reduce(
    (sum, req) => sum + getFractionCompleted(req),
    0,
  );
  const withPlannedCount = withIPCount + plannedFraction;

  const pctWithIP = totalReqs > 0 ? (withIPCount / totalReqs) * 100 : 0;
  const pctWithPlanned =
    totalReqs > 0 ? (withPlannedCount / totalReqs) * 100 : 0;

  // Three fills stack on one gray-200 track, and in light mode the 300-level
  // planned tint measured 1.19:1 (teal) and 1.43:1 (purple) against it: the
  // outermost segment, the one that says how far along the program is, was
  // effectively invisible. Light mode gets a darker ramp so each band clears
  // its neighbour; every dark: value is the one that shipped.
  const plannedBarClass =
    accent === "teal"
      ? "bg-teal-600 dark:bg-teal-500/40"
      : "bg-purple-500 dark:bg-purple-500/40";
  const plannedTextClass =
    accent === "teal"
      ? "text-teal-600 dark:text-teal-300"
      : "text-purple-600 dark:text-purple-300";
  const completedBarClass =
    accent === "teal"
      ? "bg-gradient-to-r from-teal-700 via-cyan-700 to-emerald-700 dark:from-teal-500 dark:via-cyan-500 dark:to-emerald-500 shadow-[0_0_10px_rgba(20,184,166,0.75)]"
      : "bg-gradient-to-r from-blue-700 via-violet-700 to-fuchsia-700 dark:from-blue-500 dark:via-violet-500 dark:to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.75)]";

  return (
    <div
      className={`rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_12px_rgba(0,0,0,0.2)] backdrop-blur-md ${
        accent === "teal"
          ? "border-teal-200/60 dark:border-teal-800/40"
          : "border-gray-200 dark:border-gray-800/50"
      }`}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2.5 p-3 text-left hover:bg-gray-100 dark:hover:bg-gray-800/20 transition-colors"
      >
        {/* The ring tracks the with-planned figure, so it prints that number.
            Sized up from 32 to leave room for the label to stay legible. */}
        <ProgressRing
          percentage={pctWithPlanned}
          size={42}
          strokeWidth={3}
          accent={accent}
          showLabel
        />

        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
            {title}
          </div>
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
            <span className="whitespace-nowrap">
              <span className="text-emerald-600 dark:text-emerald-300 font-semibold">
                {pctCompleted.toFixed(0)}%
              </span>
              <span className="text-gray-500 dark:text-gray-400 ml-0.5">
                actually done
              </span>
            </span>
            {trueInProgress.length > 0 && (
              <span className="whitespace-nowrap">
                <span className="text-blue-600 dark:text-blue-300 font-semibold">
                  {pctWithIP.toFixed(0)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-0.5">
                  with in-progress credits
                </span>
              </span>
            )}
            {planned.length > 0 && (
              <span className="whitespace-nowrap">
                <span className={`font-semibold ${plannedTextClass}`}>
                  {pctWithPlanned.toFixed(0)}%
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-0.5">
                  completion with planned credits
                </span>
              </span>
            )}
            {policy?.meter && (
              <span className="font-mono whitespace-nowrap text-gray-400 dark:text-gray-500">
                {policy.meter}
              </span>
            )}
          </div>
        </div>

        {isOpen ? (
          <FiChevronUp className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        ) : (
          <FiChevronDown className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
        )}
      </button>

      <div className="px-3 pb-2.5 -mt-0.5">
        <div className="relative w-full bg-gray-200 dark:bg-gray-800/70 h-2 rounded-full overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${plannedBarClass}`}
            style={{ width: `${Math.min(100, pctWithPlanned)}%` }}
            aria-hidden
          />
          <div
            className="absolute inset-y-0 left-0 bg-blue-600 dark:bg-blue-500/60 rounded-full"
            style={{ width: `${Math.min(100, pctWithIP)}%` }}
            aria-hidden
          />
          <div
            className={`absolute inset-y-0 left-0 rounded-full ${completedBarClass}`}
            style={{ width: `${Math.min(100, pctCompleted)}%` }}
          />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-3 border-t border-gray-200 dark:border-gray-800/40 pt-2.5">
              {prog.completedRequirements.length > 0 && (
                <ReqSection
                  title="Satisfied"
                  reqs={prog.completedRequirements}
                  color="green"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                  plannedSemesterFor={plannedSemesterFor}
                  policy={policy}
                />
              )}

              {trueInProgress.length > 0 && (
                <ReqSection
                  title="In Progress"
                  reqs={trueInProgress}
                  color="blue"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                  plannedSemesterFor={plannedSemesterFor}
                  policy={policy}
                />
              )}

              {planned.length > 0 && (
                <ReqSection
                  title="Planned"
                  reqs={planned}
                  color="amber"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                  plannedSemesterFor={plannedSemesterFor}
                  policy={policy}
                  showCombinedProgress
                />
              )}

              {prog.remainingRequirements.length > 0 && (
                <ReqSection
                  title="Remaining"
                  reqs={prog.remainingRequirements}
                  color="red"
                  manualReqs={manualReqs}
                  onRemoveManual={onRemoveManual}
                  isPlanned={isPlanned}
                  plannedSemesterFor={plannedSemesterFor}
                  policy={policy}
                />
              )}

              {prog.completedRequirements.length === 0 &&
                trueInProgress.length === 0 &&
                planned.length === 0 &&
                prog.remainingRequirements.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                    No requirement data available.
                  </p>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ReqSection({
  title,
  reqs,
  color,
  manualReqs,
  onRemoveManual,
  isPlanned,
  plannedSemesterFor,
  policy,
  showCombinedProgress = false,
}: {
  title: string;
  reqs: CompletedRequirement[];
  color: "green" | "blue" | "amber" | "red";
  manualReqs: ManualRequirementEntry[];
  onRemoveManual: (code: string, requirement: string) => void;
  isPlanned: (code: string) => boolean;
  plannedSemesterFor: (code: string) => string | null;
  policy?: CertificatePolicyView;
  showCombinedProgress?: boolean;
}) {
  const titleColor: Record<typeof color, string> = {
    green: "text-emerald-600 dark:text-emerald-400",
    blue: "text-blue-600 dark:text-blue-400",
    amber: "text-amber-600 dark:text-amber-400",
    red: "text-red-600 dark:text-red-400/80",
  };

  return (
    <div>
      <div className="flex items-center gap-1 mb-1">
        <StatusDot color={color} />
        <span
          className={`text-[10px] font-medium uppercase tracking-wide ${titleColor[color]}`}
        >
          {title}
        </span>
        <span className="text-[10px] text-gray-400 dark:text-gray-600">
          ({reqs.length})
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {reqs.map((req) => {
          const manuals = manualReqs.filter((m) => m.requirement === req.name);
          const conflicts = policy?.conflicts.get(req.name) ?? [];
          const skips = policy?.skips.get(req.name) ?? [];

          const completedCredits = req.options
            .filter((o) => o.completed)
            .reduce((sum, o) => sum + o.credits, 0);
          const inProgressCredits = req.options
            .filter((o) => o.inProgress)
            .reduce((sum, o) => sum + o.credits, 0);
          const displayCredits = showCombinedProgress
            ? completedCredits + inProgressCredits
            : completedCredits;
          const isIncomplete =
            showCombinedProgress && displayCredits < req.required;

          return (
            <div
              key={req.name}
              className={`px-2.5 py-1.5 rounded-lg bg-gray-50 dark:bg-gray-800/30 border ${
                isIncomplete
                  ? "border-red-500/50"
                  : "border-gray-200 dark:border-gray-800/40"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate mr-2">
                  {req.name}
                </span>
                <span
                  className={`text-[10px] flex-shrink-0 ${
                    isIncomplete
                      ? "text-red-400 font-medium"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                >
                  {displayCredits}/{req.required}
                </span>
              </div>

              <div className="flex flex-wrap gap-1">
                {req.options
                  .filter((opt) => opt.completed || opt.inProgress)
                  .map((opt) => {
                    const planned =
                      opt.inProgress && (isPlanned(opt.code) || opt.manual);
                    let pillCls: string;
                    if (opt.completed && !opt.manual) {
                      pillCls =
                        "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800/50";
                    } else if (opt.completed && opt.manual) {
                      pillCls =
                        "bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border-purple-300 dark:border-purple-800/50";
                    } else if (planned) {
                      pillCls =
                        "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800/50";
                    } else {
                      pillCls =
                        "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800/50";
                    }

                    const isSimulatorManual = manuals.some(
                      (m) => m.code === opt.code,
                    );

                    return (
                      <span
                        key={opt.code}
                        className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border ${pillCls} group`}
                      >
                        {opt.code}
                        {planned && (
                          <span className="text-[9px] text-amber-400/70 ml-0.5 whitespace-nowrap">
                            {(() => {
                              const term = plannedSemesterFor(opt.code);
                              return term
                                ? `planned · ${shortTermName(term)}`
                                : "planned";
                            })()}
                          </span>
                        )}
                        {opt.completed && opt.manual && (
                          <span className="text-[9px] text-purple-400/70 ml-0.5">
                            manual
                          </span>
                        )}
                        {isSimulatorManual && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveManual(opt.code, req.name);
                            }}
                            className="ml-0.5 text-amber-400/50 hover:text-red-300 transition-colors"
                          >
                            <FiX size={10} />
                          </button>
                        )}
                      </span>
                    );
                  })}

                {req.options.filter((opt) => opt.completed || opt.inProgress)
                  .length === 0 &&
                  conflicts.length === 0 && (
                    <span className="text-[10px] text-gray-400 dark:text-gray-600 italic">
                      none yet
                    </span>
                  )}
              </div>

              {/* A refused claim is not a warning, it is credit the student
                  does not have. Amber is reserved for things that still count
                  (planned, and the engine's warn verdicts), so this reads as
                  switched off: muted fill, struck code, and the plain words
                  for what happened. */}
              {conflicts.map((note) => (
                <div key={`conflict-${note.code}`} className="mt-1">
                  <span className="inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border bg-zinc-100 dark:bg-zinc-800/40 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700/50 opacity-90">
                    <span className="line-through decoration-zinc-400/70 dark:decoration-zinc-500/70">
                      {note.code}
                    </span>
                    <span className="ml-1 text-zinc-500 dark:text-zinc-400">
                      not counted
                    </span>
                  </span>
                  <div className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {note.text}
                  </div>
                </div>
              ))}

              {skips.map((note) => (
                <div
                  key={`skip-${note.code}`}
                  className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-1"
                >
                  {note.text}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
