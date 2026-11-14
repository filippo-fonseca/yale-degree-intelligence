/**
 * Pure helpers for the Simulator's split view, where Canvas and Projected
 * progress sit side by side with a draggable divider between them.
 *
 * The ratio is the Canvas pane's share of the width the two panes divide
 * between them (the divider itself excluded), so 0.5 is an even split.
 */

/** Canvas gets a little more room by default: the semester grid is the
 *  interactive half and wants at least two columns. */
export const DEFAULT_SPLIT_RATIO = 0.58;

/** Narrowest each pane may get, in CSS pixels. Below this the Canvas cards
 *  and the progress readouts start truncating their own labels. */
export const MIN_CANVAS_PX = 380;
export const MIN_PROGRESS_PX = 340;

/** Outer bounds that hold even when the container is huge, so neither pane
 *  can be shrunk to a sliver on an ultrawide screen. */
export const MIN_RATIO = 0.2;
export const MAX_RATIO = 0.8;

/** Keyboard steps for the divider, as a share of the width. */
export const KEYBOARD_STEP = 0.02;
export const KEYBOARD_STEP_LARGE = 0.1;

export function splitRatioStorageKey(uid: string | null | undefined): string {
  return uid ? `di-sim-split-${uid}` : "di-sim-split";
}

/**
 * The ratio range a container of `width` pixels allows, honouring both pane
 * minimums and the outer bounds. When the container is too narrow to fit both
 * minimums, the range collapses to the point that splits the shortfall
 * proportionally, so the caller still gets one well-defined ratio.
 */
export function splitRatioBounds(
  width: number,
  minLeft: number = MIN_CANVAS_PX,
  minRight: number = MIN_PROGRESS_PX,
): { min: number; max: number } {
  if (!Number.isFinite(width) || width <= 0) {
    return { min: MIN_RATIO, max: MAX_RATIO };
  }
  if (minLeft + minRight >= width) {
    const point = minLeft / (minLeft + minRight);
    return { min: point, max: point };
  }
  return {
    min: Math.max(MIN_RATIO, minLeft / width),
    max: Math.min(MAX_RATIO, 1 - minRight / width),
  };
}

/** Clamps `ratio` into what a container of `width` pixels allows. A ratio
 *  that is not a number falls back to the default before clamping. */
export function clampSplitRatio(
  ratio: number,
  width: number,
  minLeft: number = MIN_CANVAS_PX,
  minRight: number = MIN_PROGRESS_PX,
): number {
  const r = Number.isFinite(ratio) ? ratio : DEFAULT_SPLIT_RATIO;
  const { min, max } = splitRatioBounds(width, minLeft, minRight);
  return Math.min(max, Math.max(min, r));
}

/** The ratio for a pointer at `clientX` over a container whose panes start at
 *  `left` and share `width` pixels. Unclamped; pass it to clampSplitRatio. */
export function ratioFromPointer(
  clientX: number,
  left: number,
  width: number,
): number {
  if (!Number.isFinite(width) || width <= 0) return DEFAULT_SPLIT_RATIO;
  return (clientX - left) / width;
}

/**
 * Reads a stored ratio. Anything that is not a finite number inside the outer
 * bounds is treated as absent, so a corrupted or hand-edited value cannot wedge
 * the layout.
 */
export function parseStoredSplitRatio(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < MIN_RATIO || n > MAX_RATIO) return null;
  return n;
}

type RatioStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Reads the stored ratio, or null when there is none or storage is blocked. */
export function readSplitRatio(
  storage: RatioStorage | null | undefined,
  key: string,
): number | null {
  if (!storage) return null;
  try {
    return parseStoredSplitRatio(storage.getItem(key));
  } catch {
    return null;
  }
}

/** Stores the ratio, or clears it when it is the default (so a reset does not
 *  pin today's default forever). Never throws. */
export function writeSplitRatio(
  storage: RatioStorage | null | undefined,
  key: string,
  ratio: number,
): void {
  if (!storage) return;
  try {
    if (Math.abs(ratio - DEFAULT_SPLIT_RATIO) < 1e-6) {
      storage.removeItem(key);
    } else {
      storage.setItem(key, ratio.toFixed(4));
    }
  } catch {
    // Private mode or a full quota: the split just will not survive a reload.
  }
}
