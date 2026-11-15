"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiCheck } from "react-icons/fi";
import {
  groupHitsByProgram,
  requirementBadgeLabel,
  type CourseRequirementHit,
} from "@/lib/simulatorRequirementBadges";

type CourseRequirementBadgeProps = {
  hits: CourseRequirementHit[];
};

const TOOLTIP_WIDTH = 256;
const GAP = 6;
const EDGE = 8;

/**
 * Small check on a canvas course card that counts toward a major or
 * certificate requirement. Hover, focus, or tap it to see which ones.
 *
 * The tooltip is portaled to the body with fixed positioning, because the
 * canvas pane scrolls on its own in split view and would clip anything
 * absolutely positioned inside it.
 */
export default function CourseRequirementBadge({ hits }: CourseRequirementBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const tooltipId = useId();

  const groups = groupHitsByProgram(hits);
  const majorOnly = groups.every((g) => g.programType === "major");
  const certOnly = groups.every((g) => g.programType === "certificate");
  const tone = certOnly
    ? "bg-teal-500 dark:bg-teal-400 text-white dark:text-gray-900"
    : majorOnly
      ? "bg-purple-500 dark:bg-purple-400 text-white dark:text-gray-900"
      : "bg-gradient-to-br from-purple-500 to-teal-500 dark:from-purple-400 dark:to-teal-400 text-white dark:text-gray-900";

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const height = tooltipRef.current?.offsetHeight ?? 0;
    const above = rect.top - GAP - height >= EDGE;
    const top = above ? rect.top - GAP - height : rect.bottom + GAP;
    const left = Math.min(
      Math.max(EDGE, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2),
      window.innerWidth - TOOLTIP_WIDTH - EDGE,
    );
    setPos({ top, left, above });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    // A second pass once the tooltip has a measured height.
    const raf = requestAnimationFrame(place);
    return () => cancelAnimationFrame(raf);
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!anchorRef.current?.contains(e.target as Node)) setOpen(false);
    };
    // Scrolling either pane moves the card out from under a fixed tooltip.
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [open]);

  if (hits.length === 0) return null;

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        data-sim-req-badge
        aria-label={requirementBadgeLabel(hits)}
        aria-describedby={open ? tooltipId : undefined}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => {
          // Taps toggle on touch screens; never select or open the card.
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`ml-1.5 inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full shadow-sm ring-1 ring-white/70 dark:ring-black/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-purple-400 ${tone}`}
      >
        <FiCheck className="h-2.5 w-2.5" strokeWidth={3.5} aria-hidden />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={tooltipRef}
                id={tooltipId}
                role="tooltip"
                data-sim-req-tooltip
                initial={{ opacity: 0, y: pos?.above === false ? -3 : 3 }}
                animate={{ opacity: pos ? 1 : 0, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                style={{
                  position: "fixed",
                  top: pos?.top ?? -9999,
                  left: pos?.left ?? -9999,
                  width: TOOLTIP_WIDTH,
                }}
                className="pointer-events-none z-[60] rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-gray-900 px-2.5 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              >
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400 dark:text-gray-500">
                  Counts toward
                </p>
                <div className="space-y-1.5">
                  {groups.map((g) => (
                    <div key={`${g.programType}:${g.programId}`}>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                            g.programType === "major"
                              ? "bg-purple-500 dark:bg-purple-400"
                              : "bg-teal-500 dark:bg-teal-400"
                          }`}
                          aria-hidden
                        />
                        <span className="truncate text-[11px] font-medium text-gray-800 dark:text-gray-100">
                          {g.programName}
                        </span>
                        <span className="ml-auto shrink-0 text-[9px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                          {g.programType === "major" ? "major" : "certificate"}
                        </span>
                      </div>
                      <ul className="mt-0.5 space-y-0.5 pl-3">
                        {g.requirements.map((r) => (
                          <li
                            key={r}
                            className="text-[11px] leading-snug text-gray-600 dark:text-gray-300"
                          >
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
