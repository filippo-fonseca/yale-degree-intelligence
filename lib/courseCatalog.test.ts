/**
 * SPEC section 3: course-code normalization.
 *
 * One helper backs every comparison in the policy engine, so these cases are
 * the foundation the rest of the suite stands on.
 */

import { describe, it, expect } from "vitest";
import {
  courseLevel,
  courseSubject,
  normalizeCourseCode,
} from "@/lib/courseCatalog";

describe("SPEC 3: course-code normalization", () => {
  describe("normalizeCourseCode: three-digit legacy numbers expand to four", () => {
    it("treats CPSC 223 and CPSC 2230 as the same course", () => {
      expect(normalizeCourseCode("CPSC 223")).toBe(
        normalizeCourseCode("CPSC 2230")
      );
      expect(normalizeCourseCode("CPSC 223")).toBe("CPSC 2230");
    });

    it("treats S&DS 265 and S&DS 2650 as the same course", () => {
      expect(normalizeCourseCode("S&DS 265")).toBe(
        normalizeCourseCode("S&DS 2650")
      );
      expect(normalizeCourseCode("S&DS 265")).toBe("S&DS 2650");
    });

    it("leaves a four-digit number alone", () => {
      expect(normalizeCourseCode("MATH 2220")).toBe("MATH 2220");
    });
  });

  describe("normalizeCourseCode: input shape is forgiving", () => {
    it("uppercases lowercase input", () => {
      expect(normalizeCourseCode("cpsc 223")).toBe("CPSC 2230");
      expect(normalizeCourseCode("s&ds 2650")).toBe("S&DS 2650");
    });

    it("collapses runs of whitespace and trims the edges", () => {
      expect(normalizeCourseCode("  CPSC    223  ")).toBe("CPSC 2230");
      expect(normalizeCourseCode("MATH\t2220")).toBe("MATH 2220");
    });

    it("preserves a trailing letter while expanding the digits", () => {
      expect(normalizeCourseCode("PHYS 205L")).toBe("PHYS 2050L");
      expect(normalizeCourseCode("phys 2050l")).toBe("PHYS 2050L");
    });
  });

  describe("normalizeCourseCode: unparseable input falls through", () => {
    it("returns the cleaned string instead of throwing", () => {
      expect(() => normalizeCourseCode("SENIOR ESSAY")).not.toThrow();
      expect(normalizeCourseCode("senior  essay")).toBe("SENIOR ESSAY");
    });

    it("handles an empty string", () => {
      expect(normalizeCourseCode("")).toBe("");
    });
  });

  describe("courseLevel: floored to the thousand band", () => {
    it("reads CPSC 2230 as the 2000 band", () => {
      expect(courseLevel("CPSC 2230")).toBe(2000);
    });

    it("normalizes a three-digit input before reading the band", () => {
      expect(courseLevel("CPSC 223")).toBe(2000);
      expect(courseLevel("PHYS 320")).toBe(3000);
    });

    it("returns null when the code carries no number", () => {
      expect(courseLevel("SENIOR ESSAY")).toBeNull();
    });
  });

  describe("courseSubject: prefix used by the department caps", () => {
    it("reads the subject of a code containing an ampersand", () => {
      expect(courseSubject("S&DS 2650")).toBe("S&DS");
      expect(courseSubject("S&DS 265")).toBe("S&DS");
    });

    it("reads an ordinary subject prefix", () => {
      expect(courseSubject("CPSC 2230")).toBe("CPSC");
      expect(courseSubject("PHYS 205L")).toBe("PHYS");
    });

    it("returns null when the code has no separable subject", () => {
      expect(courseSubject("SENIOR ESSAY")).toBeNull();
    });
  });
});
