"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiChevronDown,
  FiChevronUp,
  FiInfo,
  FiPlus,
  FiTrash2,
} from "react-icons/fi";
import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { useAuth } from "@/context/AuthContext";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import ManualCourseLookupModal from "./ManualCourseLookupModal";
import { truncate } from "@/lib/utils/utils";
import { Info } from "lucide-react";

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
  const [semA, yearA] = a.split(" ");
  const [semB, yearB] = b.split(" ");
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);

  if (yA !== yB) return yA - yB;
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
  const [hoveredSemester, setHoveredSemester] = useState<string | null>(null);
  const [lookupSemesterId, setLookupSemesterId] = useState<string | null>(null);
  const [selectedPlanToOverwrite, setSelectedPlanToOverwrite] = useState<
    number | null
  >(null);
  const [hasChanges, setHasChanges] = useState(false);
  const initialSemestersRef = useRef<Semester[]>([]);
  const [showPool, setShowPool] = useState(true);

  useEffect(() => {
    // 1. Build semester list
    let semestersArr: Semester[] = [];
    let startYear = graduationYear - 4;
    let startSemester: "Fall" | "Spring" = "Fall";

    if (completedCourses.length > 0) {
      let minYear = Math.min(...completedCourses.map((c) => c.year));
      let minSem = "Fall";
      const coursesInMinYear = completedCourses.filter(
        (c) => c.year === minYear
      );
      if (coursesInMinYear.some((c) => c.semester === "Spring")) {
        minSem = "Spring";
      }
      startYear = minYear;
      startSemester = minSem as "Fall" | "Spring";
    }

    let year = startYear;
    let semester: "Fall" | "Spring" = startSemester;
    while (
      year < graduationYear ||
      (year === graduationYear && semester === "Spring")
    ) {
      semestersArr.push({
        id: `${semester}-${year}`,
        name: `${semester} ${year}`,
        courses: [],
      });
      if (semester === "Fall") {
        semester = "Spring";
        year++;
      } else {
        semester = "Fall";
      }
    }

    // 2. Assign completed/in-progress courses
    completedCourses.forEach((course) => {
      const idx = semestersArr.findIndex(
        (s) => s.name === `${course.semester} ${course.year}`
      );
      if (idx !== -1) {
        (semestersArr[idx].courses as Course[]).push(course);
      }
    });

    setSemesters(semestersArr);
    // Set initial snapshot **after** assigning completed/in-progress courses!
    initialSemestersRef.current = JSON.parse(JSON.stringify(semestersArr));

    setAvailableCourses(
      remainingCourses.filter(
        (rc) =>
          !completedCourses.some((cc) => cc.code === rc.code) &&
          rc.status === "not-taken"
      )
    );
  }, [graduationYear, remainingCourses, completedCourses]);

  // Check for changes
  useEffect(() => {
    if (initialSemestersRef.current.length === 0) return;

    const currentCourses = semesters.flatMap((s) =>
      s.courses.map((c) => c.code)
    );
    const initialCourses = initialSemestersRef.current.flatMap((s) =>
      s.courses.map((c) => c.code)
    );

    const coursesChanged =
      currentCourses.length !== initialCourses.length ||
      !currentCourses.every((code) => initialCourses.includes(code)) ||
      !initialCourses.every((code) => currentCourses.includes(code));

    setHasChanges(coursesChanged);
  }, [semesters]);

  // Assign completed courses to semesters
  // useEffect(() => {
  //   if (!semesters.length || !completedCourses.length) return;

  //   const updatedSemesters = semesters.map((sem) => ({
  //     ...sem,
  //     courses: [],
  //   }));

  //   completedCourses.forEach((course) => {
  //     const idx = updatedSemesters.findIndex(
  //       (s) => s.name === `${course.semester} ${course.year}`
  //     );
  //     if (idx !== -1) {
  //       (updatedSemesters[idx].courses as Course[]).push(course);
  //     }
  //   });

  //   setSemesters(updatedSemesters);
  // }, [completedCourses, semesters.length]);

  function isPastSemester(semesterName: string) {
    const [sem, yearStr] = semesterName.split(" ");
    const year = parseInt(yearStr, 10);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (year < currentYear) return true;
    if (year > currentYear) return false;
    if (sem === "Fall" && currentMonth > 1) return true;
    if (sem === "Spring" && currentMonth > 5) return true;
    return false;
  }

  // DRAG-AND-DROP LOGIC
  const handleDragStart = (course: Course) => setDraggedCourse(course);

  const handleDrop = (semesterId: string) => {
    if (!draggedCourse) return;

    setSemesters((prev) =>
      prev.map((sem) =>
        sem.id === semesterId
          ? sem.courses.some((c) => c.code === draggedCourse.code)
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
              courses: sem.courses.filter(
                (c): c is Course => !!c && c.code !== courseCode
              ),
            }
          : sem
      )
    );
    const rc = remainingCourses.find((c) => c.code === courseCode);
    if (rc && rc.status === "not-taken") {
      setAvailableCourses((prev) =>
        prev.some((c) => c.code === rc.code) ? prev : [...prev, rc]
      );
    }
  };

  // SAVING & LOADING PLANS
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

      let updatedPlans;
      if (selectedPlanToOverwrite !== null) {
        updatedPlans = [...savedPlans];
        updatedPlans[selectedPlanToOverwrite] = newPlan;
      } else {
        updatedPlans = [...savedPlans, newPlan];
      }

      await setDoc(
        doc(db, "users", user.uid),
        { savedPlans: updatedPlans },
        { merge: true }
      );
      setSavedPlans(updatedPlans);
      setPlanName("");
      setSelectedPlanToOverwrite(null);
      setShowSaveModal(false);
    } catch (error) {
      console.error("Error saving plan:", error);
    }
  };

  const loadPlan = (planIndex: number) => {
    if (planIndex < 0 || planIndex >= savedPlans.length) return;
    const plan = savedPlans[planIndex];
    setSemesters(plan.semesters);
    initialSemestersRef.current = JSON.parse(JSON.stringify(plan.semesters));

    const usedCodes = new Set<string>();
    plan.semesters.forEach((sem: Semester) =>
      sem.courses.forEach((course: Course) => usedCodes.add(course.code))
    );
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

  function hasInProgress(semester: Semester) {
    return semester.courses.some((c) => c.status === "in-progress");
  }

  // ----------- RENDER ----------- //
  return (
    <div className="space-y-4 font-louize">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="mb-6">
          <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            Need to visualize? No problem.
          </h2>
          <p>
            Your interactive, tailor-made, drag-and-drop Yale degree simulator
            is here.
          </p>
        </div>
        <div className="flex items-start gap-2 flex-wrap">
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
                className={`px-3 py-1.5 text-xs rounded-lg ${
                  hasChanges
                    ? "bg-purple-900/30 text-purple-300 hover:bg-purple-800/30"
                    : "bg-gray-800/50 text-gray-500 opacity-70 cursor-not-allowed"
                } transition-all`}
                disabled={!hasChanges}
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
                Use this simulator to plan out your remaining semesters and see
                how your courses fit together.
              </li>
              <li>
                We’ve made a pool of the remaining credits in your indicated
                major for quick drag-and-drop access, but you can always look up
                any course from any department and add it manually (especially
                for fun classes/distribs or courses we've not managed to
                automatically include from your major).
              </li>
              <li>Drag/add courses into any semester.</li>
              <li>
                NOTE: You can drop <b>multiple</b> courses per semester, of
                course.
              </li>
              <li>
                <b>Click</b> a course pill already added to a semester to remove
                it.
              </li>
              <li>
                Completed/in-progress courses are <b>pre-assigned</b> to
                semesters and can’t be dragged from the pool.
              </li>
              <li>
                <b>Save</b> or <b>load</b> your plans to try out what-ifs and
                come back to them later!
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Available Courses Pool */}
      <div className="sticky top-0 z-30 mb-2" style={{ top: "0px" }}>
        <div className="bg-pink-900/20 backdrop-blur rounded-xl border border-pink-800/50 shadow-lg shadow-indigo-900/10 overflow-hidden">
          <button
            onClick={() => setShowPool(!showPool)}
            className={`flex items-center justify-between w-full p-4 ${
              showPool ? "border-b border-pink-800/50" : ""
            } bg-pink-900/20 text-gray-300 hover:bg-pink-900/30 transition-colors`}
          >
            <div className="flex items-center gap-2 font-medium">
              <div>Quick-add: Pool of courses from your major</div>
              <div className="relative group">
                <Info className="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" />
                <div className="absolute z-50 bottom-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  May not include all. Add manually if not.
                </div>
              </div>
            </div>
            {showPool ? (
              <FiChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <FiChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>

          <AnimatePresence>
            {showPool && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="p-4 pt-4"
              >
                {availableCourses.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    All available courses have been scheduled. Remove one from a
                    semester to add it back.
                  </p>
                ) : (
                  <div className="max-h-32 overflow-y-auto pr-1 flex flex-wrap gap-2">
                    {availableCourses.map((course) => (
                      <motion.div
                        key={course.code}
                        draggable
                        onDragStart={() => handleDragStart(course)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        className="px-3 py-1.5 rounded-full bg-pink-900/20 text-pink-300 border border-pink-700 text-sm cursor-grab active:cursor-grabbing select-none"
                      >
                        {course.code}
                        <span className="text-xs text-blue-200/70 ml-1">
                          {truncate(
                            getCourseNameFromCode(course.code) ?? "",
                            20
                          )}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Semesters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {semesters.map((semester) => (
          <motion.div
            key={semester.id}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isPastSemester(semester.name)) {
                setHoveredSemester(semester.id);
              }
            }}
            onDragLeave={() => setHoveredSemester(null)}
            onDrop={() => {
              if (isPastSemester(semester.name)) return;
              handleDrop(semester.id);
              setHoveredSemester(null);
            }}
            className={`bg-gray-900/50 rounded-xl border p-4 min-h-[180px] flex flex-col transition-all
            ${
              hasInProgress(semester)
                ? "border-blue-600/70 ring-2 ring-blue-400/40"
                : "border-gray-800"
            }
            ${
              hoveredSemester === semester.id &&
              draggedCourse &&
              !isPastSemester(semester.name)
                ? "ring-2 ring-pink-400 scale-95 bg-gray-800/70"
                : ""
            }
          `}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-medium text-gray-300">{semester.name}</h4>
              {!isPastSemester(semester.name) && (
                <button
                  onClick={() => setLookupSemesterId(semester.id)}
                  className="ml-2 px-2 py-1 text-xs rounded-lg bg-blue-800/30 text-blue-200 hover:bg-blue-700/60 border border-blue-900"
                  type="button"
                >
                  <FiPlus className="inline-block mr-1" />
                  Manual course lookup
                </button>
              )}
            </div>

            {semester.courses.length === 0 ? (
              <div
                className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-4 min-h-[52px] transition-all
              ${
                hoveredSemester === semester.id &&
                draggedCourse &&
                !isPastSemester(semester.name)
                  ? "border-pink-400 bg-purple-900/20"
                  : "border-gray-700"
              }
            `}
              >
                <p className="text-sm text-gray-500 text-center opacity-70">
                  Drag from pool or add others manually
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {semester.courses.map((course) => (
                  <motion.div
                    key={`${semester.id}-${course.code}`}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-full text-sm cursor-pointer select-none transition-all border relative group
        ${
          course.status === "completed"
            ? "bg-emerald-900/20 text-emerald-300 border-emerald-700"
            : course.status === "in-progress"
            ? "bg-blue-900/20 text-blue-300 border-blue-700"
            : "bg-amber-900/20 text-pink-300 border-pink-700 hover:bg-pink-800/30"
        }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        {course.code}
                        <span className="text-xs opacity-70 ml-1">
                          {truncate(
                            getCourseNameFromCode(course.code) ?? "",
                            course.status === "completed" ||
                              course.status === "in-progress"
                              ? 30
                              : 20
                          )}
                        </span>
                      </div>
                      {course.status === "not-taken" && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCourseFromSemester(semester.id, course.code);
                          }}
                          className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-300 hover:text-red-200"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
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
                {selectedPlanToOverwrite !== null
                  ? "Overwrite Plan"
                  : "Save New Plan"}
              </h4>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="Enter a name for this plan"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-200 mb-4"
              />

              {savedPlans.length > 0 && (
                <div className="mb-4">
                  <label className="block text-sm text-gray-400 mb-2">
                    Or overwrite existing plan:
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-700 rounded-lg">
                    {savedPlans.map((plan, index) => (
                      <div
                        key={index}
                        className={`p-3 border-b border-gray-700 cursor-pointer hover:bg-gray-800/50 ${
                          selectedPlanToOverwrite === index
                            ? "bg-blue-900/30"
                            : ""
                        }`}
                        onClick={() => {
                          setSelectedPlanToOverwrite(index);
                          setPlanName(plan.name);
                        }}
                      >
                        <div className="flex justify-between">
                          <span>{plan.name}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(plan.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowSaveModal(false);
                    setSelectedPlanToOverwrite(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={savePlan}
                  disabled={!planName.trim() || !hasChanges}
                  className={`px-4 py-2 rounded-lg ${
                    planName.trim() && hasChanges
                      ? "bg-purple-900/50 text-purple-300 hover:bg-purple-800/50"
                      : "bg-gray-800 text-gray-500 cursor-not-allowed"
                  } transition-colors`}
                >
                  {selectedPlanToOverwrite !== null ? "Overwrite" : "Save"}
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
              className="w-full max-w-md bg-gray-900/90 backdrop-blur-sm p-6 rounded-xl border border-gray-800 relative"
              style={{ maxHeight: "80vh", height: "500px" }}
            >
              <h4 className="text-lg font-medium mb-4 text-gray-200">
                Your Saved Plans
              </h4>
              {savedPlans.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-gray-400 py-4">No saved plans found</p>
                </div>
              ) : (
                <div
                  className="overflow-y-auto"
                  style={{ maxHeight: "calc(80vh - 120px)" }}
                >
                  {savedPlans.map((plan, index) => (
                    <div
                      key={plan.createdAt}
                      className="p-3 bg-gray-800 rounded-lg border border-gray-700 mb-2"
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
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowPlansModal(false)}
                  className="px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <ManualCourseLookupModal
        isOpen={lookupSemesterId !== null}
        onClose={() => setLookupSemesterId(null)}
        onSelect={(manualCourse) => {
          if (!lookupSemesterId || !manualCourse?.code) return;
          setSemesters((prev) =>
            prev.map((sem) =>
              sem.id === lookupSemesterId
                ? {
                    ...sem,
                    courses: [...sem.courses, manualCourse],
                  }
                : sem
            )
          );
          setLookupSemesterId(null);
        }}
        // alreadyAddedCodes={[
        //   ...semesters.flatMap((s) =>
        //     (s.courses ?? [])
        //       .filter((c): c is Course => !!c && typeof c.code === "string")
        //       .map((c) => c?.code)
        //   ),
        //   ...availableCourses
        //     .filter((c): c is Course => !!c && typeof c.code === "string")
        //     .map((c) => c?.code),
        // ]}
        userId={user?.uid || ""}
      />
    </div>
  );
}
