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

type ProgramType = "major" | "certificate";

interface SimulatorManualAssignModalProps {
  isOpen: boolean;
  course: Course | null;
  majorIds: string[];
  certificateIds: string[];
  previewProgress: Record<string, MajorProgress>;
  certificatePreviewProgress: Record<string, CertificateProgress>;
  onAssign: (entry: ManualRequirementEntry) => void;
  onSkip: () => void;
  onClose: () => void;
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

  const unfulfilledReqs = useMemo(() => {
    if (!activeProgramType || !activeProgramId) return [];
    return getUnfulfilledRequirements(
      activeProgramType,
      activeProgramId,
      previewProgress,
      certificatePreviewProgress,
    );
  }, [
    activeProgramType,
    activeProgramId,
    previewProgress,
    certificatePreviewProgress,
  ]);

  const showTypeStep =
    hasMajors && hasCertificates && selectedProgramType === null;
  const showProgramStep =
    !!activeProgramType &&
    programIdsForType.length > 1 &&
    selectedProgramId === null;
  const showRequirementStep = !!activeProgramId;

  const handleAssign = (reqName: string) => {
    if (!activeProgramType || !activeProgramId || !course) return;
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
                <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">
                  Assigning a course to a certificate means it won&apos;t count
                  toward your major(s), and vice versa.
                </p>
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
                  <button
                    onClick={() => setSelectedProgramType("major")}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-200 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
                  >
                    <div className="font-medium">Major</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {majorIds.length} declared
                    </div>
                  </button>
                  <button
                    onClick={() => setSelectedProgramType("certificate")}
                    className="flex-1 px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-700 dark:text-gray-200 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20 transition-colors text-left"
                  >
                    <div className="font-medium">Certificate</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {certificateIds.length} declared
                    </div>
                  </button>
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
                  {programIdsForType.map((pid) => (
                    <button
                      key={pid}
                      onClick={() => setSelectedProgramId(pid)}
                      className={`w-full px-3 py-2.5 rounded-lg border text-sm text-left transition-colors ${
                        activeProgramType === "certificate"
                          ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 hover:border-teal-500 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                          : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-200 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      }`}
                    >
                      <div className="font-medium">{pid}</div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                        {programDisplayName(activeProgramType, pid)}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {showRequirementStep && activeProgramType && activeProgramId && (
              <div className="flex-1 overflow-hidden flex flex-col">
                {(programIdsForType.length > 1 || (hasMajors && hasCertificates)) && (
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

                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wide mb-2">
                  Unfulfilled requirements
                </p>

                {unfulfilledReqs.length === 0 ? (
                  <p className="text-sm text-gray-400 dark:text-gray-500 py-4 text-center">
                    All requirements are satisfied for this{" "}
                    {activeProgramType}.
                  </p>
                ) : (
                  <div className="overflow-y-auto flex-1 -mx-1 px-1 space-y-1.5">
                    {unfulfilledReqs.map((req) => (
                      <button
                        key={req.name}
                        onClick={() => handleAssign(req.name)}
                        className={`w-full text-left px-3 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 transition-colors group ${
                          activeProgramType === "certificate"
                            ? "hover:border-teal-500/60 hover:bg-teal-50 dark:hover:bg-teal-900/20"
                            : "hover:border-purple-500/60 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-sm text-gray-700 dark:text-gray-200 transition-colors ${
                              activeProgramType === "certificate"
                                ? "group-hover:text-teal-600 dark:group-hover:text-teal-200"
                                : "group-hover:text-purple-600 dark:group-hover:text-purple-200"
                            }`}
                          >
                            {req.name}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                            {req.completed}/{req.required}
                          </span>
                        </div>
                        {req.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 line-clamp-1">
                            {req.description}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              <button
                onClick={handleSkip}
                className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700/50 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
              >
                Skip &mdash; not for my major or certificate
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
