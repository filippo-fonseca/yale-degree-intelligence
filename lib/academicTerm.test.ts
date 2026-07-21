import { describe, it, expect } from "vitest";
import {
  getCurrentTerm,
  formatTerm,
  currentTermName,
  parseTermName,
  compareTermNames,
  isCurrentTerm,
  isPastTerm,
} from "./academicTerm";

// Local dates, since the helper reads local getMonth/getFullYear.
const at = (year: number, month1Indexed: number, day: number) =>
  new Date(year, month1Indexed - 1, day, 12, 0, 0);

describe("getCurrentTerm", () => {
  it("treats January through May as Spring of that year", () => {
    for (const month of [1, 2, 3, 4, 5]) {
      expect(getCurrentTerm(at(2026, month, 15))).toEqual({
        term: "Spring",
        year: 2026,
      });
    }
  });

  it("treats June through December as Fall of that year", () => {
    for (const month of [6, 7, 8, 9, 10, 11, 12]) {
      expect(getCurrentTerm(at(2026, month, 15))).toEqual({
        term: "Fall",
        year: 2026,
      });
    }
  });

  it("flips from Spring to Fall between May 31 and June 1", () => {
    expect(getCurrentTerm(at(2026, 5, 31))).toEqual({
      term: "Spring",
      year: 2026,
    });
    expect(getCurrentTerm(at(2026, 6, 1))).toEqual({
      term: "Fall",
      year: 2026,
    });
  });

  it("rolls the year over between December 31 and January 1", () => {
    expect(getCurrentTerm(at(2026, 12, 31))).toEqual({
      term: "Fall",
      year: 2026,
    });
    expect(getCurrentTerm(at(2027, 1, 1))).toEqual({
      term: "Spring",
      year: 2027,
    });
  });

  it("reports Fall 2026 for the day the bug was reported", () => {
    expect(currentTermName(at(2026, 7, 21))).toBe("Fall 2026");
  });
});

describe("formatTerm and parseTermName", () => {
  it("round-trips a term", () => {
    const term = getCurrentTerm(at(2026, 7, 21));
    expect(formatTerm(term)).toBe("Fall 2026");
    expect(parseTermName("Fall 2026")).toEqual(term);
  });

  it("returns null for names that are not terms", () => {
    expect(parseTermName("Summer 2026")).toBeNull();
    expect(parseTermName("Fall")).toBeNull();
    expect(parseTermName("")).toBeNull();
  });
});

describe("compareTermNames", () => {
  it("orders by year, then Spring before Fall", () => {
    expect(compareTermNames("Spring 2026", "Fall 2026")).toBeLessThan(0);
    expect(compareTermNames("Fall 2025", "Spring 2026")).toBeLessThan(0);
    expect(compareTermNames("Fall 2026", "Fall 2026")).toBe(0);
    expect(compareTermNames("Fall 2027", "Spring 2027")).toBeGreaterThan(0);
  });

  it("sorts a grid of semesters chronologically", () => {
    const sorted = [
      "Fall 2026",
      "Spring 2026",
      "Spring 2027",
      "Fall 2025",
    ].sort(compareTermNames);
    expect(sorted).toEqual([
      "Fall 2025",
      "Spring 2026",
      "Fall 2026",
      "Spring 2027",
    ]);
  });
});

describe("isCurrentTerm and isPastTerm on 2026-07-21", () => {
  const today = at(2026, 7, 21);

  it("makes Fall 2026 current, not Spring 2026", () => {
    expect(isCurrentTerm("Fall 2026", today)).toBe(true);
    expect(isCurrentTerm("Spring 2026", today)).toBe(false);
  });

  it("makes Spring 2026 and everything before it past", () => {
    expect(isPastTerm("Spring 2026", today)).toBe(true);
    expect(isPastTerm("Fall 2025", today)).toBe(true);
  });

  it("leaves the current term and later terms not past", () => {
    expect(isPastTerm("Fall 2026", today)).toBe(false);
    expect(isPastTerm("Spring 2027", today)).toBe(false);
  });

  it("still calls Spring current on May 31 of the same year", () => {
    const may31 = at(2026, 5, 31);
    expect(isCurrentTerm("Spring 2026", may31)).toBe(true);
    expect(isPastTerm("Spring 2026", may31)).toBe(false);
    expect(isCurrentTerm("Fall 2026", may31)).toBe(false);
  });

  it("is false for names it cannot parse", () => {
    expect(isCurrentTerm("Summer 2026", today)).toBe(false);
    expect(isPastTerm("Summer 2026", today)).toBe(false);
  });
});
