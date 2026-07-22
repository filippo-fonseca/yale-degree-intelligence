/**
 * The language requirement lives inside one language: a new language started
 * later must never drag down a sequence already finished in another.
 */

import { describe, it, expect } from "vitest";
import {
  buildLanguageTracks,
  primaryLanguageTrack,
  requiredLevelsForPlacement,
} from "@/lib/languageRequirement";
import type { Course } from "@/lib/types";

const course = (code: string): Course => ({
  id: code,
  code,
  grade: null,
  semester: "Fall",
  year: 2025,
  userId: "u",
  status: "completed",
  credits: 1,
});

/** distMap shape the views build: level tag → the courses carrying it. */
const distMap = (entries: Record<string, string[]>): Record<string, Course[]> =>
  Object.fromEntries(
    Object.entries(entries).map(([level, codes]) => [level, codes.map(course)]),
  );

describe("requiredLevelsForPlacement", () => {
  it("maps each placement to its YCPS sequence", () => {
    expect(requiredLevelsForPlacement(1)).toEqual(["L1", "L2", "L3"]);
    expect(requiredLevelsForPlacement(2)).toEqual(["L2", "L3", "L4"]);
    expect(requiredLevelsForPlacement(3)).toEqual(["L3", "L4"]);
    expect(requiredLevelsForPlacement(4)).toEqual(["L4"]);
    expect(requiredLevelsForPlacement(5)).toEqual(["L5"]);
    expect(requiredLevelsForPlacement(0)).toEqual([]);
  });
});

describe("buildLanguageTracks", () => {
  it("scores each language separately", () => {
    const tracks = buildLanguageTracks(
      distMap({ L5: ["FREN S164"], L1: ["RUSS 1100"] }),
    );

    expect(tracks.map((t) => t.subject)).toEqual(["FREN", "RUSS"]);
    expect(tracks[0]).toMatchObject({
      label: "French",
      placement: 5,
      isComplete: true,
      nextNeeded: null,
    });
    expect(tracks[1]).toMatchObject({
      label: "Russian",
      placement: 1,
      isComplete: false,
      nextNeeded: "L2",
    });
  });

  it("keeps a finished language primary when a new one starts at L1", () => {
    const track = primaryLanguageTrack(
      distMap({ L5: ["FREN S164"], L1: ["RUSS 1100"] }),
    );

    expect(track?.subject).toBe("FREN");
    expect(track?.placement).toBe(5);
    expect(track?.isComplete).toBe(true);
  });

  it("reads placement from the lowest level within a language", () => {
    const track = primaryLanguageTrack(
      distMap({ L2: ["SPAN 1300"], L3: ["SPAN 1400"] }),
    );

    expect(track).toMatchObject({
      subject: "SPAN",
      placement: 2,
      requiredLevels: ["L2", "L3", "L4"],
      completedRequired: ["L2", "L3"],
      isComplete: false,
      nextNeeded: "L4",
    });
    expect(track?.progress).toBeCloseTo(2 / 3);
  });

  it("prefers the furthest-along language when none is complete", () => {
    const tracks = buildLanguageTracks(
      distMap({ L1: ["RUSS 1100", "ITAL 1100"], L2: ["ITAL 1200"] }),
    );

    expect(tracks[0].subject).toBe("ITAL");
    expect(tracks[0].completedRequired).toEqual(["L1", "L2"]);
    expect(tracks[1].subject).toBe("RUSS");
  });

  it("returns nothing when no language course is tagged", () => {
    expect(buildLanguageTracks(distMap({ Hu: ["ENGL 1140"] }))).toEqual([]);
    expect(primaryLanguageTrack({})).toBeNull();
  });
});
