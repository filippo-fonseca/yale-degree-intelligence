"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  DEFAULT_SPLIT_RATIO,
  KEYBOARD_STEP,
  KEYBOARD_STEP_LARGE,
  clampSplitRatio,
  ratioFromPointer,
  readSplitRatio,
  splitRatioBounds,
  splitRatioStorageKey,
  writeSplitRatio,
} from "@/lib/simulatorSplit";
import type { SimulatorView } from "./SimulatorViewSwitcher";

/** The divider's hit area. The visible line inside it is one pixel. */
const DIVIDER_PX = 12;
const CANVAS_PANE_ID = "sim-split-canvas";

/** The element the Simulator scrolls inside: the dashboard's content panel in
 *  the app, or null when the page itself scrolls. */
function scrollParentOf(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    const { overflowY } = getComputedStyle(p);
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") {
      return p;
    }
  }
  return null;
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    // Some browsers throw on the getter itself when storage is blocked.
    return null;
  }
}

/**
 * Renders whichever Simulator view is active. Canvas and Progress render as
 * they always have, straight into the page flow. Split puts the two side by
 * side under the sticky toolbar, each pane scrolling on its own, with a
 * draggable, keyboard-operable divider between them.
 *
 * Both panes read the same Simulator state, so an edit on the Canvas shows up
 * in the progress pane on the same render.
 */
