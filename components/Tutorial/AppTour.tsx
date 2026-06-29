"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { TOUR_STEPS, type TourAccent } from "./steps";

interface AppTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  onNavigate?: (tabId: string) => void;
}

const ACCENTS: Record<
  TourAccent,
  { chip: string; glow: string; ring: string; dot: string }
> = {
  pink: {
    chip:
      "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300 border-pink-200 dark:border-pink-500/30",
    glow: "from-pink-400/30 to-pink-500/0 dark:from-pink-500/25",
    ring: "focus-visible:ring-pink-400/60",
    dot: "bg-pink-500 dark:bg-pink-400",
  },
  blue: {
    chip:
      "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    glow: "from-blue-400/30 to-blue-500/0 dark:from-blue-500/25",
    ring: "focus-visible:ring-blue-400/60",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
  purple: {
    chip:
      "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
    glow: "from-purple-400/30 to-purple-500/0 dark:from-purple-500/25",
    ring: "focus-visible:ring-purple-400/60",
    dot: "bg-purple-500 dark:bg-purple-400",
  },
};

export default function AppTour({
  open,
  onClose,
  onComplete,
  onNavigate,
}: AppTourProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const total = TOUR_STEPS.length;
  const step = TOUR_STEPS[index];
  const accent = ACCENTS[step?.accent ?? "purple"];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Reset to the first step every time the tour opens.
  useEffect(() => {
    if (open) {
      setIndex(0);
      setDirection(1);
    }
  }, [open]);

  // Lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Drive the underlying app tab to match the current step.
  useEffect(() => {
    if (!open || !step?.tabId) return;
    onNavigate?.(step.tabId);
  }, [open, step?.tabId, onNavigate]);

  const goNext = () => {
    if (isLast) {
      onComplete();
      onClose();
      return;
    }
    setDirection(1);
    setIndex((i) => Math.min(i + 1, total - 1));
  };

  const goBack = () => {
    if (isFirst) return;
    setDirection(-1);
    setIndex((i) => Math.max(i - 1, 0));
  };

  // Keyboard controls.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, isLast, isFirst]);

  if (!open || !step) return null;

  const Icon = step.icon;

  return (
    <AnimatePresence>
      <motion.div
        key="app-tour-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-gray-100/70 dark:bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="App tour"
      >
        <motion.div
          initial={{ scale: 0.94, y: 24, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.94, y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white/90 dark:bg-gray-900/80 backdrop-blur-xl shadow-2xl shadow-gray-300/40 dark:shadow-black/50"
        >
          {/* Soft accent glow */}
          <div
            className={`pointer-events-none absolute -top-24 left-1/2 h-56 w-56 -translate-x-1/2 rounded-full bg-gradient-to-b ${accent.glow} blur-3xl transition-colors duration-500`}
            aria-hidden
          />

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Skip tour"
            className="absolute right-4 top-4 z-10 rounded-full p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <FiX className="h-5 w-5" />
          </button>

          <div className="relative px-7 pt-9 pb-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                initial={{ opacity: 0, x: direction * 28 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -28 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                <div
                  className={`mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border ${accent.chip}`}
                >
                  <Icon className="h-7 w-7" />
                </div>

                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {step.eyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                  {step.title}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer: progress + controls */}
          <div className="flex items-center justify-between gap-4 border-t border-gray-200/70 dark:border-white/10 px-7 py-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? `w-5 ${accent.dot}`
                        : "w-1.5 bg-gray-300 dark:bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500">
                {index + 1} of {total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={goBack}
                disabled={isFirst}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 ${accent.ring} ${
                  isFirst
                    ? "cursor-not-allowed text-gray-300 dark:text-gray-600"
                    : "text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10"
                }`}
              >
                <FiArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                onClick={goNext}
                className={`inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white px-4 py-2 text-sm font-semibold text-white dark:text-gray-900 shadow-sm transition-all hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 ${accent.ring}`}
              >
                {isLast ? (
                  <>
                    Finish
                    <FiCheck className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    Next
                    <FiArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
