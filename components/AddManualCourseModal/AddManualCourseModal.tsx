"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiPlus } from "react-icons/fi";
import { collection, addDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { isValidCourseCode, getCourseInfo } from "@/lib/courseCatalog";
import { gradePoints } from "@/lib/constants";

const grades = Object.keys(gradePoints).filter((g) => g !== "In Progress");

export default function AddManualCourseModal({
  isOpen,
  requirement,
  onClose,
  onSuccess,
}: {
  isOpen: boolean;
  requirement: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { user } = useAuth();
  const [courseCode, setCourseCode] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("A");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !courseCode.trim()) return;

    // Validate course code
    if (!isValidCourseCode(courseCode)) {
      setError("Invalid course code");
      return;
    }

    const courseInfo = getCourseInfo(courseCode);
    if (!courseInfo) {
      setError("Course not found in catalog");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // Create a new course with manual fulfillment
      const newCourse = {
        code: courseInfo.codes[0], // Use canonical code
        status: "completed",
        grade: selectedGrade,
        semester: "Manual",
        year: new Date().getFullYear(),
        userId: user.uid,
        credits: courseInfo.credits,
        manualRequirementsFulfilled: [
          {
            major_id: requirement.split("|")[0],
            requirement_title: requirement.split("|")[1],
          },
        ],
      };

      await addDoc(collection(db, "courses"), newCourse);
      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error adding manual course:", err);
      setError("Failed to add course");
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Add Course for {requirement.split("|")[1]}
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
                  Course Code
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. CPSC 201"
                />
                {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">
                  Grade Received
                </label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {grades.map((grade) => (
                    <option key={grade} value={grade}>
                      {grade}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !courseCode.trim()}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSubmitting ? (
                    "Adding..."
                  ) : (
                    <>
                      <FiPlus size={16} />
                      Add Course
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
