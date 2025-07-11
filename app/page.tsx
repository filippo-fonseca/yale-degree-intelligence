"use client";

import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import FileUpload from "@/components/file-upload";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiUpload,
  FiSettings,
  FiLogOut,
  FiBarChart2,
  FiBook,
  FiChevronRight,
  FiUser,
  FiChevronDown,
} from "react-icons/fi";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import { gradePoints, subjects } from "@/lib/constants";
import { calculateMajorProgress } from "@/lib/majors";
import MajorProgressView from "@/components/MajorProgressView";
import StatsView from "@/components/StatsView";
import MajorSelectionFlow from "@/components/MajorSelectionFlow";
import LogoIcon from "@/icons/LogoIcon";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill } from "react-icons/ri";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { getCourseCreditsFromCode } from "@/lib/courseCatalog";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  updatedAt: Date;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [isHoveringLogout, setIsHoveringLogout] = useState(false);
  const [showMajorSelection, setShowMajorSelection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const navItems = [
    {
      id: "upload",
      icon: HiDocumentDuplicate,
      label: "My courses",
      disabled: false, // Always enabled
    },
    {
      id: "stats",
      icon: FiBarChart2,
      label: "Academic stats",
      disabled: !hasData, // Disabled if no data
    },
    {
      id: "major",
      icon: RiProgress3Fill,
      label: "My major",
      disabled: !hasData, // Disabled if no data
    },
    {
      id: "distributionals",
      icon: RiProgress3Fill,
      label: "Distributionals",
      disabled: !hasData, // Disabled if no data
    },
  ];

  // Fetch user profile on load
  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const profileData = docSnap.data() as UserProfile;
        setUserProfile(profileData);
        setSelectedMajor(profileData.majors[0] || "");
      } else {
        setShowMajorSelection(true);
      }
    };

    fetchUserProfile();
  }, [user]);

  const getMajorProgress = () => {
    if (!user || courses.length === 0 || !selectedMajor) return null;
    const completedCourseCodes = courses
      .filter(
        (course) =>
          course.status === "completed" &&
          ((course.grade !== null && course.grade !== "In Progress") ||
            course.skipped)
      )
      .map((course) => course.code);

    const inProgressCourseCodes = courses
      .filter((course) => course.grade === "In Progress" && !course.skipped)
      .map((course) => course.code);

    const skippedCourseCodes = courses
      .filter((course) => course.skipped)
      .map((course) => course.code);

    return calculateMajorProgress(
      selectedMajor,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes
    );
  };

  useEffect(() => {
    if (user) fetchCourses();
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;

    const q = query(collection(db, "courses"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    const coursesData: Course[] = [];

    querySnapshot.forEach((doc) => {
      coursesData.push({ id: doc.id, ...doc.data() } as Course);
    });

    // Use functional update to ensure we get the latest state
    setCourses((prevCourses) => {
      // Only update if there are actual changes to prevent unnecessary re-renders
      if (JSON.stringify(prevCourses) !== JSON.stringify(coursesData)) {
        return coursesData;
      }
      return prevCourses;
    });

    setHasData(coursesData.length > 0);
  };

  // Update the parseAndStoreCourses function in src/app/page.tsx
  const parseAndStoreCourses = async (extractedText: string) => {
    if (!user) return;

    // Get existing courses to prevent duplicates
    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid)
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);
    const existingCourseKeys = new Set(
      existingSnapshot.docs.map(
        (doc) => `${doc.data().semester}-${doc.data().year}-${doc.data().code}`
      )
    );

    const semesterBlocks = extractedText
      .split("Semester: ")
      .filter((block) => block.trim() !== "");
    const coursesToAdd: Omit<Course, "id">[] = [];

    // Track seen courses in this parse to prevent duplicates
    const seenInThisParse = new Set<string>();

    for (const block of semesterBlocks) {
      const [semesterInfo, ...courseLines] = block.split("\n");
      const [season, year] = semesterInfo.split(" ");

      for (const line of courseLines) {
        if (line.trim() === "") continue;

        // Match completed courses (with grades and credits)
        const completedMatch = line.match(
          /^- (.+?): (.+?) — (.+?) \((\d+\.\d+)\)$/
        );
        if (completedMatch) {
          const [, code, name, grade, credits] = completedMatch;
          const courseKey = `${season.trim()}-${year.trim()}-${code.trim()}`;

          // Skip if already exists or seen in this parse
          if (
            existingCourseKeys.has(courseKey) ||
            seenInThisParse.has(courseKey)
          )
            continue;
          seenInThisParse.add(courseKey);

          coursesToAdd.push({
            code: code.trim(),
            grade: grade.trim(),
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "completed",
            credits: parseFloat(credits),
          });
          continue;
        }

        // Match in-progress courses (without grades but with credits)
        const inProgressMatch = line.match(
          /^- (.+?): (.+?) — (?:In Progress|IP) \((\d+\.\d+)\)$/
        );
        if (inProgressMatch) {
          const [, code, name, credits] = inProgressMatch;
          const courseKey = `${season.trim()}-${year.trim()}-${code.trim()}`;

          // Skip if already exists or seen in this parse
          if (
            existingCourseKeys.has(courseKey) ||
            seenInThisParse.has(courseKey)
          )
            continue;
          seenInThisParse.add(courseKey);

          coursesToAdd.push({
            code: code.trim(),
            grade: null,
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "in-progress",
            credits: parseFloat(credits),
          });
        }
      }
    }

    // Only proceed if there are new courses to add
    if (coursesToAdd.length > 0) {
      const batchWrites = coursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });

      await Promise.all(batchWrites);
    }

    await fetchCourses();
  };

  const calculateStats = () => {
    if (courses.length === 0) return null;
    let totalCredits = 0;
    let totalGradePoints = 0;
    let completedCoursesWithGrades = 0;
    let inProgressCourses = 0;
    const distribution: Record<string, number> = {};

    courses.forEach((course) => {
      if (course.status === "in-progress") {
        inProgressCourses++;
        return;
      }
      if (course.skipped) return;

      if (course.grade && gradePoints[course.grade]) {
        completedCoursesWithGrades++;
        totalCredits += course.credits || 0;
        totalGradePoints += gradePoints[course.grade] * (course.credits || 1.0);
        distribution[course.grade] = (distribution[course.grade] || 0) + 1;
      }
    });

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;
    return {
      gpa: gpa.toFixed(2),
      totalCredits,
      completedCourses: completedCoursesWithGrades,
      inProgressCourses,
      distribution,
    };
  };

  const stats = calculateStats();

  const getGPAColor = (gpa: string) => {
    if (gpa == "A" || gpa == "A-") return "text-emerald-400";
    if (gpa == "B+" || gpa == "B" || gpa == "B-") return "text-amber-400";
    if (gpa == "In Progress") return "text-blue-400";
    return "text-red-400";
  };

  const getYearStatus = (graduationYear: number): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 8 = Sep

    // Academic year starts in September
    const academicYear = currentMonth >= 8 ? currentYear + 1 : currentYear;

    const yearsRemaining = graduationYear - academicYear;

    if (yearsRemaining > 4) return "High School";
    if (yearsRemaining === 4) return "Freshman";
    if (yearsRemaining === 3) return "Sophomore";
    if (yearsRemaining === 2) return "Junior";
    if (yearsRemaining === 1) return "Senior";
    if (yearsRemaining <= 0) return "Graduated";

    return "Unknown";
  };

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!user) return;

    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          ...userProfile,
          ...updatedProfile,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
        if (updatedProfile.majors) {
          setSelectedMajor(updatedProfile.majors[0] || "");
        }
      }
      setShowSettings(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-blue-500 border-r-blue-500/50"
        />
      </div>
    );
  if (!user) return <LoginPage />;

  return (
    <main className={`min-h-screen bg-gray-950 text-gray-100 font-louize`}>
      {/* Major Selection Flow */}
      {showMajorSelection && (
        <MajorSelectionFlow onComplete={() => setShowMajorSelection(false)} />
      )}

      {/* Settings Modal */}
      {showSettings && userProfile && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-6"
          >
            <div className="flex flex-col items-center mb-6">
              <div className="relative mb-4">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt="Profile"
                    className="w-16 h-16 rounded-full object-cover border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium border-2 border-gray-700">
                    {user.displayName?.charAt(0) ||
                      user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-medium text-center text-gray-200">
                {user.displayName || "User"}
              </h2>
              <p className="text-gray-400 text-sm mt-1">{user.email}</p>

              {/* Graduation Year Badge */}
              {userProfile.graduationYear && (
                <div className="mt-3 flex items-center">
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                    <span
                      className={`w-2 h-2 rounded-full mr-1.5 ${
                        getYearStatus(userProfile.graduationYear) === "Freshman"
                          ? "bg-green-400"
                          : getYearStatus(userProfile.graduationYear) ===
                            "Sophomore"
                          ? "bg-blue-400"
                          : getYearStatus(userProfile.graduationYear) ===
                            "Junior"
                          ? "bg-yellow-400"
                          : "bg-purple-400"
                      }`}
                    ></span>
                    <span className="text-gray-300">
                      {getYearStatus(userProfile.graduationYear)} • Class of{" "}
                      {userProfile.graduationYear}
                    </span>
                  </span>
                </div>
              )}
              <motion.button
                onHoverStart={() => setIsHoveringLogout(true)}
                onHoverEnd={() => setIsHoveringLogout(false)}
                onClick={logout}
                className="flex items-center justify-center space-x-2 text-xs px-4 py-2 rounded-lg hover:bg-gray-900/50 transition-all border border-gray-800 hover:border-gray-700 mt-4"
              >
                <span>Sign out</span>
                <motion.div
                  animate={isHoveringLogout ? { x: 2 } : { x: 0 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <FiLogOut size={14} />
                </motion.div>
              </motion.button>
            </div>

            {/* Rest of the settings modal content remains the same */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Majors
                </label>
                <div className="space-y-2">
                  {userProfile.majors.map((major, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="relative flex-1">
                        <select
                          value={major}
                          onChange={(e) => {
                            const newMajors = [...userProfile.majors];
                            newMajors[index] = e.target.value;
                            setUserProfile({
                              ...userProfile,
                              majors: newMajors,
                            });
                          }}
                          className="w-full appearance-none bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {Object.entries(subjects).map(([code, name]) => (
                            <option key={code} value={code}>
                              {code} - {name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <svg
                            className="h-5 w-5 text-gray-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      </div>
                      {index > 0 && (
                        <button
                          onClick={() => {
                            const newMajors = [...userProfile.majors];
                            newMajors.splice(index, 1);
                            setUserProfile({
                              ...userProfile,
                              majors: newMajors,
                            });
                          }}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                  {userProfile.majors.length < 2 && (
                    <button
                      onClick={() => {
                        setUserProfile({
                          ...userProfile,
                          majors: [...userProfile.majors, "MENG"],
                        });
                      }}
                      className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                      Add another major
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Graduation Year
                </label>
                <input
                  type="number"
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 4}
                  value={userProfile.graduationYear}
                  onChange={(e) =>
                    setUserProfile({
                      ...userProfile,
                      graduationYear: parseInt(e.target.value),
                    })
                  }
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleProfileUpdate({
                    majors: userProfile.majors,
                    graduationYear: userProfile.graduationYear,
                  })
                }
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950/20 to-purple-950/20"></div>
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-white/5 backdrop-blur-sm"
            initial={{
              x: Math.random() * 100,
              y: Math.random() * 100,
              scale: Math.random() * 0.5 + 0.5,
            }}
            animate={{
              x: [null, Math.random() * 100],
              y: [null, Math.random() * 100],
            }}
            transition={{
              duration: Math.random() * 20 + 20,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut",
            }}
            style={{
              width: `${Math.random() * 8 + 4}px`,
              height: `${Math.random() * 8 + 4}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center py-8"
        >
          <CompoundLogo />

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-900/50 transition-all border border-gray-800 hover:border-gray-700 flex items-center gap-1"
              title="Settings"
            >
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-6 h-6 rounded-full object-cover border-2 border-gray-700"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium border-2 border-gray-700">
                  {user.displayName?.charAt(0) ||
                    user.email?.charAt(0).toUpperCase()}
                </div>
              )}
              <FiChevronDown className="text-gray-400 text-sm" />
            </button>
          </div>
        </motion.header>

        <div className="flex flex-col lg:flex-row gap-8 pb-16">
          {/* Sidebar Navigation */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="w-full lg:w-56"
          >
            <nav className="space-y-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={!item.disabled ? { x: 4 } : {}}
                  onClick={() => !item.disabled && setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-xl transition-all ${
                    activeTab === item.id
                      ? "bg-gray-900/50 border border-gray-800 text-white"
                      : item.disabled
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-gray-900/30"
                  }`}
                  disabled={item.disabled}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </div>
                  {activeTab === item.id && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-blue-400"
                    >
                      <FiChevronRight />
                    </motion.div>
                  )}
                </motion.button>
              ))}
            </nav>
          </motion.aside>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex-1"
          >
            <AnimatePresence mode="wait">
              {activeTab === "upload" && (
                <motion.div
                  key="upload"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {hasData ? (
                    <div>
                      <div className="mb-6">
                        <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                          Your academic journey at Yale,{" "}
                          {user?.displayName?.split(" ")[0]}.
                        </h2>
                        <p>
                          These are all the classes you've taken, including
                          their grades and in-progress ones. You can always
                          upload a more recent transcript to update this data.
                        </p>
                      </div>
                      <div className="space-y-8">
                        {Array.from(
                          new Set(courses.map((c) => `${c.semester} ${c.year}`))
                        ).map((semester) => (
                          <motion.div
                            key={semester}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-8"
                          >
                            <h3 className="text-lg font-medium mb-4 text-gray-300">
                              {semester}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {courses
                                .filter(
                                  (c) => `${c.semester} ${c.year}` === semester
                                )
                                .map((course) => (
                                  <motion.div
                                    key={course.id}
                                    whileHover={{ y: -2 }}
                                    className={`p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all ${
                                      course.status === "in-progress"
                                        ? "border-l-2 border-blue-400/80"
                                        : course.skipped
                                        ? "border-l-2 border-gray-600"
                                        : ""
                                    }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-medium">
                                          {course.code}
                                          {course.skipped && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              (skipped)
                                            </span>
                                          )}
                                        </h4>
                                        <p className="text-sm text-gray-400">
                                          {getCourseCreditsFromCode(
                                            course.code
                                          )}
                                        </p>
                                        <div className="flex items-center mt-1 space-x-2">
                                          {course.status === "in-progress" && (
                                            <span className="inline-block px-2 py-0.5 bg-blue-900/20 text-blue-400 rounded-full text-xs">
                                              In Progress
                                            </span>
                                          )}
                                          <span className="text-xs text-gray-500">
                                            {course.credits} credit
                                            {course.credits !== 1 ? "s" : ""}
                                          </span>
                                        </div>
                                      </div>
                                      {course.grade && !course.skipped && (
                                        <span
                                          className={`text-lg font-medium ${getGPAColor(
                                            course.grade
                                          )}`}
                                        >
                                          {course.grade}
                                        </span>
                                      )}
                                    </div>
                                  </motion.div>
                                ))}
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <h2 className="text-xl font-medium mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                        Begin Your Academic Analysis
                      </h2>
                      <div className="w-full max-w-lg bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-800">
                        <FileUpload onSuccess={parseAndStoreCourses} />
                        <p className="text-center text-gray-500 text-sm mt-4">
                          Upload your Yale transcript to unlock insights
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === "stats" && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6">
                    <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                      Numbers aren't everything, but they're important.
                    </h2>
                    <p>
                      Here's a comprehesive visual overview of your academic
                      trajectory over your time at Yale.
                    </p>
                  </div>
                  <StatsView courses={courses} />
                </motion.div>
              )}

              {activeTab === "major" && getMajorProgress() && (
                <motion.div
                  key="major"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {user && userProfile && (
                    <div className="mb-6">
                      <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                        This is how you're doing for your{" "}
                        {userProfile?.majors?.length > 1 ? "majors" : "major"},{" "}
                        {user?.displayName?.split(" ")[0]}.
                      </h2>
                      <p>
                        This is based on data from your transcript and the
                        major(s) you indicated to us.
                      </p>
                    </div>
                  )}
                  {/* Major Selector */}
                  {userProfile &&
                    activeTab === "major" &&
                    userProfile?.majors?.length > 1 && (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Viewing Progress For:
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {userProfile.majors.map((major) => (
                            <button
                              key={major}
                              onClick={() => setSelectedMajor(major)}
                              className={`px-4 py-2 rounded-lg border transition-colors ${
                                selectedMajor === major
                                  ? "border-blue-500 bg-blue-900/20 text-blue-100"
                                  : "border-gray-800 hover:border-gray-700 hover:bg-gray-800/50"
                              }`}
                            >
                              {major} - {subjects[major] || major}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  <MajorProgressView
                    selectedMajor={selectedMajor}
                    progress={getMajorProgress()!}
                    onRequirementChange={fetchCourses}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="py-8 text-center text-sm text-gray-500 border-t border-gray-900"
        >
          <p>
            Yale DegreeIntelligence can be wrong. Not affiliated with Yale
            University. We do not take responsibility for any wrong
            advice/deductions. We make no money from this.
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
