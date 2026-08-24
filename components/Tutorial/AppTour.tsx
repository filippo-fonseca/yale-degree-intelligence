"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiCheck } from "react-icons/fi";
import { TOUR_STEPS } from "./steps";
import { ShinyButton } from "@/components/ui/shiny-button";
import { GhostButton } from "@/components/ui/ghost-button";
import { setTourActive } from "@/lib/tourState";

interface AppTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  onNavigate?: (tabId: string) => void;
}

type Rect = { top: number; left: number; width: number; height: number };

const PAD = 8;
const TOOLTIP_W = 360;
const TOOLTIP_H = 340;
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
  const tooltipW = Math.min(TOOLTIP_W, vw - GAP * 2);
  const tooltipH = Math.min(TOOLTIP_H, vh - GAP * 2);
  const clampLeft = (l: number) =>
    Math.max(GAP, Math.min(l, vw - tooltipW - GAP));
  const clampTop = (t: number) =>
    Math.max(GAP, Math.min(t, vh - tooltipH - GAP));

  // Sidebar targets sit on the left: prefer placing the card to their right.
  if (rect.left + rect.width + GAP + tooltipW <= vw - GAP) {
    return {
      top: clampTop(rect.top + rect.height / 2 - tooltipH / 2),
      left: rect.left + rect.width + GAP,
      placement: "right",
    };
  }
  if (rect.left - GAP - tooltipW >= GAP) {
    return {
      top: clampTop(rect.top + rect.height / 2 - tooltipH / 2),
      left: rect.left - GAP - tooltipW,
      placement: "left",
    };
  }
  if (rect.top + rect.height + GAP + tooltipH <= vh - GAP) {
    return {
      top: rect.top + rect.height + GAP,
      left: clampLeft(rect.left + rect.width / 2 - tooltipW / 2),
      placement: "bottom",
    };
  }
  return {
    top: clampTop(rect.top - GAP - tooltipH),
    left: clampLeft(rect.left + rect.width / 2 - tooltipW / 2),
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
  const activatedStepRef = useRef<string | null>(null);

  const total = TOUR_STEPS.length;
  const step = TOUR_STEPS[index];
  const isFirst = index === 0;
  const isLast = index === total - 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  // Tell the rest of the app a tour is running, so surfaces that pop their own
  // modal at first sight (the Simulator's plan selector) hold off. Cleared on
  // unmount as well as on close, so an interrupted tour cannot leave the app
  // permanently suppressed.
  useEffect(() => {
    setTourActive(open);
    return () => setTourActive(false);
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
    if (step.activate && activatedStepRef.current !== step.id) {
      const target = document.querySelector(step.activate) as HTMLElement | null;
      target?.click();
      activatedStepRef.current = step.id;
      return false;
    }
    const anchors = Array.isArray(step.anchor) ? step.anchor : [step.anchor];
    const el = anchors
      .filter(Boolean)
      .map((selector) => document.querySelector(selector as string) as HTMLElement | null)
      .find((candidate) => {
        if (!candidate) return false;
        const candidateRect = candidate.getBoundingClientRect();
        return candidateRect.width > 0 && candidateRect.height > 0;
      });
    if (!el) return false;
    let r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const margin = 96;
    if (r.top < margin || r.bottom > window.innerHeight - margin) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      r = el.getBoundingClientRect();
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    return true;
  }, [step?.activate, step?.anchor, step?.id]);

  useLayoutEffect(() => {
    if (!open) return;
    setRect(null);
    activatedStepRef.current = null;
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
          centered ? "bg-gray-950/45 dark:bg-black/55 backdrop-blur-[2px]" : ""
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
            className="pointer-events-none absolute rounded-xl border border-pink-500/80"
            style={{
              boxShadow:
                "0 0 0 9999px rgba(3, 7, 18, 0.58), 0 0 0 3px rgba(236, 72, 153, 0.22)",
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
          className="absolute flex max-h-[calc(100dvh-2rem)] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-black/[0.08] bg-white font-louize shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] dark:border-white/[0.09] dark:bg-[#101013]"
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
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            <FiX className="h-4 w-4" />
          </button>

          <div className="min-h-0 overflow-y-auto px-6 pt-6 pb-5">
            <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-black/[0.06] bg-[#fafafa] text-gray-400 dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-gray-500">
              <Icon className="h-4 w-4" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
              {step.eyebrow}
            </p>
            <h2 className="mt-1.5 text-[1.35rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
              {step.title}
            </h2>
            <p className="mt-2.5 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              {step.description}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-black/[0.07] px-5 py-3.5 font-sf dark:border-white/[0.08] sm:px-6">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                {TOUR_STEPS.map((s, i) => (
                  <span
                    key={s.id}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === index
                        ? "w-4 bg-gray-900 dark:bg-white"
                        : i < index
                          ? "w-1.5 bg-gray-400 dark:bg-white/40"
                          : "w-1.5 bg-gray-200 dark:bg-white/15"
                    }`}
                  />
                ))}
              </div>
              <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
                {index + 1}/{total}
              </span>
            </div>

            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
              {!isFirst && <GhostButton onClick={goBack}>Back</GhostButton>}
              <ShinyButton size="sm" withArrow={!isLast} onClick={goNext}>
                {isLast ? (
                  <>
                    Finish
                    <FiCheck className="h-3.5 w-3.5" />
                  </>
                ) : (
                  "Next"
                )}
              </ShinyButton>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
