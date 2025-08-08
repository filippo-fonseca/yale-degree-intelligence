"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiPlus, FiExternalLink, FiCornerDownLeft } from "react-icons/fi";
import Link from "next/link";

/* ========= Types ========= */
export type ReqOption = {
  code: string;
  name?: string;
  credits?: number;
  completed?: boolean;
  inProgress?: boolean;
  skipped?: boolean;
  manual?: boolean;
};

export type Requirement = {
  id?: string;
  name: string;
  description?: string;
  required?: number; // credits or count
  options: ReqOption[];

  // Optional UI stats — computed here if not provided
  reqCompleted?: number;
  reqInProgress?: number;
  notStarted?: boolean;
};

/* ======= Helpers ======= */
function computeReqStats(req: Requirement) {
  const options = req.options ?? [];

  const reqCompleted = options
    .filter((o) => o.completed)
    .reduce((s, o) => s + (o.credits ?? 0), 0);

  const reqInProgress = options
    .filter((o) => o.inProgress)
    .reduce((s, o) => s + (o.credits ?? 0), 0);

  const notStarted = reqCompleted === 0 && reqInProgress === 0;

  return { reqCompleted, reqInProgress, notStarted };
}

/* ======= Component ======= */
export default function RequirementModal({
  isOpen,
  requirement,
  onClose,
  onOpenCourse,
  onUnskip,
  onRemoveManual,
  onAddManual,
  onSkip, // OPTIONAL: shows immediate-skip on eligible pills
}: {
  isOpen: boolean;
  requirement: Requirement | null;
  onClose: () => void;
  onOpenCourse: (opt: ReqOption, reqName: string) => void;
  onUnskip: (code: string) => void;
  onRemoveManual: (code: string, reqName: string) => void;
  onAddManual: (reqName: string) => void;
  onSkip?: (code: string, name: string) => void | Promise<void>;
}) {
  if (!requirement) return null;

  // Compute defaults (caller values override)
  const computed = computeReqStats(requirement);
  const required = requirement.required ?? 0;
  const reqCompleted = requirement.reqCompleted ?? computed.reqCompleted;
  const reqInProgress = requirement.reqInProgress ?? computed.reqInProgress;
  const notStarted = requirement.notStarted ?? computed.notStarted;

  // Status styling (mirrors main page)
  let statusColor = "";
  let statusBg = "";
  if (reqInProgress > 0) {
    statusColor = "text-blue-300";
    statusBg = "bg-blue-900/20";
  } else if (notStarted) {
    statusColor = "text-red-300";
    statusBg = "bg-red-900/20";
  } else if (reqCompleted >= required && required > 0) {
    statusColor = "text-emerald-300";
    statusBg = "bg-emerald-900/20";
  } else {
    statusColor = "text-amber-300";
    statusBg = "bg-amber-900/20";
  }

  // Tooltip text (same message used in CourseModal)
  const skipTooltip = (
    <>
      Sometimes you can count a class as "taken" without necessarily taking the
      exact course
      <br /> (like via placement or another class). In that case, mark it as
      "skipped!". If you instead
      <br />
      took ANOTHER class you want to use for this requirement, use the "Fulfill
      manually"
      <br /> button present on the card for this requirement (exit out of this
      modal first).
    </>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" />

          {/* Modal card */}
          <motion.div
            role="dialog"
            aria-modal="true"
            className="relative z-[201] w-[min(1000px,92vw)] max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur-md p-6"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()} // don't close when clicking inside
          >
            {/* Header with status badge */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className={`text-xl font-semibold ${statusColor}`}>
                    {requirement.name}
                  </h3>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${statusBg} ${statusColor}`}
                  >
                    {reqCompleted >= required && required > 0
                      ? "✓"
                      : `${reqInProgress + reqCompleted}/${required}`}
                  </span>
                </div>
                {requirement.description && (
                  <p className="mt-1 text-sm text-gray-300/80">
                    {requirement.description}
                  </p>
                )}
              </div>

              <button
                onClick={onClose}
                className="rounded-lg p-2 hover:bg-white/10 text-gray-300"
                aria-label="Close"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="mt-4 space-y-4">
              {/* Option pills */}
              <div className="flex flex-wrap gap-2">
                {requirement.options.map((opt) => {
                  const base =
                    "relative px-3 py-1.5 rounded-full text-sm flex items-center gap-2 border transition-all";
                  const style = opt.manual
                    ? "bg-purple-900/20 text-purple-300 border-purple-700"
                    : opt.completed
                    ? "bg-emerald-900/20 text-emerald-300 border-emerald-700"
                    : opt.inProgress
                    ? "bg-blue-900/20 text-blue-300 border-blue-700"
                    : opt.skipped
                    ? "bg-gray-900/20 text-gray-300 border-dashed border-gray-600"
                    : "bg-amber-900/20 text-amber-300 border-amber-700";

                  const canExpand = !opt.completed && !opt.skipped;

                  // precise skip handler — closes modal after calling onSkip
                  const handleSkip = async (e: React.MouseEvent) => {
                    e.stopPropagation();
                    if (!onSkip) return;
                    try {
                      await Promise.resolve(
                        onSkip(opt.code, opt.name || opt.code)
                      );
                    } finally {
                      onClose(); // close immediately after action
                    }
                  };

                  return (
                    <div key={opt.code} className={`${base} ${style}`}>
                      {/* Left: course label */}
                      <div className="flex items-center gap-1">
                        <span className="font-medium">{opt.code}</span>
                        <span className="text-[0.7rem] opacity-80">
                          ({opt.credits ?? 0}cr
                          {opt.manual
                            ? ", manual"
                            : opt.skipped
                            ? ", skipped"
                            : opt.inProgress
                            ? ", in progress"
                            : opt.completed
                            ? ", complete"
                            : ""}
                          )
                        </span>
                      </div>

                      {/* Middle: explicit Expand button (only when expandable) */}
                      {canExpand && (
                        <button
                          className="flex items-center gap-1 text-[0.7rem] pl-2 ml-1 border-l border-gray-700 opacity-90 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenCourse(opt, requirement.name);
                          }}
                          aria-label={`Open actions for ${
                            opt.name || opt.code
                          }`}
                          title="Open actions"
                        >
                          <FiExternalLink size={12} />
                          <span>Expand</span>
                        </button>
                      )}

                      {/* Right: mini 'section' for immediate Skip (only if onSkip is provided and eligible) */}
                      {onSkip &&
                        !opt.completed &&
                        !opt.inProgress &&
                        !opt.skipped && (
                          <div className="flex items-center pl-2 ml-1 border-l border-gray-700">
                            {/* Use a NAMED group so only hovering the button shows the tooltip */}
                            <div className="relative group/skip">
                              <button
                                className="flex items-center gap-1 text-[0.7rem] px-2 py-0.5 rounded-full bg-blue-900/20 text-blue-300 hover:bg-blue-900/30 transition-all"
                                onClick={handleSkip}
                                aria-label={`Mark ${opt.code} as skipped`}
                              >
                                <FiCornerDownLeft size={12} />
                                Skip
                              </button>
                              {/* Tooltip ONLY tied to the skip button via group/skip */}
                              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 border border-pink-500 text-gray-300 text-xs p-2 rounded-md opacity-0 group-hover/skip:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                                {skipTooltip}
                              </div>
                            </div>
                          </div>
                        )}

                      {/* Remove (unskip/manual) control */}
                      {(opt.skipped || opt.manual) && (
                        <button
                          className="ml-2 text-[0.7rem] opacity-80 hover:opacity-100"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (opt.skipped) onUnskip(opt.code);
                            if (opt.manual)
                              onRemoveManual(opt.code, requirement.name);
                          }}
                          title={opt.manual ? "Remove manual course" : "Unskip"}
                          aria-label={
                            opt.manual
                              ? `Remove manual mapping for ${opt.code}`
                              : `Unskip ${opt.code}`
                          }
                        >
                          <FiX size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Fulfill manually context + button */}
              <div className="space-y-2 border-t border-gray-800 pt-4">
                <p className="text-sm text-gray-400">
                  Some requirements — especially electives or those with a wide
                  range of possible courses — can’t be fully auto-detected. If
                  you’ve taken a valid course that isn’t showing here, you can
                  manually mark it as fulfilling this requirement.
                </p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddManual(requirement.name);
                  }}
                  className="text-xs rounded-full bg-gray-800 text-gray-300 px-3 py-1.5 hover:bg-gray-700 flex items-center gap-1"
                >
                  <FiPlus size={12} />
                  Fulfill manually
                </button>
              </div>

              {/* Report link */}
              <div className="pt-2">
                <Link
                  href="/contact"
                  className="text-xs text-blue-400 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  See an error? Report it
                </Link>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
