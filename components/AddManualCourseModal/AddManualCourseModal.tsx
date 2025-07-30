"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiPlus, FiSearch } from "react-icons/fi";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";

export default function AddManualCourseModal({
  isOpen,
  requirement,
  onClose,
  onSuccess,
  userCourses,
}: {
  isOpen: boolean;
  requirement: string;
  onClose: () => void;
  onSuccess: () => void;
  userCourses: Course[];
}) {
  const { user } = useAuth();
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter courses based on search query
  const filteredCourses = userCourses.filter((course) =>
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!user || !selectedCourse) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Update the existing course document
      const courseRef = doc(db, "courses", selectedCourse.id);

      await updateDoc(courseRef, {
        manualRequirementsFulfilled: arrayUnion({
          major_id: requirement.split("|")[0],
          requirement_title: requirement.split("|")[1],
        }),
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error updating course:", err);
      setError("Failed to add requirement to course");
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
            className="bg-gray-900 rounded-xl border border-gray-800 max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Add a course to fulfill the requirement:
                <br /> <i>{requirement.split("|")[1]}</i>
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-200"
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Search Your Courses
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FiSearch className="text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-pink-500"
                    placeholder="Search courses from your transcript..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Select Course
                </label>
                <div className="max-h-60 overflow-y-auto border border-gray-700 rounded-lg">
                  {filteredCourses.length > 0 ? (
                    filteredCourses.map((course) => (
                      <div
                        key={course.id}
                        onClick={() => setSelectedCourse(course)}
                        className={`p-3 hover:bg-gray-800 cursor-pointer transition-colors ${
                          selectedCourse?.id === course.id
                            ? "bg-gray-800 border-l-4 border-pink-500"
                            : "border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{course.code}</span>
                          <span className="text-xs text-gray-400">
                            {course.status === "in-progress"
                              ? "In Progress"
                              : course.status === "completed"
                              ? "Completed"
                              : "Not Taken"}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400 truncate">
                          {getCourseNameFromCode(course.code)}
                        </div>
                        {course.grade && (
                          <div className="text-xs text-gray-500 mt-1">
                            Grade: {course.grade} • {course.semester}{" "}
                            {course.year}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-400">
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
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
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
