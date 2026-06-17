"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiPlus, FiSearch, FiTrash2, FiCheck, FiEdit3 } from "react-icons/fi";
import coursesData from "@/lib/new_courses.json";
import { Course } from "@/lib/types";

interface ManualCourseEntry {
  id: string;
  code: string;
  courseName: string;
  grade: string;
  semester: string;
  year: number;
  credits: number;
  status: "completed" | "in-progress";
  isCustom: boolean; // true if course not found in catalog
}

interface ManualCourseEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (courses: Omit<Course, "id">[]) => Promise<void>;
  userId: string;
}

const GRADES = [
  "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F", "CR", "In Progress",
];

const SEMESTERS = ["Fall", "Spring", "Summer"];
const CREDITS = [0.5, 1, 1.5, 2];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2018 + 2 }, (_, i) => CURRENT_YEAR + 1 - i);

export default function ManualCourseEntryModal({
  isOpen,
  onClose,
  onSubmit,
  userId,
}: ManualCourseEntryModalProps) {
  const [entries, setEntries] = useState<ManualCourseEntry[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [searchingEntryId, setSearchingEntryId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [customCodeInput, setCustomCodeInput] = useState("");
  const [customNameInput, setCustomNameInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get all canonical courses for search
  const allCanonicalCourses = useMemo(() => {
    return (coursesData as any[]).map((course) => ({
      ...course,
      canonicalCode: course.codes?.[0],
      allCodes: course.codes,
      isFall: course.isFall === true,
      isSpring: course.isSpring === true,
    }));
  }, []);

  // Filter courses based on search term
  const filteredCourses = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const lower = searchTerm.toLowerCase();

    return allCanonicalCourses
      .filter((course) => {
        const codesMatch = course.allCodes?.some((code: string) =>
          code.toLowerCase().includes(lower)
        );
        const nameMatch = (course.name ?? "").toLowerCase().includes(lower);
        return codesMatch || nameMatch;
      })
      .slice(0, 6);
  }, [searchTerm, allCanonicalCourses]);

  useEffect(() => {
    if (isOpen) {
      // Start with one empty entry ready to go
      const initialEntry: ManualCourseEntry = {
        id: `entry-${Date.now()}`,
        code: "",
        courseName: "",
        grade: "In Progress",
        semester: "Fall",
        year: CURRENT_YEAR,
        credits: 1,
        status: "in-progress",
        isCustom: false,
      };
      setEntries([initialEntry]);
      setSearchingEntryId(initialEntry.id);
      setError("");
      setSearchTerm("");
      setShowCustomInput(false);
      setCustomCodeInput("");
      setCustomNameInput("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchingEntryId && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchingEntryId]);

  const addNewEntry = () => {
    const newEntry: ManualCourseEntry = {
      id: `entry-${Date.now()}`,
      code: "",
      courseName: "",
      grade: "In Progress",
      semester: "Fall",
      year: CURRENT_YEAR,
      credits: 1,
      status: "in-progress",
      isCustom: false,
    };
    setEntries([...entries, newEntry]);
    setSearchingEntryId(newEntry.id);
    setSearchTerm("");
    setShowCustomInput(false);
  };

  const removeEntry = (id: string) => {
    setEntries(entries.filter((e) => e.id !== id));
    if (searchingEntryId === id) {
      setSearchingEntryId(null);
      setSearchTerm("");
      setShowCustomInput(false);
    }
  };

  const updateEntry = (id: string, updates: Partial<ManualCourseEntry>) => {
    setEntries(
      entries.map((e) => {
        if (e.id === id) {
          const updated = { ...e, ...updates };
          if (updates.grade !== undefined) {
            updated.status = updates.grade === "In Progress" ? "in-progress" : "completed";
          }
          return updated;
        }
        return e;
      })
    );
  };

  const selectCourse = (entryId: string, course: any) => {
    updateEntry(entryId, {
      code: course.canonicalCode,
      courseName: course.name,
      credits: course.credits || 1,
      isCustom: false,
    });
    setSearchingEntryId(null);
    setSearchTerm("");
    setShowCustomInput(false);
  };

  const selectCustomCourse = (entryId: string) => {
    if (!customCodeInput.trim()) return;
    updateEntry(entryId, {
      code: customCodeInput.trim().toUpperCase(),
      courseName: customNameInput.trim() || "Course",
      credits: 1,
      isCustom: true,
    });
    setSearchingEntryId(null);
    setSearchTerm("");
    setShowCustomInput(false);
    setCustomCodeInput("");
    setCustomNameInput("");
  };

  const handleSubmit = async () => {
    const validEntries = entries.filter((e) => e.code);
    if (validEntries.length === 0) {
      setError("Please add at least one course.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const coursesToAdd: Omit<Course, "id">[] = validEntries.map((entry) => ({
        code: entry.code,
        grade: entry.grade === "In Progress" ? null : entry.grade,
        semester: entry.semester,
        year: entry.year,
        userId,
        status: entry.status,
        credits: entry.credits,
      }));

      await onSubmit(coursesToAdd);
      onClose();
    } catch (err) {
      console.error("Error adding courses:", err);
      setError("Failed to add courses. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const validCount = entries.filter((e) => e.code).length;

  // Render semester emoji for a course
  const renderSemesterIcon = (course: { isFall: boolean; isSpring: boolean }) => {
    const boxClasses = "inline-flex items-center px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700/50 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.3),inset_-1px_-1px_2px_rgba(255,255,255,0.05)] text-[10px]";

    if (course.isFall && course.isSpring) {
      return (
        <span className="inline-flex items-center gap-1">
          <span className={boxClasses} title="Offered in Fall">
            🍁
          </span>
          <span className={boxClasses} title="Offered in Spring">
            🌰
          </span>
        </span>
      );
    } else if (course.isFall) {
      return (
        <span className={boxClasses} title="Offered in Fall">
          🍁
        </span>
      );
    } else if (course.isSpring) {
      return (
        <span className={boxClasses} title="Offered in Spring">
          🌰
        </span>
      );
    } else {
      return (
        <span className={`${boxClasses} text-gray-500 dark:text-gray-400`} title="Verify semester offering on courses.yale.edu">
          ❓
        </span>
      );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full max-w-lg bg-white dark:bg-gray-900/95 backdrop-blur-md rounded-xl border border-gray-200 dark:border-gray-800 shadow-2xl max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800/80">
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">Add courses manually</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Search or enter courses one by one
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/10 transition-colors"
              >
                <FiX size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto overflow-x-visible p-4">
              {entries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/20 flex items-center justify-center mb-3">
                    <FiPlus className="w-5 h-5 text-pink-400" />
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    No courses added yet
                  </p>
                  <button
                    onClick={addNewEntry}
                    className="px-4 py-2 rounded-lg bg-pink-500/10 border border-pink-500/30 text-pink-300 text-sm font-medium hover:bg-pink-500/20 transition-colors"
                  >
                    Add a course
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="relative p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 overflow-visible"
                    >
                      {/* Remove button */}
                      <button
                        onClick={() => removeEntry(entry.id)}
                        className="absolute top-2 right-2 p-1 rounded text-gray-400 dark:text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <FiTrash2 size={14} />
                      </button>

                      {/* Course search/display */}
                      {searchingEntryId === entry.id ? (
                        <div className="pr-6 mb-3">
                          {!showCustomInput ? (
                            <>
                              <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 z-10" size={14} />
                                <input
                                  ref={searchInputRef}
                                  type="text"
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
                                  placeholder="Search course code or name..."
                                />
                                {filteredCourses.length > 0 && (
                                  <div className="absolute left-0 right-0 top-full mt-1 z-20 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-h-36 overflow-y-auto bg-white dark:bg-gray-800 shadow-xl">
                                    {filteredCourses.map((course) => (
                                      <button
                                        key={course.canonicalCode}
                                        onClick={() => selectCourse(entry.id, course)}
                                        className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-b-0"
                                      >
                                        <div className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                                          {course.canonicalCode}
                                          {renderSemesterIcon(course)}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{course.name}</div>
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              {searchTerm && filteredCourses.length === 0 && (
                                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">No results found</p>
                              )}
                              <button
                                onClick={() => setShowCustomInput(true)}
                                className="mt-2 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                              >
                                Can't find it? Enter manually
                              </button>
                            </>
                          ) : (
                            <div className="space-y-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Enter course details manually:</p>
                              <input
                                type="text"
                                value={customCodeInput}
                                onChange={(e) => setCustomCodeInput(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
                                placeholder="Course code (e.g., CPSC 201)"
                                autoFocus
                              />
                              <input
                                type="text"
                                value={customNameInput}
                                onChange={(e) => setCustomNameInput(e.target.value)}
                                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-pink-500/50"
                                placeholder="Course name (optional)"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setShowCustomInput(false);
                                    setCustomCodeInput("");
                                    setCustomNameInput("");
                                  }}
                                  className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                                >
                                  Back to search
                                </button>
                                <button
                                  onClick={() => selectCustomCourse(entry.id)}
                                  disabled={!customCodeInput.trim()}
                                  className="ml-auto px-3 py-1 text-xs rounded bg-pink-500/20 border border-pink-500/30 text-pink-300 hover:bg-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                  Add
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : entry.code ? (
                        <div className="pr-6 mb-3">
                          <button
                            onClick={() => {
                              setSearchingEntryId(entry.id);
                              setSearchTerm("");
                              setShowCustomInput(false);
                            }}
                            className="w-full text-left group"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{entry.code}</span>
                              {entry.isCustom && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">custom</span>
                              )}
                              <FiEdit3 size={12} className="text-gray-400 dark:text-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-400 transition-colors" />
                            </div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">{entry.courseName}</div>
                          </button>
                        </div>
                      ) : (
                        <div className="pr-6 mb-3">
                          <button
                            onClick={() => {
                              setSearchingEntryId(entry.id);
                              setSearchTerm("");
                              setShowCustomInput(false);
                            }}
                            className="w-full py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 text-sm hover:border-pink-500/50 hover:text-pink-400 transition-colors flex items-center justify-center gap-2"
                          >
                            <FiSearch size={14} />
                            Search for a course
                          </button>
                        </div>
                      )}

                      {/* Details grid */}
                      {entry.code && (
                        <div className="grid grid-cols-4 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">Grade</label>
                            <select
                              value={entry.grade}
                              onChange={(e) => updateEntry(entry.id, { grade: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-pink-500/50"
                            >
                              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">Semester</label>
                            <select
                              value={entry.semester}
                              onChange={(e) => updateEntry(entry.id, { semester: e.target.value })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-pink-500/50"
                            >
                              {SEMESTERS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">Year</label>
                            <select
                              value={entry.year}
                              onChange={(e) => updateEntry(entry.id, { year: parseInt(e.target.value) })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-pink-500/50"
                            >
                              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 dark:text-gray-500 mb-1 uppercase tracking-wide">Credits</label>
                            <select
                              value={entry.credits}
                              onChange={(e) => updateEntry(entry.id, { credits: parseFloat(e.target.value) })}
                              className="w-full px-2 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-xs text-gray-900 dark:text-white focus:outline-none focus:border-pink-500/50"
                            >
                              {CREDITS.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Add another */}
                  <button
                    onClick={addNewEntry}
                    className="w-full py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-sm hover:border-gray-400 dark:hover:border-gray-600 hover:text-gray-600 dark:hover:text-gray-400 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <FiPlus size={14} />
                    Add another
                  </button>
                </div>
              )}

              {error && <p className="mt-3 text-red-400 text-xs">{error}</p>}
            </div>

            {/* Footer */}
            {entries.length > 0 && (
              <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-800/80 flex items-center justify-between">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {validCount} course{validCount !== 1 ? "s" : ""} ready
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={onClose}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 text-sm hover:text-gray-900 dark:hover:text-white hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || validCount === 0}
                    className="px-4 py-1.5 rounded-lg bg-pink-500/20 border border-pink-500/40 text-pink-300 text-sm font-medium hover:bg-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Adding...
                      </>
                    ) : (
                      <>
                        <FiCheck size={14} />
                        Add courses
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
