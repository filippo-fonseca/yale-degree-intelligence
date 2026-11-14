import { describe, expect, it } from "vitest";
import {
  DEFAULT_SPLIT_RATIO,
  MAX_RATIO,
  MIN_CANVAS_PX,
  MIN_PROGRESS_PX,
  MIN_RATIO,
  clampSplitRatio,
  parseStoredSplitRatio,
  ratioFromPointer,
  readSplitRatio,
  splitRatioBounds,
  splitRatioStorageKey,
  writeSplitRatio,
} from "./simulatorSplit";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

function throwingStorage() {
  return {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
}

describe("splitRatioBounds", () => {
  it("uses the pixel minimums on a typical laptop width", () => {
    const { min, max } = splitRatioBounds(1000);
    expect(min).toBeCloseTo(MIN_CANVAS_PX / 1000);
    expect(max).toBeCloseTo(1 - MIN_PROGRESS_PX / 1000);
  });

  it("falls back to the outer bounds on a very wide container", () => {
    expect(splitRatioBounds(4000)).toEqual({ min: MIN_RATIO, max: MAX_RATIO });
  });

  it("collapses to one proportional point when both minimums do not fit", () => {
    const { min, max } = splitRatioBounds(600);
    const point = MIN_CANVAS_PX / (MIN_CANVAS_PX + MIN_PROGRESS_PX);
    expect(min).toBeCloseTo(point);
    expect(max).toBeCloseTo(point);
  });

  it("treats a zero or unmeasured width as the outer bounds", () => {
    expect(splitRatioBounds(0)).toEqual({ min: MIN_RATIO, max: MAX_RATIO });
    expect(splitRatioBounds(Number.NaN)).toEqual({ min: MIN_RATIO, max: MAX_RATIO });
  });
});

describe("clampSplitRatio", () => {
  it("leaves an in-range ratio alone", () => {
    expect(clampSplitRatio(0.5, 1200)).toBe(0.5);
  });

  it("keeps the canvas pane at least its minimum width", () => {
    expect(clampSplitRatio(0.05, 1000)).toBeCloseTo(0.38);
  });

  it("keeps the progress pane at least its minimum width", () => {
    expect(clampSplitRatio(0.95, 1000)).toBeCloseTo(0.66);
  });

  it("replaces a non-number with the default before clamping", () => {
    expect(clampSplitRatio(Number.NaN, 1200)).toBe(DEFAULT_SPLIT_RATIO);
  });

  it("honours custom minimums", () => {
    expect(clampSplitRatio(0.1, 1000, 500, 100)).toBeCloseTo(0.5);
  });
});

describe("ratioFromPointer", () => {
  it("maps the pointer position to a share of the width", () => {
    expect(ratioFromPointer(600, 100, 1000)).toBeCloseTo(0.5);
  });

  it("returns the default when the width is unknown", () => {
    expect(ratioFromPointer(600, 100, 0)).toBe(DEFAULT_SPLIT_RATIO);
  });
});

describe("parseStoredSplitRatio", () => {
  it("accepts a stored number inside the bounds", () => {
    expect(parseStoredSplitRatio("0.4500")).toBe(0.45);
  });

  it.each([null, undefined, "", "  ", "abc", "NaN", "Infinity", "0.05", "0.95", "-1"])(
    "rejects %p",
    (raw) => {
      expect(parseStoredSplitRatio(raw as string | null | undefined)).toBeNull();
    },
  );
});

describe("storage round trip", () => {
  it("keys the ratio per user", () => {
    expect(splitRatioStorageKey("abc")).toBe("di-sim-split-abc");
    expect(splitRatioStorageKey(null)).toBe("di-sim-split");
  });

  it("writes and reads back a ratio", () => {
    const s = memoryStorage();
    writeSplitRatio(s, "k", 0.4321);
    expect(readSplitRatio(s, "k")).toBeCloseTo(0.4321);
  });

  it("clears the key when the ratio is reset to the default", () => {
    const s = memoryStorage({ k: "0.4" });
    writeSplitRatio(s, "k", DEFAULT_SPLIT_RATIO);
    expect(s.data.has("k")).toBe(false);
    expect(readSplitRatio(s, "k")).toBeNull();
  });

  it("never throws when storage is blocked or missing", () => {
    expect(() => writeSplitRatio(throwingStorage(), "k", 0.4)).not.toThrow();
    expect(readSplitRatio(throwingStorage(), "k")).toBeNull();
    expect(readSplitRatio(null, "k")).toBeNull();
    expect(() => writeSplitRatio(undefined, "k", 0.4)).not.toThrow();
  });
});
