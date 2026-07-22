/**
 * The one precedence rule behind every distributional number in the app:
 * stored wins, absent falls back to the catalog, editing materializes.
 */

import { describe, it, expect } from "vitest";
import {
  distributionalEditBase,
  effectiveDistributionals,
  hasStoredDistributionals,
} from "@/lib/utils/effectiveDistributionals";
import { getCourseDistributionalsFromCode } from "@/lib/courseCatalog";
import { toggleDistributionalTag } from "@/lib/distributionalTags";
import { allocateDistributionals } from "@/lib/distributionalAllocation";
import { tallyDistributionals } from "@/lib/distributionalTally";
import type { Course } from "@/lib/types";

// A real catalog course carrying two tags, so the "keeps the other defaults"
// case has something to keep.
const MULTI_TAG_CODE = "AFAM 0160";
const MULTI_TAG_TAGS = ["Hu", "WR"];
// A real catalog course carrying exactly one tag.
const QR_CODE = "CPSC 2230";

const course = (over: Partial<Course> & { code: string }): Course => ({
  id: over.code,
  grade: null,
  semester: "Fall",
  year: 2025,
  userId: "u",
  status: "completed",
  credits: 1,
  ...over,
});

describe("catalog distributionals are the default for every course", () => {
  it("the fixtures still match the shipped catalog", () => {
    expect(getCourseDistributionalsFromCode(MULTI_TAG_CODE)).toEqual(
      MULTI_TAG_TAGS,
    );
    expect(getCourseDistributionalsFromCode(QR_CODE)).toEqual(["QR"]);
  });

  // Probe (a)
  it("stored tags beat the catalog", () => {
    const c = course({ code: MULTI_TAG_CODE, distributionals: ["So"] });
    expect(effectiveDistributionals(c)).toEqual(["So"]);
  });

  // Probe (b)
  it("a stored empty array falls back to the catalog (import debris rule)", () => {
    const c = course({ code: MULTI_TAG_CODE, distributionals: [] });
    expect(effectiveDistributionals(c)).toEqual(MULTI_TAG_TAGS);
    expect(hasStoredDistributionals(c)).toBe(true);
  });

  // Probe (c)
  it("an absent field resolves to the catalog's tags", () => {
    const c = course({ code: MULTI_TAG_CODE });
    expect(effectiveDistributionals(c)).toEqual(MULTI_TAG_TAGS);
    expect(hasStoredDistributionals(c)).toBe(false);
  });

  it("resolves through code aliases", () => {
    // AFAM 016 is the legacy alias of AFAM 0160.
    expect(effectiveDistributionals(course({ code: "AFAM 016" }))).toEqual(
      MULTI_TAG_TAGS,
    );
  });

  it("a course the catalog has never heard of resolves to nothing", () => {
    expect(effectiveDistributionals(course({ code: "ZZZZ 9999" }))).toEqual([]);
  });

  // Probe (d)
  describe("editing materializes the defaults first", () => {
    it("removing one catalog tag keeps the others and sticks", () => {
      const stored = toggleDistributionalTag(
        distributionalEditBase(course({ code: MULTI_TAG_CODE })),
        "WR",
      );
      expect(stored).toEqual(["Hu"]);

      // Persisted, the course is now authoritative: WR does not come back.
      const reloaded = course({
        code: MULTI_TAG_CODE,
        distributionals: stored,
      });
      expect(effectiveDistributionals(reloaded)).toEqual(["Hu"]);
    });

    it("adding a tag keeps the catalog defaults alongside it", () => {
      const stored = toggleDistributionalTag(
        distributionalEditBase(course({ code: QR_CODE })),
        "Sc",
      );
      expect(stored).toEqual(["QR", "Sc"]);
    });

    it("clearing every tag stores empty, which resolves back to the catalog", () => {
      let stored = distributionalEditBase(course({ code: MULTI_TAG_CODE }));
      for (const tag of MULTI_TAG_TAGS) {
        stored = toggleDistributionalTag(stored, tag);
      }
      expect(stored).toEqual([]);
      // Empty is not authoritative under the import-debris rule: the catalog
      // wins again. A course cannot be pinned to zero tags, by design.
      expect(
        effectiveDistributionals(
          course({ code: MULTI_TAG_CODE, distributionals: stored }),
        ),
      ).toEqual(MULTI_TAG_TAGS);
    });

    it("does not hand back the catalog's own array to mutate", () => {
      const base = distributionalEditBase(course({ code: MULTI_TAG_CODE }));
      base.push("QR");
      expect(getCourseDistributionalsFromCode(MULTI_TAG_CODE)).toEqual(
        MULTI_TAG_TAGS,
      );
    });
  });

  // Probe (e)
  it("the tally counts effective tags for an untouched student", () => {
    const courses = [
      course({ code: MULTI_TAG_CODE, id: "a" }),
      course({ code: QR_CODE, id: "b" }),
    ];
    const { counts } = tallyDistributionals(
      courses.map((c) => effectiveDistributionals(c)),
    );
    expect(counts).toEqual({ Hu: 1, WR: 1, QR: 1 });
  });

  it("the allocation places courses that were never tagged by hand", () => {
    const courses = [
      course({ code: MULTI_TAG_CODE, id: "a" }),
      course({ code: QR_CODE, id: "b" }),
    ];
    const allocation = allocateDistributionals(courses, {
      auto: true,
      overrides: {},
    });
    expect(allocation.optionsByCourseKey["a"]).toEqual(MULTI_TAG_TAGS);
    expect(allocation.reqByCourseKey["b"]).toBe("QR");
  });

  it("a course with import-debris empty tags still enters the allocation", () => {
    const allocation = allocateDistributionals(
      [course({ code: MULTI_TAG_CODE, id: "a", distributionals: [] })],
      { auto: true, overrides: {} },
    );
    expect(allocation.reqByCourseKey["a"]).toBeDefined();
  });
});
