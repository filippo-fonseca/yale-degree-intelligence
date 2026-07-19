"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { getGPAColor as getLetterGradeColor } from "@/lib/utils/utils";
import { getCourseNameFromCode } from "@/lib/courseCatalog";

export function SkippedSection({
  courses,
  hasMultipleMajors,
}: {
  courses: Course[];
  hasMultipleMajors: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="mb-8"
    >
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
          "Skipped" courses for your major{hasMultipleMajors ? "s" : ""}
        </h3>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          You indicated in the{" "}
          <i>My major</i> page that you qualify to "skip" these classes, which
          fulfill requirements.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {courses.map((course, idx) => (
          <motion.div
            key={course.id || `skipped-${course.code}-${idx}`}
            whileHover={{ y: -1 }}
            transition={{ duration: 0.12 }}
            className="p-4 rounded-xl bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/50 dark:via-gray-900/30 dark:to-gray-950/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800/40 border-l-2 border-l-gray-300 dark:border-l-gray-700 shadow-sm dark:shadow-none"
          >
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                  {course.code}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {getCourseNameFromCode(course.code)}
                </p>
                <span className="inline-block mt-1.5 text-xs text-gray-400 dark:text-gray-500">
                  {course.credits} credit{course.credits !== 1 ? "s" : ""}
                </span>
              </div>
              {course.grade && (
                <span
                  className={`text-lg font-medium ${getLetterGradeColor(course.grade)}`}
                >
                  {course.grade}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
