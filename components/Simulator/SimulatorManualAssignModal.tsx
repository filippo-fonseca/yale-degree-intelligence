"use client";

import React, { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import {
  MajorProgress,
  ManualRequirementEntry,
  MAJORS,
  majorRequirements,
} from "@/lib/majors";
import {
  CERTIFICATES,
  certificateRequirements,
  type CertificateProgress,
} from "@/lib/certificates";
import { evaluateAllocation, resolvePolicy } from "@/lib/certificatePolicy";
import {
  buildProgramClaimContext,
  getCertificateOverlapBudget,
  settleAllocations,
  type ProgramClaimOptions,
} from "@/lib/utils/programClaims";
import {
  presentCertificateEligibility,
  presentVerdict,
  type PolicyPresentation,
} from "@/lib/utils/policyPresentation";

type ProgramType = "major" | "certificate";

interface SimulatorManualAssignModalProps {
  isOpen: boolean;
  course: Course | null;
  majorIds: string[];
  certificateIds: string[];
  previewProgress: Record<string, MajorProgress>;
  certificatePreviewProgress: Record<string, CertificateProgress>;
  /** Stored courses, so the engine sees the claims the student already made. */
  courses: Course[];
  /** The plan's engine inputs, built once in the Simulator. */
  policyOptions: ProgramClaimOptions;
  onAssign: (entry: ManualRequirementEntry) => void;
  onSkip: () => void;
  onClose: () => void;
}

type RequirementView = {
  name: string;
  description?: string;
  completed: number;
  required: number;
  presentation: PolicyPresentation;
};

type ProgramView = {
  presentation: PolicyPresentation | null;
  requirements: RequirementView[];
  /** Certificates only: the overlap budget, said in full and said compactly. */
  budgetLine: string | null;
  budgetShort: string | null;
};

/** The most frequent reason in a set, ties broken by first appearance. */
function dominantReason(items: PolicyPresentation[]): string | undefined {
  const counts = new Map<string, number>();
  for (const item of items) {
    if (!item.reason) continue;
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + 1);
  }
  let best: string | undefined;
  let bestCount = 0;
  for (const [reason, count] of Array.from(counts)) {
    if (count > bestCount) {
      best = reason;
      bestCount = count;
    }
  }
  return best;
}

/**
 * What a whole program (or a whole program type) says, given what the engine
 * said about each of its requirements.
 *
 * Only two situations are worth stating above the row level: every choice is
 * refused, which makes the program itself unpickable, and every choice carries
 * the same warning, which is a fact about the program rather than the slot.
 * Anything else stays silent and lets the rows speak for themselves.
 */
function dominantPresentation(
  items: PolicyPresentation[],
): PolicyPresentation | null {
  if (items.length === 0) return null;
  if (items.every((item) => item.disabled)) {
    return { disabled: true, tone: "neutral", reason: dominantReason(items) };
  }
  const selectable = items.filter((item) => !item.disabled);
  const warned = selectable.filter(
    (item) => item.tone === "amber" && item.reason,
  );
  if (warned.length > 0 && warned.length === selectable.length) {
    return { disabled: false, tone: "amber", reason: dominantReason(warned) };
  }
  return null;
}

function getUnfulfilledRequirements(
  programType: ProgramType,
  programId: string,
  previewProgress: Record<string, MajorProgress>,
  certificatePreviewProgress: Record<string, CertificateProgress>,
) {
  const progress =
    programType === "major"
      ? previewProgress[programId]
      : certificatePreviewProgress[programId];
  const programDef =
    programType === "major"
      ? majorRequirements[programId]
      : certificateRequirements[programId];
  if (!programDef) return [];

  const progressByName = new Map<
    string,
    { completed: number; required: number }
  >();
  const allReqs = [
    ...(progress?.completedRequirements ?? []),
    ...(progress?.inProgressRequirements ?? []),
    ...(progress?.remainingRequirements ?? []),
  ];
  for (const r of allReqs) {
    progressByName.set(r.name, {
      completed: r.completed,
      required: r.required,
    });
  }

  return programDef.requirements
    .map((req) => {
      const prog = progressByName.get(req.name);
      return {
        name: req.name,
        description: req.description,
        completed: prog?.completed ?? 0,
        required: req.required,
      };
    })
    .filter((r) => r.completed < r.required);
}