export default function SimulatorSplitView({
  view,
  canvas,
  progress,
  uid,
  topOffset,
}: {
  view: SimulatorView;
  canvas: React.ReactNode;
  progress: React.ReactNode;
  /** Scopes the stored ratio to the signed-in user. */
  uid: string | null | undefined;
  /** Height of the sticky toolbar, so the split parks right below it. */
  topOffset: number;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ratio, setRatio] = useState(DEFAULT_SPLIT_RATIO);
  // Width the two panes share (container minus the divider). Zero until
  // measured, which splitRatioBounds treats as "use the outer bounds".
  const [paneWidth, setPaneWidth] = useState(0);
  const [dragging, setDragging] = useState(false);
  // Height of whatever the Simulator scrolls inside. The dashboard scrolls a
  // content panel shorter than the viewport, so 100dvh would overshoot it.
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);
  const storageKey = splitRatioStorageKey(uid);

  const isSplit = view === "split";

  // Restore this user's ratio. Re-runs when the user resolves after mount.
  useEffect(() => {
    const stored = readSplitRatio(safeLocalStorage(), storageKey);
    setRatio(stored ?? DEFAULT_SPLIT_RATIO);
  }, [storageKey]);

  useEffect(() => {
    if (!isSplit) return;
    const el = containerRef.current;
    if (!el) return;
    const measure = () =>
      setPaneWidth(Math.max(0, el.getBoundingClientRect().width - DIVIDER_PX));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isSplit]);

  useEffect(() => {
    if (!isSplit) return;
    const el = containerRef.current;
    if (!el) return;
    const parent = scrollParentOf(el);
    const measure = () =>
      setViewportHeight(parent ? parent.clientHeight : window.innerHeight);
    measure();
    window.addEventListener("resize", measure);
    let ro: ResizeObserver | null = null;
    if (parent && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(parent);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [isSplit]);

  const bounds = splitRatioBounds(paneWidth);
  const shown = clampSplitRatio(ratio, paneWidth);

  const commit = useCallback(
    (next: number) => {
      const clamped = clampSplitRatio(next, paneWidth);
      setRatio(clamped);
      writeSplitRatio(safeLocalStorage(), storageKey, clamped);
    },
    [paneWidth, storageKey],
  );

  const reset = useCallback(() => {
    setRatio(DEFAULT_SPLIT_RATIO);
    writeSplitRatio(safeLocalStorage(), storageKey, DEFAULT_SPLIT_RATIO);
  }, [storageKey]);

  const ratioAt = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return ratio;
    const rect = el.getBoundingClientRect();
    // Centre the divider under the pointer rather than its left edge.
    return ratioFromPointer(
      clientX - DIVIDER_PX / 2,
      rect.left,
      rect.width - DIVIDER_PX,
    );
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    setDragging(true);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setRatio(clampSplitRatio(ratioAt(e.clientX), paneWidth));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setDragging(false);
    commit(ratioAt(e.clientX));
  };

  // While dragging, the whole page shows the resize cursor and text does not
  // get selected as the pointer sweeps across the panes.
  useEffect(() => {
    if (!dragging) return;
    const { cursor, userSelect } = document.body.style;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.cursor = cursor;
      document.body.style.userSelect = userSelect;
    };
  }, [dragging]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? KEYBOARD_STEP_LARGE : KEYBOARD_STEP;
    switch (e.key) {
      case "ArrowLeft":
        commit(shown - step);
        break;
      case "ArrowRight":
        commit(shown + step);
        break;
      case "Home":
        commit(bounds.min);
        break;
      case "End":
        commit(bounds.max);
        break;
      case "Enter":
        reset();
        break;
      default:
        return;
    }
    e.preventDefault();
  };

  if (view === "canvas") return <>{canvas}</>;
  if (view === "progress") return <>{progress}</>;

  const pct = (n: number) => Math.round(n * 100);
  const basis = (share: number) => `calc((100% - ${DIVIDER_PX}px) * ${share})`;
  // No easing while the pointer drives it; a short one for keys and resets.
  const flexTransition = dragging
    ? undefined
    : "flex-basis 180ms cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      data-sim-split
      className="sticky flex min-w-0"
      style={{
        top: topOffset + 8,
        // Fills the visible scroll area below the toolbar, so each pane
        // scrolls on its own instead of the page growing to the taller one.
        height:
          viewportHeight != null
            ? Math.max(320, viewportHeight - topOffset - 16)
            : `calc(100dvh - ${topOffset + 16}px)`,
      }}
    >
      <section
        id={CANVAS_PANE_ID}
        aria-label="Canvas"
        data-sim-split-pane="canvas"
        className="sim-split-pane min-w-0 shrink-0 overflow-y-auto overflow-x-hidden pr-2 pb-6 [container-type:inline-size] [scrollbar-gutter:stable]"
        style={{ flexBasis: basis(shown), transition: flexTransition }}
      >
        <div className="space-y-4">{canvas}</div>
      </section>

      <div
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-controls={CANVAS_PANE_ID}
        aria-label="Resize Canvas and Projected progress"
        aria-valuenow={pct(shown)}
        aria-valuemin={pct(bounds.min)}
        aria-valuemax={pct(bounds.max)}
        aria-valuetext={`Canvas ${pct(shown)}%, Projected progress ${100 - pct(shown)}%`}
        title="Drag to resize. Double-click to reset."
        data-sim-split-divider
        data-dragging={dragging || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={() => setDragging(false)}
        onDoubleClick={reset}
        onKeyDown={onKeyDown}
        className="group relative shrink-0 cursor-col-resize touch-none select-none outline-none flex items-stretch justify-center"
        style={{ width: DIVIDER_PX }}
      >
        {/* The line. Brightens on hover, focus and drag. */}
        <div
          className={`w-px rounded-full transition-colors ${
            dragging
              ? "bg-purple-500 dark:bg-purple-400"
              : "bg-gray-200 dark:bg-white/[0.08] group-hover:bg-purple-400/70 group-focus-visible:bg-purple-500 dark:group-hover:bg-purple-400/60 dark:group-focus-visible:bg-purple-400"
          }`}
        />
        {/* A grip pill, so the divider reads as something you can grab. */}
        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-1.5 rounded-full border transition-colors ${
            dragging
              ? "bg-purple-500 border-purple-500 dark:bg-purple-400 dark:border-purple-400"
              : "bg-white border-gray-300 dark:bg-gray-900 dark:border-white/20 group-hover:border-purple-400 group-focus-visible:border-purple-500 group-focus-visible:ring-2 group-focus-visible:ring-purple-500/40"
          }`}
        />
      </div>

      <section
        aria-label="Projected progress + results"
        data-sim-split-pane="progress"
        className="sim-split-pane min-w-0 flex-1 overflow-y-auto overflow-x-hidden pl-2 pb-6 [container-type:inline-size] [scrollbar-gutter:stable]"
      >
        {progress}
      </section>
    </motion.div>
  );
}
