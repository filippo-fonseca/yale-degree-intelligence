"use client";

import { useState, useEffect, useMemo } from "react";
import { FiCheck, FiSearch } from "react-icons/fi";
import { ModalShell, ModalHeader } from "../ui/ModalShell";
import { ShinyButton } from "../ui/shiny-button";
import { GhostButton } from "../ui/ghost-button";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import toast from "react-hot-toast";
import {
  certificateEligibility,
  evaluateAllocation,
} from "@/lib/certificatePolicy";
import {
  buildProgramClaimContext,
  settleAllocations,
} from "@/lib/utils/programClaims";
import {
  presentVerdict,
  type PolicyPresentation,
} from "@/lib/utils/policyPresentation";

export default function AddManualCourseModal({
  isOpen,
  requirement,
  onClose,
  onSuccess,
  userCourses,
  programType = "major",
  userMajors = [],
  userCertificates = [],
}: {
  isOpen: boolean;
  requirement: string;
  onClose: () => void;
  onSuccess: () => void;
  userCourses: Course[];
  /** When "certificate", writes certificate_id instead of major_id. */
  programType?: "major" | "certificate";
  /** Declared majors, so the engine can resolve eligibility and overlap. */
  userMajors?: string[];
  /** Declared certificates, including ones with no claims yet. */
  userCertificates?: string[];
}) {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const programId = requirement.split("|")[0];
  const requirementTitle = requirement.split("|")[1];

  /**
   * The caller rebuilds these arrays on every render, so the memos below key on
   * their contents instead. Without that the whole claim audit would rerun on
   * every keystroke in the search box.
   */
  const majorKey = userMajors.join(",");
  const certificateKey = userCertificates.join(",");

  /**
   * Every claim the engine should weigh, with the ones it already refuses taken
   * out. A stored conflict has been resolved against the certificate already,
   * so leaving it in would report the overlap budget as fuller than it is and
   * this picker would refuse courses the audit would happily accept.
   */
  const settledAllocations = useMemo(() => {
    if (!isOpen) return [];
    return settleAllocations(
      buildProgramClaimContext(userCourses, {
        majorIds: majorKey ? majorKey.split(",") : [],
        certificateIds: certificateKey ? certificateKey.split(",") : [],
      })
    );
  }, [isOpen, userCourses, majorKey, certificateKey]);

  /**
   * Inside a certificate the student is barred from, the card already carries
   * the ineligibility banner. Repeating it on every single option would drown
   * out the reasons that actually differ per course, so options here render on
   * their own merits.
   */
  const bannerCarriesIneligibility =
    programType === "certificate" &&
    !certificateEligibility(programId, userMajors).eligible;

  const options = useMemo(() => {
    const majorIds = majorKey ? majorKey.split(",") : [];
    const certificateIds = certificateKey ? certificateKey.split(",") : [];
    return userCourses.map((course) => {
      const verdict = evaluateAllocation({
        courseCode: course.code,
        target: { type: programType, id: programId, requirementTitle },
        existing: settledAllocations,
        majorIds,
        certificateIds,
        grade: course.grade,
      });
      let presentation: PolicyPresentation = presentVerdict(verdict);
      if (
        bannerCarriesIneligibility &&
        verdict.allowed &&
        verdict.kind === "warn" &&
        verdict.code === "ineligible-major"
      ) {
        presentation = { disabled: false, tone: "neutral" };
      }
      return { course, presentation };
    });
  }, [
    userCourses,
    programType,
    programId,
    requirementTitle,
    settledAllocations,
    majorKey,
    certificateKey,
    bannerCarriesIneligibility,
  ]);

  // Filter courses based on search query (code or course name)
  const filteredOptions = options.filter(({ course }) => {
    const q = searchQuery.toLowerCase();
    const code = course.code.toLowerCase();
    const name = (getCourseNameFromCode(course.code) || "").toLowerCase();
    return code.includes(q) || name.includes(q);
  });

  const handleSubmit = async () => {
    if (!user || !selectedCourse) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Update the existing course document
      const courseRef = doc(db, "courses", selectedCourse.id);

      const payload =
        programType === "certificate"
          ? {
              certificate_id: programId,
              requirement_title: requirementTitle,
            }
          : {
              major_id: programId,
              requirement_title: requirementTitle,
            };

      await updateDoc(courseRef, {
        manualRequirementsFulfilled: arrayUnion(payload),
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error updating course:", err);
      setError("Failed to add requirement to course");
      toast.error("Failed to add manual fulfillment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSelectedCourse(null);
      setSearchQuery("");
      setError("");
    }
  }, [isOpen]);

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      label="fulfill manually"
      maxWidth="max-w-lg"
      dismissable={!isSubmitting}
    >
      <div className="p-5 sm:p-6">
        <ModalHeader title="Count a course you have already taken">
          Pick the course from your transcript that fulfills{" "}
          <span className="text-gray-900 dark:text-white">
            {requirementTitle}
          </span>
          . Only do this when your DUS or program has confirmed it counts.
        </ModalHeader>

        <div className="relative mt-5">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your transcript..."
            className="w-full rounded-xl border border-black/[0.08] bg-white py-2 pl-9 pr-3 font-sf text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black/25 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-white dark:placeholder:text-gray-600 dark:focus:border-white/25"
          />
        </div>

        <div className="mt-3 max-h-64 divide-y divide-black/[0.05] overflow-y-auto rounded-xl border border-black/[0.06] bg-[#fafafa] dark:divide-white/[0.06] dark:border-white/[0.07] dark:bg-white/[0.03]">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(({ course, presentation }) => {
              const isSelected = selectedCourse?.id === course.id;
              return (
                <button
                  key={course.id}
                  type="button"
                  onClick={
                    presentation.disabled
                      ? undefined
                      : () => setSelectedCourse(course)
                  }
                  disabled={presentation.disabled}
                  aria-pressed={isSelected}
                  className={`flex w-full items-start justify-between gap-3 px-3.5 py-2.5 text-left transition-colors ${
                    presentation.disabled
                      ? "cursor-not-allowed opacity-45"
                      : isSelected
                        ? "bg-black/[0.05] dark:bg-white/[0.07]"
                        : "hover:bg-black/[0.03] dark:hover:bg-white/[0.05]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="flex items-baseline gap-2">
                      <span className="font-sf text-sm font-medium text-gray-900 dark:text-white">
                        {course.code}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-gray-400 dark:text-gray-500">
                        {course.status === "in-progress"
                          ? "in progress"
                          : course.status === "completed"
                            ? "completed"
                            : "not taken"}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate font-sf text-xs text-gray-500 dark:text-gray-400">
                      {getCourseNameFromCode(course.code)}
                    </span>
                    {presentation.reason && (
                      <span
                        className={`mt-1 block font-sf text-[11px] leading-relaxed ${
                          presentation.tone === "amber"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {presentation.reason}
                      </span>
                    )}
                    {course.grade && (
                      <span className="mt-1 block font-mono text-[10px] text-gray-400 dark:text-gray-500">
                        {course.grade} · {course.semester} {course.year}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <FiCheck className="mt-0.5 h-4 w-4 shrink-0 text-pink-500 dark:text-pink-400" />
                  )}
                </button>
              );
            })
          ) : (
            <p className="px-3.5 py-6 text-center font-sf text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "No courses match your search"
                : "No courses available"}
            </p>
          )}
        </div>

        {error && (
          <p className="mt-3 font-sf text-xs text-red-500 dark:text-red-400">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2 font-sf">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <ShinyButton
            size="sm"
            onClick={() => void handleSubmit()}
            pending={isSubmitting}
            disabled={!selectedCourse}
          >
            {isSubmitting ? "Adding..." : "Add to requirement"}
          </ShinyButton>
        </div>
      </div>
    </ModalShell>
  );
}
