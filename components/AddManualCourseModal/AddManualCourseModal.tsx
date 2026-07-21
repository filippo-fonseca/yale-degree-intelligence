"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiPlus, FiSearch } from "react-icons/fi";
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
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Add a course to fulfill the requirement:
                <br /> <i>{requirement.split("|")[1]}</i>
              </h3>
              <button
                onClick={onClose}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                {/* <label className="block text-sm text-gray-400 mb-1">
                  Search Your Courses
                </label> */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-10 pr-4 py-2 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Search courses from your transcript..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-500 dark:text-gray-400 mb-1">
                  Make sure you're ABSOLUTELY sure it's accepted by your DUS.
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map(({ course, presentation }) => (
                      <div
                        key={course.id}
                        onClick={
                          presentation.disabled
                            ? undefined
                            : () => setSelectedCourse(course)
                        }
                        aria-disabled={presentation.disabled || undefined}
                        className={`p-3 transition-colors ${
                          presentation.disabled
                            ? "opacity-45 cursor-not-allowed border-l-4 border-transparent"
                            : `cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                                selectedCourse?.id === course.id
                                  ? "bg-gray-50 dark:bg-gray-800 border-l-4 border-pink-500"
                                  : "border-l-4 border-transparent"
                              }`
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium text-gray-900 dark:text-white">{course.code}</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {course.status === "in-progress"
                              ? "In Progress"
                              : course.status === "completed"
                              ? "Completed"
                              : "Not Taken"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {getCourseNameFromCode(course.code)}
                        </div>
                        {presentation.reason && (
                          <div
                            className={`text-[11px] mt-1 ${
                              presentation.tone === "amber"
                                ? "text-amber-600 dark:text-amber-400"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          >
                            {presentation.reason}
                          </div>
                        )}
                        {course.grade && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                            Grade: {course.grade} • {course.semester}{" "}
                            {course.year}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      {searchQuery
                        ? "No courses match your search"
                        : "No courses available"}
                    </div>
                  )}
                </div>
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedCourse}
                  className="px-4 py-2 rounded-lg bg-pink-600 text-white hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    "Adding..."
                  ) : (
                    <>
                      <FiPlus size={16} />
                      Add course to this req
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
