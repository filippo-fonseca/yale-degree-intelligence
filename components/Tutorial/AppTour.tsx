"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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
  { chip: string; ring: string; dot: string }
> = {
  pink: {
    chip:
      "bg-pink-100 text-pink-600 dark:bg-pink-500/15 dark:text-pink-300 border-pink-200 dark:border-pink-500/30",
    ring: "ring-pink-400/70 dark:ring-pink-400/60",
    dot: "bg-pink-500 dark:bg-pink-400",
  },
  blue: {
    chip:
      "bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 border-blue-200 dark:border-blue-500/30",
    ring: "ring-blue-400/70 dark:ring-blue-400/60",
    dot: "bg-blue-500 dark:bg-blue-400",
  },
  purple: {
    chip:
      "bg-purple-100 text-purple-600 dark:bg-purple-500/15 dark:text-purple-300 border-purple-200 dark:border-purple-500/30",
    ring: "ring-purple-400/70 dark:ring-purple-400/60",
    dot: "bg-purple-500 dark:bg-purple-400",
  },
};

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const TOOLTIP_W = 360;
const TOOLTIP_H = 250;
const GAP = 16;

function computeTooltip(rect: Rect | null): {
  top: number;
  left: number;
  placement: "center" | "right" | "left" | "bottom" | "top";
} {
  if (typeof window === "undefined" || !rect) {
    return { top: 0, left: 0, placement: "center" };
  }
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const clampLeft = (l: number) =>
    Math.max(GAP, Math.min(l, vw - TOOLTIP_W - GAP));
  const clampTop = (t: number) =>
    Math.max(GAP, Math.min(t, vh - TOOLTIP_H - GAP));

  // Sidebar targets sit on the left: prefer placing the card to their right.
  if (rect.left + rect.width + GAP + TOOLTIP_W <= vw - GAP) {
    return {
      top: clampTop(rect.top + rect.height / 2 - TOOLTIP_H / 2),
      left: rect.left + rect.width + GAP,
      placement: "right",
    };
  }
  if (rect.left - GAP - TOOLTIP_W >= GAP) {
    return {
      top: clampTop(rect.top + rect.height / 2 - TOOLTIP_H / 2),
      left: rect.left - GAP - TOOLTIP_W,
      placement: "left",
    };
  }
  if (rect.top + rect.height + GAP + TOOLTIP_H <= vh - GAP) {
    return {
      top: rect.top + rect.height + GAP,
      left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2),
      placement: "bottom",
    };
  }
  return {
    top: clampTop(rect.top - GAP - TOOLTIP_H),
    left: clampLeft(rect.left + rect.width / 2 - TOOLTIP_W / 2),
    placement: "top",
  };
}

export default function AppTour({
  open,
  onClose,
  onComplete,
  onNavigate,
}: AppTourProps) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  const total = TOUR_STEPS.length;
  const step = TOUR_STEPS[index];
  const accent = ACCENTS[step?.accent ?? "purple"];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  useEffect(() => {
    if (open) setIndex(0);
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

  // Switch the underlying tab for the current step.
  useEffect(() => {
    if (!open || !step?.tabId) return;
    onNavigate?.(step.tabId);
  }, [open, step?.tabId, onNavigate]);

  // Locate and track the anchored element. Polls briefly so the element has time
  // to mount after a tab switch, then keeps the rect fresh on scroll/resize.
  const measure = useCallback(() => {
    if (!step?.anchor) {
      setRect(null);
      return true;
    }
    const el = document.querySelector(step.anchor) as HTMLElement | null;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    return true;
  }, [step?.anchor]);

  useLayoutEffect(() => {
    if (!open) return;
    setRect(null);
    let frames = 0;
    const tick = () => {
      if (measure() || frames > 40) return;
      frames += 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [open, index, measure]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [open, measure]);

  const goNext = useCallback(() => {
    if (isLast) {
      onComplete();
      onClose();
      return;
    }
    setIndex((i) => Math.min(i + 1, total - 1));
  }, [isLast, onComplete, onClose, total]);

  const goBack = useCallback(() => {
    if (isFirst) return;
    setIndex((i) => Math.max(i - 1, 0));
  }, [isFirst]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, goNext, goBack]);

  if (!open || !step) return null;

  const Icon = step.icon;
  const tip = computeTooltip(rect);
  const centered = !rect;

  return (
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-label="App tour"
    >
      {/* Click-blocking backdrop. Dim is drawn by the spotlight's box-shadow when
          a target exists, otherwise this layer provides the full dim. */}
      <div
        className={`absolute inset-0 ${
          centered ? "bg-gray-900/55 dark:bg-black/70 backdrop-blur-sm" : ""
        }`}
        onClick={onClose}
      />

      {/* Spotlight cutout around the target element */}
      <AnimatePresence>
        {rect && (
          <motion.div
            key="spotlight"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            className={`pointer-events-none absolute rounded-2xl ring-2 ${accent.ring}`}
            style={{
              boxShadow: "0 0 0 9999px rgba(17, 24, 39, 0.62)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Tooltip card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 6 }}
          transition={{ type: "spring", stiffness: 340, damping: 28 }}
          className="absolute w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-gray-200 dark:border-white/10 bg-white/95 dark:bg-gray-900/90 backdrop-blur-xl shadow-2xl shadow-gray-400/30 dark:shadow-black/60"
          style={
            centered
              ? {
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }
              : { top: tip.top, left: tip.left }
          }
        >
          <button
            onClick={onClose}
            aria-label="Skip tour"
            className="absolute right-3.5 top-3.5 z-10 rounded-full p-1.5 text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          >
            <FiX className="h-4 w-4" />
          </button>

          <div className="px-6 pt-6 pb-5">
            <div
              className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${accent.chip}`}
            >
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {step.eyebrow}
            </p>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {step.description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-gray-200/70 dark:border-white/10 px-6 py-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5">
                {TOUR_STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? `w-4 ${accent.dot}`
                        : "w-1.5 bg-gray-300 dark:bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                {index + 1}/{total}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {!isFirst && (
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all"
                >
                  <FiArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              )}
              <button
                onClick={goNext}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gray-900 dark:bg-white px-3.5 py-1.5 text-sm font-semibold text-white dark:text-gray-900 shadow-sm transition-all hover:opacity-90 active:scale-[0.98]"
              >
                {isLast ? (
                  <>
                    Finish
                    <FiCheck className="h-3.5 w-3.5" />
                  </>
                ) : (
                  <>
                    Next
                    <FiArrowRight className="h-3.5 w-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
