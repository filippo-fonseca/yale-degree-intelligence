import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSearch, FiX, FiPlus } from "react-icons/fi";
import coursesData from "@/lib/courses.json";
import { Course } from "@/lib/types";
import { Panda } from "lucide-react";
import Link from "next/link";

interface ManualCourseLookupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (course: Course) => void;
  userId: string;
}

export default function ManualCourseLookupModal({
  isOpen,
  onClose,
  onSelect,
  userId,
}: ManualCourseLookupModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const modalRef = useRef<HTMLDivElement>(null); // Ref to the modal div

  // Close modal if click outside of modal
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Build a map of every code (canonical and aliases) to their canonical course entry
  const courseLookupMap = useMemo(() => {
    const map: Record<string, any> = {};
    (coursesData as any[]).forEach((course) => {
      course.codes?.forEach((code: string) => {
        map[code] = course;
      });
    });
    return map;
  }, []);

  // For display: array of canonical course objects (only one per course)
  const allCanonicalCourses = useMemo(() => {
    return (coursesData as any[]).map((course) => ({
      ...course,
      canonicalCode: course.codes?.[0],
      allCodes: course.codes,
    }));
  }, []);

  // Filter for search, allowing match on *any* code, name, or department, but deduping by canonical code
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();

    return allCanonicalCourses
      .filter((course) => {
        // Match any code (old or new), or name, or department
        const codesMatch = course.allCodes?.some((code: string) =>
          code.toLowerCase().includes(lower)
        );
        const nameMatch = (course.name ?? "").toLowerCase().includes(lower);
        const deptMatch = (course.department ?? "")
          .toLowerCase()
          .includes(lower);
        return codesMatch || nameMatch || deptMatch;
      })
      .slice(0, 15); // For performance
  }, [searchTerm, allCanonicalCourses]);

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
            ref={modalRef} // Assign the ref here
            className="bg-gray-900 p-6 rounded-xl max-w-xl w-full border border-gray-800 flex flex-col"
            style={{
              height: "480px", // <--- Constant modal height
              minHeight: "480px",
              maxHeight: "480px",
            }}
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
              <FiSearch className="text-pink-400" />
              <input
                type="text"
                value={searchTerm}
                autoFocus
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Type a code, name, or department…"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchTerm.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-gray-500 text-center py-8 gap-4">
                  <Panda size={32} />
                  <div>
                    Can't find a course?{" "}
                    <Link
                      href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                      className="text-gray-400 hover:text-pink-400 transition"
                    >
                      Let us know.
                    </Link>{" "}
                  </div>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No results found.
                </div>
              ) : (
                filteredCourses.map((c) => (
                  <div
                    key={c.canonicalCode}
                    className="flex justify-between items-center px-3 py-2 bg-gray-800 rounded-lg border border-gray-700 hover:border-pink-400 transition cursor-pointer"
                  >
                    <div>
                      <div className="font-medium text-gray-200">
                        {c.canonicalCode}{" "}
                        <span className="text-xs text-gray-400 font-normal">
                          {c.department}
                        </span>
                      </div>
                      <div className="text-sm text-gray-400">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.credits} credit{c.credits !== 1 ? "s" : ""}{" "}
                        <span className="text-xs text-gray-500">
                          {c.allCodes.length > 1 &&
                            `(aka: ${c.allCodes.slice(1).join(", ")})`}
                        </span>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-pink-900/60 text-pink-200 rounded-lg border border-pink-800 hover:bg-pink-800 hover:text-white transition"
                      onClick={() => {
                        onSelect({
                          id: `${c.canonicalCode}-manual-${Date.now()}`,
                          code: c.canonicalCode,
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
