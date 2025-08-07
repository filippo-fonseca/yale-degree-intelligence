"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX, FiPlus } from "react-icons/fi";
import coursesData from "@/lib/courses.json"; // Adjust the path if needed
import { Course } from "@/lib/types";
import {
  getCourseNameFromCode,
  getCourseCreditsFromCode,
} from "@/lib/courseCatalog";

interface ManualCourseLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (course: Course) => void;
  // alreadyAddedCodes: string[]; // To prevent duplicates
  userId: string;
}

export default function ManualCourseLookupModal({
  isOpen,
  onClose,
  onSelect,
  // alreadyAddedCodes,
  userId,
}: ManualCourseLookupModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Flatten all codes so every code can be searched
  const allCourseOptions = useMemo(() => {
    return (coursesData as any[]).flatMap((course) =>
      course.codes?.map((code: string, idx: number) => ({
        code,
        canonical: idx === 0,
        name: course.name,
        credits: course.credits,
        department: course.department,
      }))
    );
  }, []);

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();
    return allCourseOptions
      .filter((c) => {
        const searchString =
          (c?.code ?? "") + (c?.name ?? "") + (c?.department ?? "");
        return searchString.toLowerCase().includes(lower);
      })

      .slice(0, 15); // Limit results for perf
    // }, [searchTerm, allCourseOptions, alreadyAddedCodes]);
  }, [searchTerm, allCourseOptions]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-gray-900 p-6 rounded-xl max-w-xl w-full border border-gray-800"
            initial={{ scale: 0.97, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.97, y: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-white">
                Add any Yale course
              </h3>
              <button
                onClick={() => {
                  setSearchTerm("");
                  onClose();
                }}
                className="text-gray-400 hover:text-red-400 transition"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <FiSearch className="text-blue-400" />
              <input
                type="text"
                value={searchTerm}
                autoFocus
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type a code, name, or department…"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
              />
            </div>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {searchTerm.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  Search for any Yale course by code, name, or department.
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No results found.
                </div>
              ) : (
                filtered.map((c) => (
                  <div
                    key={c.code}
                    className="flex justify-between items-center px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-blue-400 transition cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-gray-200">
                        {c.code}{" "}
                        <span className="text-xs text-gray-400 font-normal">
                          {c.department}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.credits} credit{c.credits !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/60 text-blue-200 rounded-lg border border-blue-800 hover:bg-blue-800 hover:text-white transition"
                      onClick={() => {
                        onSelect({
                          id: `${c.code}-manual-${Date.now()}`,
                          code: c.code,
                          grade: null,
                          semester: "TBD",
                          year: 0,
                          userId,
                          status: "not-taken",
                          credits: c.credits,
                          skipped: false,
                        });
                        setSearchTerm("");
                        onClose();
                      }}
                    >
                      <FiPlus /> Add
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
