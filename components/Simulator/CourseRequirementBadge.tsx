"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import {
  groupHitsByProgram,
  requirementBadgeLabel,
  type CourseRequirementHit,
} from "@/lib/simulatorRequirementBadges";

type CourseRequirementBadgeProps = {
  hits: CourseRequirementHit[];
  /**
   * Keep an empty slot the size of the badge when the course fills nothing,
   * so every card's code starts in the same column.
   */
  reserveSpace?: boolean;
  /** Opens Projected progress on this requirement. Rows are plain text without it. */
  onSelectRequirement?: (hit: CourseRequirementHit) => void;
};

export type RequirementDotKind = "major" | "certificate" | "both";

/**
 * The marker itself, shared with the canvas legend so the key always matches
 * the cards: purple for a major, teal for a certificate, split for both.
 */
export function RequirementDot({
  kind,
  className = "",
}: {
  kind: RequirementDotKind;
  className?: string;
}) {
  const fill =
    kind === "major"
      ? "bg-purple-500 dark:bg-purple-400"
      : kind === "certificate"
        ? "bg-teal-500 dark:bg-teal-400"
        : "bg-[linear-gradient(90deg,theme(colors.purple.500)_50%,theme(colors.teal.500)_50%)] dark:bg-[linear-gradient(90deg,theme(colors.purple.400)_50%,theme(colors.teal.400)_50%)]";
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/80 dark:ring-gray-900/60 shadow-sm ${fill} ${className}`}
    />
  );
}

const TOOLTIP_WIDTH = 256;
const GAP = 6;
const EDGE = 8;
/** Grace period for crossing the gap between badge and tooltip. */
const CLOSE_DELAY_MS = 160;

/**
 * Small check on a canvas course card that counts toward a major or
 * certificate requirement. Hover, focus, or tap it to see which ones, then
 * click a requirement to jump to it in Projected progress.
 *
 * The tooltip is portaled to the body with fixed positioning, because the
 * canvas pane scrolls on its own in split view and would clip anything
 * absolutely positioned inside it. A short close delay lets the pointer move
 * from the badge onto the tooltip without it vanishing.
 */
export default function CourseRequirementBadge({
  hits,
  reserveSpace = false,
  onSelectRequirement,
}: CourseRequirementBadgeProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; above: boolean } | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipId = useId();

  const cancelClose = useCallback(() => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }, []);
  const show = useCallback(() => {
    cancelClose();
    setOpen(true);
  }, [cancelClose]);
  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  }, [cancelClose]);
  useEffect(() => cancelClose, [cancelClose]);

  const groups = groupHitsByProgram(hits);
  const majorOnly = groups.every((g) => g.programType === "major");
  const certOnly = groups.every((g) => g.programType === "certificate");
  const kind: RequirementDotKind = certOnly
    ? "certificate"
    : majorOnly
      ? "major"
      : "both";

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
      if (e.key === "Escape") {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (
        !anchorRef.current?.contains(target) &&
        !tooltipRef.current?.contains(target)
      ) {
        setOpen(false);
      }
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

  if (hits.length === 0) {
    return reserveSpace ? (
      <span className="mr-1.5 mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
    ) : null;
  }

  const select = (hit: CourseRequirementHit) => {
    cancelClose();
    setOpen(false);
    onSelectRequirement?.(hit);
  };

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        data-sim-req-badge
        aria-label={requirementBadgeLabel(hits)}
        aria-expanded={open}
        aria-controls={open ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={scheduleClose}
        onFocus={show}
        onBlur={scheduleClose}
        onKeyDown={(e) => {
          // Step into the tooltip, which lives at the end of the document.
          if (e.key === "ArrowDown" && onSelectRequirement) {
            e.preventDefault();
            show();
            requestAnimationFrame(() =>
              tooltipRef.current
                ?.querySelector<HTMLButtonElement>("button")
                ?.focus(),
            );
          }
        }}
        onClick={(e) => {
          // Taps toggle on touch screens; never select or open the card.
          e.stopPropagation();
          cancelClose();
          setOpen((v) => !v);
        }}
        className="group/dot mr-1.5 mt-px inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <RequirementDot
          kind={kind}
          className="transition-transform group-hover/dot:scale-125"
        />
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                ref={tooltipRef}
                id={tooltipId}
                role={onSelectRequirement ? "dialog" : "tooltip"}
                aria-label="Requirements this course counts toward"
                data-sim-req-tooltip
                onMouseEnter={show}
                onMouseLeave={scheduleClose}
                onFocus={show}
                onBlur={scheduleClose}
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
                className="z-[60] rounded-lg border border-gray-200 dark:border-white/[0.1] bg-white dark:bg-gray-900 px-2.5 py-2 text-left shadow-[0_8px_24px_rgba(0,0,0,0.14)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
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
                      <ul className="mt-0.5 space-y-0.5 pl-1.5">
                        {g.requirements.map((r) => {
                          const hit: CourseRequirementHit = {
                            programType: g.programType,
                            programId: g.programId,
                            programName: g.programName,
                            requirement: r,
                          };
                          return (
                            <li key={r}>
                              {onSelectRequirement ? (
                                <button
                                  type="button"
                                  data-sim-req-link
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    select(hit);
                                  }}
                                  className={`group/req flex w-full items-start gap-1 rounded-md px-1.5 py-0.5 text-left text-[11px] leading-snug text-gray-600 dark:text-gray-300 transition-colors focus:outline-none focus-visible:ring-2 ${
                                    g.programType === "major"
                                      ? "hover:bg-purple-50 hover:text-purple-700 dark:hover:bg-purple-500/10 dark:hover:text-purple-300 focus-visible:ring-purple-400"
                                      : "hover:bg-teal-50 hover:text-teal-700 dark:hover:bg-teal-500/10 dark:hover:text-teal-300 focus-visible:ring-teal-400"
                                  }`}
                                >
                                  <span className="min-w-0 flex-1">{r}</span>
                                  <FiArrowUpRight
                                    className="mt-0.5 h-3 w-3 shrink-0 opacity-40 transition-opacity group-hover/req:opacity-100"
                                    aria-hidden
                                  />
                                </button>
                              ) : (
                                <span className="block px-1.5 text-[11px] leading-snug text-gray-600 dark:text-gray-300">
                                  {r}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
                {onSelectRequirement && (
                  <p className="mt-1.5 border-t border-gray-100 dark:border-white/[0.06] pt-1.5 text-[10px] text-gray-400 dark:text-gray-500">
                    Click a requirement to see it in Projected progress.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