export default function SimulatorManualAssignModal({
  isOpen,
  course,
  majorIds,
  certificateIds,
  previewProgress,
  certificatePreviewProgress,
  courses,
  policyOptions,
  onAssign,
  onSkip,
  onClose,
}: SimulatorManualAssignModalProps) {
  const [selectedProgramType, setSelectedProgramType] =
    useState<ProgramType | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(
    null,
  );

  const hasMajors = majorIds.length > 0;
  const hasCertificates = certificateIds.length > 0;

  useEffect(() => {
    if (!isOpen) {
      setSelectedProgramType(null);
      setSelectedProgramId(null);
      return;
    }
    if (hasMajors && !hasCertificates) {
      setSelectedProgramType("major");
    } else if (hasCertificates && !hasMajors) {
      setSelectedProgramType("certificate");
    }
  }, [isOpen, hasMajors, hasCertificates]);

  const activeProgramType = useMemo<ProgramType | null>(() => {
    if (selectedProgramType) return selectedProgramType;
    if (hasMajors && !hasCertificates) return "major";
    if (hasCertificates && !hasMajors) return "certificate";
    return null;
  }, [selectedProgramType, hasMajors, hasCertificates]);

  const programIdsForType = useMemo(() => {
    if (activeProgramType === "major") return majorIds;
    if (activeProgramType === "certificate") return certificateIds;
    return [];
  }, [activeProgramType, majorIds, certificateIds]);

  const activeProgramId = useMemo(() => {
    if (!activeProgramType) return null;
    if (programIdsForType.length === 1) return programIdsForType[0];
    return selectedProgramId;
  }, [activeProgramType, programIdsForType, selectedProgramId]);

  /**
   * Every verdict this modal could need, asked once.
   *
   * Nothing below decides policy: each requirement, each program, and each
   * program type renders whatever the engine returned for it, mapped through
   * the shared presentation helper so a blocked row here looks exactly like a
   * blocked row in My Certificates.
   */
  const policyView = useMemo(() => {
    const empty = {
      byProgram: {} as Record<string, ProgramView>,
      byType: {} as Record<ProgramType, PolicyPresentation | null>,
      notice: null as PolicyPresentation | null,
    };
    if (!course) return empty;

    const context = buildProgramClaimContext(courses, policyOptions);
    // The claims the audit already refused are not claims any more, so asking
    // about a new one has to be asked against what is left.
    const existing = settleAllocations(context);
    const byProgram: Record<string, ProgramView> = {};
    const all: PolicyPresentation[] = [];

    const buildProgram = (type: ProgramType, id: string): ProgramView => {
      const requirements = getUnfulfilledRequirements(
        type,
        id,
        previewProgress,
        certificatePreviewProgress,
      ).map((req) => ({
        ...req,
        presentation: presentVerdict(
          evaluateAllocation({
            courseCode: course.code,
            target: { type, id, requirementTitle: req.name },
            existing,
            majorIds: context.majorIds,
            certificateIds: context.certificateIds,
            grade: course.grade,
          }),
        ),
      }));

      let presentation = dominantPresentation(
        requirements.map((req) => req.presentation),
      );
      let budgetLine: string | null = null;
      let budgetShort: string | null = null;

      if (type === "certificate") {
        // A certificate a student is barred from stays selectable, and the
        // warning belongs to the certificate rather than to any one slot.
        if (!presentation) {
          const eligibility = presentCertificateEligibility(id, majorIds);
          if (eligibility.reason) presentation = eligibility;
        }
        const policy = resolvePolicy(id);
        if (policy.zeroOverlap) {
          budgetLine = "no overlap";
          budgetShort = "no overlap";
        } else if (policy.overlapCap > 0) {
          const budget = getCertificateOverlapBudget(
            courses,
            id,
            policyOptions,
          );
          budgetShort = `overlap ${budget.used}/${budget.cap}`;
          budgetLine = `${budgetShort} used with your majors`;
        }
      }

      return { presentation, requirements, budgetLine, budgetShort };
    };

    for (const id of majorIds) {
      const view = buildProgram("major", id);
      byProgram[`major:${id}`] = view;
      all.push(...view.requirements.map((req) => req.presentation));
    }
    for (const id of certificateIds) {
      const view = buildProgram("certificate", id);
      byProgram[`certificate:${id}`] = view;
      all.push(...view.requirements.map((req) => req.presentation));
    }

    const typePresentation = (type: ProgramType, ids: string[]) =>
      dominantPresentation(
        ids.map(
          (id) =>
            byProgram[`${type}:${id}`]?.presentation ?? {
              disabled: false,
              tone: "neutral" as const,
            },
        ),
      );

    // The one line above the choices: stated only when nothing at all can be
    // picked, since otherwise the rows already carry the specifics.
    const dominant = dominantPresentation(all);

    return {
      byProgram,
      byType: {
        major: typePresentation("major", majorIds),
        certificate: typePresentation("certificate", certificateIds),
      },
      notice: dominant?.disabled ? dominant : null,
    };
  }, [
    course,
    courses,
    policyOptions,
    majorIds,
    certificateIds,
    previewProgress,
    certificatePreviewProgress,
  ]);

  const activeProgram =
    activeProgramType && activeProgramId
      ? (policyView.byProgram[`${activeProgramType}:${activeProgramId}`] ??
        null)
      : null;

  const unfulfilledReqs = useMemo<RequirementView[]>(
    () => activeProgram?.requirements ?? [],
    [activeProgram],
  );

  const noticeReason = policyView.notice?.reason;
  const programReason = activeProgram?.presentation?.reason;

  /** A reason already stated higher up is not worth repeating below it. */
  const isNewReason = (
    reason: string | undefined,
    statedAbove: (string | undefined)[],
  ): reason is string => !!reason && !statedAbove.includes(reason);

  const showTypeStep =
    hasMajors && hasCertificates && selectedProgramType === null;
  const showProgramStep =
    !!activeProgramType &&
    programIdsForType.length > 1 &&
    selectedProgramId === null;
  const showRequirementStep = !!activeProgramId;

  const handleAssign = (reqName: string) => {
    if (!activeProgramType || !activeProgramId || !course) return;
    // The button is disabled too; this is the same answer from the engine, so
    // a stray programmatic click cannot store what the audit would refuse.
    const target = unfulfilledReqs.find((req) => req.name === reqName);
    if (target?.presentation.disabled) return;
    onAssign({
      code: course.code,
      requirement: reqName,
      credits: course.credits || 1,
      isPlanned: true,
      programType: activeProgramType,
      programId: activeProgramId,
    });
  };

  const handleClose = () => {
    setSelectedProgramType(null);
    setSelectedProgramId(null);
    onClose();
  };

  const handleSkip = () => {
    setSelectedProgramType(null);
    setSelectedProgramId(null);
    onSkip();
  };

  const programDisplayName = (type: ProgramType, id: string) =>
    type === "major" ? (MAJORS[id] ?? id) : (CERTIFICATES[id] ?? id);

  return (
    <AnimatePresence>
      {isOpen && course && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="bg-white dark:bg-gray-900 p-6 rounded-xl max-w-md w-full border border-gray-200 dark:border-gray-800 flex flex-col max-h-[80vh]"
            initial={{ scale: 0.97, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Assign to a requirement?
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  <span className="text-pink-600 dark:text-pink-300 font-medium">
                    {course.code}
                  </span>
                  {getCourseNameFromCode(course.code) && (
                    <span className="text-gray-500 ml-1">
                      {getCourseNameFromCode(course.code)}
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  This course wasn&apos;t auto-detected for any major or
                  certificate requirement.
                </p>
                {policyView.notice?.reason && (
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-2">
                    {policyView.notice.reason}
                  </p>
                )}
              </div>
              <button
                onClick={handleClose}
                className="text-gray-500 dark:text-gray-400 hover:text-red-400 transition flex-shrink-0 ml-2"
              >
                <FiX size={18} />
              </button>
            </div>

            {showTypeStep && (
              <div className="space-y-2 mb-4">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Assign to
                </p>
                <div className="flex gap-2">
                  {[
                    {
                      type: "major" as const,
                      label: "Major",
                      count: majorIds.length,
                      hover:
                        "hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20",
                    },
                    {
                      type: "certificate" as const,
                      label: "Certificate",
                      count: certificateIds.length,
                      hover:
                        "hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20",
                    },
                  ].map(({ type, label, count, hover }) => {
                    const presentation = policyView.byType[type];
                    const disabled = !!presentation?.disabled;
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedProgramType(type)}
                        disabled={disabled}
                        className={`flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-200 transition-colors text-left ${
                          disabled ? "opacity-45 cursor-not-allowed" : hover
                        }`}
                      >
                        <div className="font-medium">{label}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {count} declared
                        </div>
                        {isNewReason(presentation?.reason, [noticeReason]) && (
                          <div
                            className={`text-[11px] mt-1 ${
                              presentation?.tone === "amber"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {presentation?.reason}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showProgramStep && activeProgramType && (
              <div className="space-y-2 mb-4">
                {hasMajors && hasCertificates && (
                  <button
                    onClick={() => {
                      setSelectedProgramType(null);
                      setSelectedProgramId(null);
                    }}
                    className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                  >
                    &larr; Back
                  </button>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                  Which {activeProgramType}?
                </p>
                <div className="space-y-1.5">
                  {programIdsForType.map((pid) => {
                    const view =
                      policyView.byProgram[`${activeProgramType}:${pid}`];
                    const presentation = view?.presentation ?? null;
                    const disabled = !!presentation?.disabled;
                    const hover =
                      activeProgramType === "certificate"
                        ? "hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                        : "hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20";
                    return (
                      <button
                        key={pid}
                        onClick={() => setSelectedProgramId(pid)}
                        disabled={disabled}
                        className={`w-full px-3 py-2.5 rounded-lg border text-sm text-left transition-colors border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 ${
                          disabled ? "opacity-45 cursor-not-allowed" : hover
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium truncate">
                            {programDisplayName(activeProgramType, pid)}
                          </span>
                          {view?.budgetShort && (
                            <span className="font-mono text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                              {view.budgetShort}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          {pid}
                        </div>
                        {isNewReason(presentation?.reason, [noticeReason]) && (
                          <div
                            className={`text-[11px] mt-1 ${
                              presentation?.tone === "amber"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {presentation?.reason}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {showRequirementStep && activeProgramType && activeProgramId && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {(programIdsForType.length > 1 ||
                  (hasMajors && hasCertificates)) && (
                  <div className="flex items-center gap-2 mb-3">
                    {programIdsForType.length > 1 && (
                      <button
                        onClick={() => setSelectedProgramId(null)}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                      >
                        &larr; Back
                      </button>
                    )}
                    {hasMajors && hasCertificates && programIdsForType.length === 1 && (
                      <button
                        onClick={() => {
                          setSelectedProgramType(null);
                          setSelectedProgramId(null);
                        }}
                        className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 transition"
                      >
                        &larr; Back
                      </button>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {programDisplayName(activeProgramType, activeProgramId)}
                    </span>
                  </div>
                )}

                {isNewReason(programReason, [noticeReason]) && (
                  <p
                    className={`text-[11px] mb-2 ${
                      activeProgram?.presentation?.tone === "amber"
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-zinc-500 dark:text-zinc-400"
                    }`}
                  >
                    {programReason}
                  </p>
                )}

                <div className="mb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide">
                    Unfulfilled requirements
                  </p>
                  {activeProgram?.budgetLine && (
                    <span className="block font-mono text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      {activeProgram.budgetLine}
                    </span>
                  )}
                </div>

                {unfulfilledReqs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                    All requirements are satisfied for this{" "}
                    {activeProgramType}.
                  </p>
                ) : (
                  <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1.5">
                    {unfulfilledReqs.map((req) => {
                      const { disabled, tone, reason } = req.presentation;
                      const hover =
                        activeProgramType === "certificate"
                          ? "hover:border-teal-500/60 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                          : "hover:border-purple-500/60 hover:bg-purple-50 dark:hover:bg-purple-900/20";
                      const hoverText =
                        activeProgramType === "certificate"
                          ? "group-hover:text-teal-600 dark:group-hover:text-teal-200"
                          : "group-hover:text-purple-600 dark:group-hover:text-purple-200";
                      return (
                        <button
                          key={req.name}
                          onClick={() => handleAssign(req.name)}
                          disabled={disabled}
                          className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors group ${
                            disabled
                              ? "cursor-not-allowed border-zinc-300 dark:border-zinc-700/50 bg-zinc-100 dark:bg-zinc-800/40"
                              : `border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 ${hover}`
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            {/* A row the engine refuses says so in words, not
                                in opacity alone: when every row is refused
                                there is nothing to compare a dimmed one to. */}
                            <span
                              className={`text-sm transition-colors ${
                                disabled
                                  ? "text-zinc-500 dark:text-zinc-400 line-through decoration-zinc-400/70 dark:decoration-zinc-500/70"
                                  : `text-gray-700 dark:text-gray-200 ${hoverText}`
                              }`}
                            >
                              {req.name}
                            </span>
                            <span className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                              {disabled && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-zinc-200 dark:bg-zinc-700/40 text-zinc-600 dark:text-zinc-300 border border-zinc-300 dark:border-zinc-600/50">
                                  cannot count
                                </span>
                              )}
                              <span className="text-xs text-gray-400 dark:text-gray-500">
                                {req.completed}/{req.required}
                              </span>
                            </span>
                          </div>
                          {req.description && (
                            <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                              {req.description}
                            </div>
                          )}
                          {isNewReason(reason, [
                            noticeReason,
                            programReason,
                          ]) && (
                            <div
                              className={`text-[11px] mt-1 ${
                                tone === "amber"
                                  ? "text-amber-600 dark:text-amber-400"
                                  : "text-zinc-500 dark:text-zinc-400"
                              }`}
                            >
                              {reason}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleSkip}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
              >
                Skip - not for my major or certificate
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
