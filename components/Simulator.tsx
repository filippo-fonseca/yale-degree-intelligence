"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiInfo } from "react-icons/fi";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";

interface Semester {
  id: string;
  name: string;
  courses: Course[];
}

interface SimulatorProps {
  remainingCourses: Course[];
  completedCourses: Course[];
  graduationYear: number;
}

function compareSemesters(a: string, b: string) {
  // a, b are like "Spring 2025" or "Fall 2025"
  const [semA, yearA] = a.split(" ");
  const [semB, yearB] = b.split(" ");
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);

  if (yA !== yB) return yA - yB;
  // Order: Spring (0) before Fall (1)
  const order = { Spring: 0, Fall: 1 };
  return order[semA as keyof typeof order] - order[semB as keyof typeof order];
}

export default function Simulator({
  remainingCourses,
  completedCourses,
  graduationYear,
}: SimulatorProps) {
  const { user } = useAuth();
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [draggedCourse, setDraggedCourse] = useState<Course | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [savedPlans, setSavedPlans] = useState<any[]>([]);
  const [planName, setPlanName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);

  // ----------- INITIALIZE SEMESTERS ----------- //
  useEffect(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0=Jan

    // Determine current (possibly unmodifiable) semester
    let semesterType: "Spring" | "Fall";
    if (currentMonth >= 8 || currentMonth < 2) {
      semesterType = "Fall";
    } else {
      semesterType = "Spring";
    }

    // Determine if we should skip current semester
    let year = currentYear;
    let semester = semesterType;

    const shouldSkipCurrentSemester =
      (semester === "Fall" && currentMonth >= 9) ||
      (semester === "Spring" && currentMonth >= 2);

    if (shouldSkipCurrentSemester) {
      if (semester === "Fall") {
        year += 1;
        semester = "Spring";
      } else {
        semester = "Fall";
      }
    }

    // Generate all future semesters through graduation year
    const semestersArr: Semester[] = [];
    let done = false;
    while (!done) {
      semestersArr.push({
        id: `${semester}-${year}`,
        name: `${semester} ${year}`,
        courses: [],
      });

      // Move to next semester
      if (semester === "Spring") {
        semester = "Fall";
      } else {
        semester = "Spring";
        year += 1;
      }
      if (year > graduationYear) done = true;
    }

    // Ensure correct order: Spring before Fall for a given year
    semestersArr.sort((a, b) => compareSemesters(a.name, b.name));
    setSemesters(semestersArr);

    // "Available" = those not already completed or in-progress
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken"
      )
    );
  }, [graduationYear, remainingCourses, completedCourses]);

  // ----------- ASSIGN COMPLETED COURSES TO SEMESTERS ----------- //
  useEffect(() => {
    if (!semesters.length || !completedCourses.length) return;

    // Copy semesters, assign completed/in-progress courses
    const updatedSemesters = semesters.map((sem) => ({
      ...sem,
      courses: [],
    }));

    completedCourses.forEach((course) => {
      const idx = updatedSemesters.findIndex(
        (s) => s.name === `${course.semester} ${course.year}`
      );
      if (idx !== -1) {
        (updatedSemesters[idx].courses as Course[]).push(course);
      }
    });

    setSemesters(updatedSemesters);
  }, [completedCourses, semesters.length]); // Only runs when semester count or completedCourses changes

  // ----------- DRAG-AND-DROP LOGIC ----------- //
  const handleDragStart = (course: Course) => setDraggedCourse(course);

  const handleDrop = (semesterId: string) => {
    if (!draggedCourse) return;

    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? // Only add if not already present
            sem.courses.some((c) => c.code === draggedCourse.code)
            ? sem
            : { ...sem, courses: [...sem.courses, draggedCourse] }
          : sem
      )
    );
    setAvailableCourses((prev) =>
      prev.filter((c) => c.code !== draggedCourse.code)
    );
    setDraggedCourse(null);
  };

  const removeCourseFromSemester = (semesterId: string, courseCode: string) => {
    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? {
              ...sem,
              courses: sem.courses.filter((c) => c.code !== courseCode),
            }
          : sem
      )
    );
    // Only add back to pool if it is a "not-taken" (not a completed/in-progress class)
    const rc = remainingCourses.find((c) => c.code === courseCode);
    if (rc && rc.status === "not-taken") {
      setAvailableCourses((prev) =>
        prev.some((c) => c.code === rc.code) ? prev : [...prev, rc]
      );
    }
  };

  // ----------- SAVING & LOADING PLANS ----------- //
  useEffect(() => {
    if (!user) return;
    const loadSavedPlans = async () => {
      try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().savedPlans) {
          setSavedPlans(docSnap.data().savedPlans);
        }
      } catch (e) {
        console.error("Error loading saved plans:", e);
      }
    };
    loadSavedPlans();
  }, [user]);

  const savePlan = async () => {
    if (!user || !planName.trim()) return;
    try {
      const newPlan = {
        name: planName,
        semesters,
        createdAt: new Date().toISOString(),
      };
      const updatedPlans = [...savedPlans, newPlan];
      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true }
      );
      setSavedPlans(updatedPlans);
      setPlanName("");
      setShowSaveModal(false);
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  const loadPlan = (planIndex: number) => {
    if (planIndex < 0 || planIndex >= savedPlans.length) return;
    const plan = savedPlans[planIndex];
    setSemesters(plan.semesters);

    // Used codes
    const usedCodes = new Set<string>();
    plan.semesters.forEach((sem: Semester) =>
      sem.courses.forEach((course: Course) => usedCodes.add(course.code))
    );
    // Available = not in use, not already completed
    setAvailableCourses(
      remainingCourses.filter(
        (c) =>
          !usedCodes.has(c.code) &&
          !completedCourses.some((cc) => cc.code === c.code)
      )
    );
    setShowPlansModal(false);
  };

  const deletePlan = async (planIndex: number) => {
    if (!user || planIndex < 0 || planIndex >= savedPlans.length) return;
    try {
      const updatedPlans = [...savedPlans];
      updatedPlans.splice(planIndex, 1);
      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true }
      );
      setSavedPlans(updatedPlans);
    } catch (e) {
      console.error("Error deleting plan:", e);
    }
  };

  const resetSimulator = () => {
    // Only wipe "not-taken" courses, keep completed/in-progress in place
    setSemesters((prev) =>
      prev.map((sem) => ({
        ...sem,
        courses: sem.courses.filter(
          (c) => c.status === "completed" || c.status === "in-progress"
        ),
      }))
    );
    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken"
      )
    );
  };

  // ----------- RENDER ----------- //
  return (
    <div className="space-y-6 font-louize">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            Degree Plan Simulator
          </h3>
          <p className="text-sm text-gray-400">
            Drag and drop your remaining courses into future semesters below.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowHelp((v) => !v)}
            className="px-3 py-1.5 text-xs rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 flex items-center gap-1 transition-all"
          >
            <FiInfo size={14} />
            Help
          </button>
          {user && (
            <>
              <button
                onClick={() => setShowPlansModal(true)}
                className="px-3 py-1.5 text-xs rounded-lg bg-blue-900/30 text-blue-300 hover:bg-blue-800/30"
              >
                Load Plan
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-3 py-1.5 text-xs rounded-lg bg-purple-900/30 text-purple-300 hover:bg-purple-800/30"
              >
                Save Plan
              </button>
            </>
          )}
          <button
            onClick={resetSimulator}
            className="px-3 py-1.5 text-xs rounded-lg bg-red-900/30 text-red-300 hover:bg-red-800/30"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Help Panel */}
      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-gray-900/50 rounded-xl border border-gray-800 p-4"
          >
            <h4 className="font-medium text-gray-300 mb-2">
              How to use the simulator
            </h4>
            <ul className="text-sm text-gray-400 space-y-2 list-disc list-inside">
              <li>
                Drag courses from the <b>Available Courses</b> into any
                semester.
              </li>
              <li>
                You can drop <b>multiple</b> courses per semester.
              </li>
              <li>
                <b>Click</b> a course pill in a semester to remove it.
              </li>
              <li>
                Completed/in-progress courses are <b>pre-assigned</b> to
                semesters and can’t be dragged from the pool.
              </li>
              <li>
                <b>Save</b> or <b>load</b> your plans to try out what-ifs!
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Courses Pool */}
      <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
        <h4 className="font-medium text-gray-300 mb-3">Available Courses</h4>
        {availableCourses.length === 0 ? (
          <p className="text-sm text-gray-500 italic">
            All available courses have been scheduled. Remove one from a
            semester to add it back.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {availableCourses.map((course) => (
              <motion.div
                key={course.code}
                draggable
                onDragStart={() => handleDragStart(course)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-3 py-1.5 rounded-full bg-blue-900/20 text-blue-300 border border-blue-700 text-sm cursor-grab active:cursor-grabbing select-none"
              >
                {course.code}
                <span className="text-xs text-blue-200/70 ml-1">
                  {getCourseNameFromCode(course.code)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {semesters.map((semester) => (
          <motion.div
            key={semester.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(semester.id)}
            whileHover={{ scale: 1.01 }}
            className="bg-gray-900/50 rounded-xl border border-gray-800 p-4 min-h-[180px] flex flex-col"
            style={{ transition: "background 0.2s" }}
          >
            <h4 className="font-medium text-gray-300 mb-3">{semester.name}</h4>
            {semester.courses.length === 0 ? (
              <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-4 min-h-[52px] transition-all">
                <p className="text-sm text-gray-500 text-center opacity-70">
                  Drag courses here
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {semester.courses.map((course) => (
                  <motion.div
                    key={`${semester.id}-${course.code}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() =>
                      course.status === "not-taken"
                        ? removeCourseFromSemester(semester.id, course.code)
                        : undefined
                    }
                    className={`px-3 py-1.5 rounded-full text-sm cursor-pointer select-none transition-all border
                      ${
                        course.status === "completed"
                          ? "bg-emerald-900/20 text-emerald-300 border-emerald-700"
                          : course.status === "in-progress"
                          ? "bg-blue-900/20 text-blue-300 border-blue-700"
                          : "bg-amber-900/20 text-amber-300 border-amber-700 hover:bg-red-900/20 hover:text-red-200"
                      }`}
                  >
                    {course.code}
                    <span className="text-xs opacity-70 ml-1">
                      {getCourseNameFromCode(course.code)}
                    </span>
                    {course.status === "not-taken" && (
                      <span className="ml-2 text-xs text-gray-500">
                        (remove)
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Save Plan Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800 relative"
            >
              <h4 className="text-lg font-medium mb-4 text-gray-200">
                Save Current Plan
              </h4>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Enter a name for this plan"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowSaveModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePlan}
                  disabled={!planName.trim()}
                  className={`px-4 py-2 rounded-lg ${
                    planName.trim()
                      ? "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed"
                  } transition-colors`}
                >
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Load Plans Modal */}
      <AnimatePresence>
        {showPlansModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPlansModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800 relative max-h-[80vh] overflow-y-auto"
            >
              <h4 className="text-lg font-medium mb-4 text-gray-200">
                Your Saved Plans
              </h4>
              {savedPlans.length === 0 ? (
                <p className="text-gray-400 text-center py-4">
                  No saved plans found
                </p>
              ) : (
                <div className="space-y-3">
                  {savedPlans.map((plan, index) => (
                    <div
                      key={plan.createdAt}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700"
                    >
                      <div className="flex justify-between items-center">
                        <h5 className="font-medium text-gray-300">
                          {plan.name}
                        </h5>
                        <div className="text-xs text-gray-500">
                          {new Date(plan.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2 mt-2">
                        <button
                          onClick={() => loadPlan(index)}
                          className="px-3 py-1 text-xs rounded bg-blue-900/30 text-blue-300 hover:bg-blue-800/30 transition-colors"
                        >
                          Load
                        </button>
                        <button
                          onClick={() => deletePlan(index)}
                          className="px-3 py-1 text-xs rounded bg-red-900/30 text-red-300 hover:bg-red-800/30 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
