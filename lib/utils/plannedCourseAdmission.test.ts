/**
 * The one predicate behind the simulator's drag-and-drop guard.
 *
 * The interesting cases are the two boundaries: a course the major still wants
 * has to stay droppable even while a certificate refuses it, and a course every
 * program refuses has to be stopped before it lands on the grid. Everything
 * else here pins the shape of the answer the error modal renders.
 *
 * Certificate ids, major ids, and course codes were read out of
 * lib/data/all_certificates.json and lib/data/all_reqs.json.
 */

import { describe, it, expect } from "vitest";
import { REASONS, type Allocation } from "@/lib/certificatePolicy";
import { evaluatePlannedCourseAdmission } from "@/lib/utils/plannedCourseAdmission";

const MAJOR = "CPSC_BS";
// Data Science permits no overlap with a major at all.
const CERT = "CERT_DATA_SCIENCE";
const CERT_ML = "Computation and Machine Learning";

const majorSlot = (requirementTitle: string) => ({
  program: { type: "major" as const, id: MAJOR },
  requirementTitle,
});

const certSlot = (requirementTitle: string) => ({
  program: { type: "certificate" as const, id: CERT },
  requirementTitle,
});

const heldByMajor = (courseCode: string, requirementTitle: string) =>
  ({
    courseCode,
    program: { type: "major", id: MAJOR },
    requirementTitle,
  }) as Allocation;

const base = {
  existing: [] as Allocation[],
  majorIds: [MAJOR],
  certificateIds: [CERT],
};

describe("evaluatePlannedCourseAdmission", () => {
  it("admits a course no program lists, since that is the manual-assign case", () => {
    const result = evaluatePlannedCourseAdmission({
      ...base,
      courseCode: "ANTH 1000",
      candidates: [],
    });

    expect(result.admitted).toBe(true);
    expect(result.refusals).toEqual([]);
  });

  it("admits a course the major still wants even when the certificate refuses it", () => {
    const result = evaluatePlannedCourseAdmission({
      ...base,
      courseCode: "CPSC 2230",
      candidates: [
        majorSlot("Data Structures and Programming Techniques"),
        certSlot(CERT_ML),
      ],
      existing: [heldByMajor("CPSC 2230", "Core Courses")],
    });

    expect(result.admitted).toBe(true);
    // The certificate still refuses, and says so in the engine's own words.
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0].program).toEqual({
      type: "certificate",
      id: CERT,
    });
    expect(result.refusals[0].reason).toBe(
      REASONS.zeroOverlap("Computer Science, B.S.", "Data Science"),
    );
  });

  it("refuses a course when the only program listing it refuses it", () => {
    const result = evaluatePlannedCourseAdmission({
      ...base,
      courseCode: "S&DS 2650",
      candidates: [certSlot(CERT_ML)],
      // Stored by hand against a major that does not list the course, so the
      // certificate is the only program that could take it, and it will not.
      existing: [heldByMajor("S&DS 2650", "Electives")],
    });

    expect(result.admitted).toBe(false);
    expect(result.refusals).toHaveLength(1);
    expect(result.refusals[0].requirementTitle).toBe(CERT_ML);
    expect(result.refusals[0].reason).toBe(
      REASONS.zeroOverlap("Computer Science, B.S.", "Data Science"),
    );
  });

  it("admits a course nothing else holds", () => {
    const result = evaluatePlannedCourseAdmission({
      ...base,
      courseCode: "S&DS 2650",
      candidates: [certSlot(CERT_ML)],
    });

    expect(result.admitted).toBe(true);
    expect(result.refusals).toEqual([]);
  });

  it("keeps one refusal per program and reason", () => {
    const result = evaluatePlannedCourseAdmission({
      ...base,
      courseCode: "S&DS 2650",
      // The same certificate refusing two of its own slots for the same reason
      // is one thing to tell the student, not two.
      candidates: [certSlot(CERT_ML), certSlot("Data Analysis in a Discipline Area")],
      existing: [heldByMajor("S&DS 2650", "Electives")],
    });

    expect(result.admitted).toBe(false);
    expect(result.refusals).toHaveLength(1);
  });

  it("reports every refusing program when more than one refuses", () => {
    const result = evaluatePlannedCourseAdmission({
      ...base,
      certificateIds: [CERT, "CERT_PROGRAMMING"],
      courseCode: "CPSC 2230",
      candidates: [
        certSlot(CERT_ML),
        {
          program: { type: "certificate" as const, id: "CERT_PROGRAMMING" },
          requirementTitle: "Core Courses",
        },
      ],
      // Two programs already hold the course, so the university ceiling refuses
      // any third claim outright.
      existing: [
        heldByMajor("CPSC 2230", "Core Courses"),
        {
          courseCode: "CPSC 2230",
          program: { type: "major", id: "MATH_BS" },
          requirementTitle: "Electives",
        } as Allocation,
      ],
    });

    expect(result.admitted).toBe(false);
    expect(result.refusals).toHaveLength(2);
    expect(result.refusals.map((r) => r.reason)).toEqual([
      REASONS.threePrograms(),
      REASONS.threePrograms(),
    ]);
  });
});
