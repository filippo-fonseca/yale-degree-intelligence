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
  FiCoffee,
  FiRefreshCw,
} from "react-icons/fi";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  getDoc,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import { gradePoints } from "@/lib/constants";
import {
  calculateMajorProgress,
  majorRequirements,
  MAJORS,
} from "@/lib/majors";
import MajorProgressView from "@/components/MajorProgressView";
import StatsView from "@/components/StatsView";
import MajorSelectionFlow from "@/components/MajorSelectionFlow";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill } from "react-icons/ri";
import CompoundLogo from "@/components/ui/CompoundLogo";
import {
  getCourseCreditsFromCode,
  getCourseNameFromCode,
} from "@/lib/courseCatalog";
import DistributionalsView from "@/components/DistributionalProgress";
import { FaBuildingCircleCheck, FaHeart } from "react-icons/fa6";
import CustomLoader from "@/components/ui/CustomLoader";
import UserSettingsModal from "@/components/UserSettingsModal/UserSettingsModal";
import Link from "next/link";
import LogoIcon from "@/icons/LogoIcon";
import CourseModal from "@/components/MajorProgressView/CourseModal";
import { getGPAColor } from "@/lib/utils/utils";
import PublicFacingPage from "@/screens/PublicFacingPage";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  updatedAt: Date;
}

const useLocalStorage = <T,>(
  key: string,
  initialValue: T
): [T, (value: T) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T) => {
    try {
      setStoredValue(value);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(value));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [isHoveringLogout, setIsHoveringLogout] = useState(false);
  const [showMajorSelection, setShowMajorSelection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showBetaBanner, setShowBetaBanner] = useLocalStorage(
    "showBetaBanner",
    true
  );
  const [latestAdvice, setLatestAdvice] = useState<string | null>(null);

  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCoursesLoading(false);
      setCourses([]);
      setHasData(false);
    }
  }, [user]);

  //for the "My courses" section:
  const [modalOpen, setModalOpen] = useState<{
    isOpen: boolean;
    course: {
      code: string;
      name: string;
      status: "completed" | "in-progress" | "not-taken" | "skipped";
      skipped: boolean;
    } | null;
  }>({ isOpen: false, course: null });

  //tabs:
  const [activeTab, setActiveTab] = useLocalStorage(
    "dashboardActiveTab",
    "upload"
  );

  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const navItems = [
    {
      id: "upload",
      icon: HiDocumentDuplicate,
      label: "My courses",
      disabled: false,
    },
    {
      id: "stats",
      icon: FiBarChart2,
      label: "Academic stats",
      disabled: !hasData,
    },
    {
      id: "major",
      icon: RiProgress3Fill,
      label: "My major",
      disabled: !hasData,
    },
    {
      id: "cleoai",
      icon: LogoIcon, // Using the coffee icon as a placeholder - you might want a different icon
      label: "CleoAI",
      disabled: !hasData,
    },
    {
      id: "distributionals",
      icon: FaBuildingCircleCheck,
      label: "Distributionals",
      disabled: true, // Always disabled
      tooltip: "Coming Soon", // Add tooltip text
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

    // Extract manual requirements
    const manualRequirements = courses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => m.major_id === selectedMajor)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
        }))
    );

    return calculateMajorProgress(
      selectedMajor,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes,
      manualRequirements
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

    setCoursesLoading(false);
  };

  const parseAndStoreCourses = async (extractedText: string) => {
    if (!user) return;

    // Get existing courses to prevent duplicates
    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid)
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);

    // Create a comprehensive key for duplicate detection (semester-year-code-grade)
    const existingCourseKeys = new Set(
      existingSnapshot.docs.map(
        (doc) =>
          `${doc.data().semester}-${doc.data().year}-${doc.data().code}-${
            doc.data().grade || "null"
          }`
      )
    );

    const semesterBlocks = extractedText
      .split("Semester: ")
      .filter((block) => block.trim() !== "");
    const coursesToAdd: Omit<Course, "id">[] = [];

    // Track seen courses in this parse to prevent duplicates within the same upload
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
          const courseKey = `${season.trim()}-${year.trim()}-${code.trim()}-${grade.trim()}`;

          // Skip if already exists in DB or seen in this parse
          if (existingCourseKeys.has(courseKey)) {
            console.log(
              `Skipping duplicate course (existing in DB): ${courseKey}`
            );
            continue;
          }
          if (seenInThisParse.has(courseKey)) {
            console.log(
              `Skipping duplicate course (current parse): ${courseKey}`
            );
            continue;
          }
          seenInThisParse.add(courseKey);

          coursesToAdd.push({
            code: code.trim(),
            grade: grade.trim(),
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status:
              grade.trim() === "In Progress" ? "in-progress" : "completed",
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
          const courseKey = `${season.trim()}-${year.trim()}-${code.trim()}-null`;

          // Skip if already exists in DB or seen in this parse
          if (existingCourseKeys.has(courseKey)) {
            console.log(
              `Skipping duplicate in-progress course (existing in DB): ${courseKey}`
            );
            continue;
          }
          if (seenInThisParse.has(courseKey)) {
            console.log(
              `Skipping duplicate in-progress course (current parse): ${courseKey}`
            );
            continue;
          }
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
      console.log(`Adding ${coursesToAdd.length} new courses`);
      const batchWrites = coursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });

      await Promise.all(batchWrites);
    } else {
      console.log("No new courses to add");
    }

    console.log("Courses to add:", coursesToAdd);

    // AI UPLOAD:
    const now = new Date();
    let currentSemester: string;
    const month = now.getMonth() + 1;
    if (month >= 1 && month <= 5) {
      currentSemester = "Spring";
    } else if (month >= 9 && month <= 8) {
      currentSemester = "Summer";
    } else {
      currentSemester = "Fall";
    }
    const currentYear = now.getFullYear();

    try {
      console.log("Fetching AI advice...");
      const res = await fetch("/api/generate-advice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coursesToAdd,
          requirementsJson: majorRequirements,
          selectedMajor: userProfile?.majors[0],
          userId: user.uid,
          currentDate: now.toISOString().slice(0, 10),
          graduationYear: userProfile?.graduationYear,
          currentSemester,
          currentYear,
        }),
      });
      const data = await res.json();
      if (res.ok && data.advice) {
        // Store in Firestore
        await addDoc(collection(db, "ai_responses"), {
          advice: data.advice,
          userId: user.uid,
          dateGenerated: Timestamp.fromDate(now),
          params: {
            selectedMajor: userProfile?.majors,
            graduationYear: userProfile?.graduationYear,
            currentDate: now.toISOString().slice(0, 10),
            currentSemester,
            currentYear,
          },
        });
        setLatestAdvice(data.advice); // Optionally show in UI
      } else {
        setLatestAdvice(null);
      }
    } catch (err) {
      console.error("AI advice fetch error", err);
      setLatestAdvice(null);
    }

    // Close the modal if it was open (i.e. if it's an update)
    showUpdateModal && setShowUpdateModal(false);

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

  // useEffect(() => {
  //   // Play sound on tab change
  //   if (typeof window === "undefined") return;

  //   // Only play if we have data (for tabs that require it) or if it's the upload tab
  //   void new Audio("/audio/pop.mp3").play().catch(() => null);
  // }, [activeTab, hasData]);

  if (loading || (user && coursesLoading)) return <CustomLoader />;

  if (!user) return <PublicFacingPage />;

  return (
    <main
      className={`min-h-screen bg-gray-950 text-gray-100 font-louize overflow-hidden`}
    >
      {/* {showBetaBanner && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full bg-red-900 border-b border-gray-800"
        >
          <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-center">
            <div className="flex items-center space-x-3">
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 rounded text-xs font-medium border border-blue-500/20">
                BETA
              </span>
              <p className="text-sm text-gray-300">
                Initial version - features may change.{" "}
                <a
                  href="/methodology"
                  className="text-blue-400 hover:text-blue-300 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View methodology
                </a>
              </p>
            </div>
            <button
              onClick={() => setShowBetaBanner(false)}
              className="p-1 rounded-md hover:bg-gray-800 transition-colors text-gray-400 hover:text-gray-200"
              aria-label="Dismiss banner"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </motion.div>
      )} */}
      {/* Major Selection Flow */}
      {showMajorSelection && (
        <MajorSelectionFlow onComplete={() => setShowMajorSelection(false)} />
      )}

      {showSettings && userProfile && (
        <UserSettingsModal
          user={user}
          userProfile={userProfile}
          onClose={() => setShowSettings(false)}
          onSave={handleProfileUpdate}
          onLogout={() => {
            setShowSettings(false);
            setActiveTab("upload");
            logout();
          }}
        />
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
          <div
            onClick={() => setActiveTab("upload")}
            className="cursor-pointer transition-all hover:scale-105"
          >
            <CompoundLogo />
          </div>

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
            className="w-full lg:w-56 flex flex-col justify-between"
          >
            {/* Navigation Items */}
            <nav className="space-y-1 flex-1">
              {navItems.map((item) => (
                <motion.button
                  key={item.id}
                  whileHover={!item.disabled ? { x: 4 } : {}}
                  onClick={() => {
                    if (!item.disabled) {
                      setActiveTab(item.id);
                      void new Audio("/audio/pop.mp3").play().catch(() => null);
                    }
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-xl transition-all relative ${
                    activeTab === item.id
                      ? "bg-gray-900/50 border border-gray-800 text-white"
                      : item.disabled
                      ? "text-gray-600 cursor-not-allowed"
                      : "text-gray-400 hover:text-white hover:bg-gray-900/30"
                  }`}
                  disabled={item.disabled}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon size={activeTab === "cleoai" ? 18 : 12} />
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
                  {item.disabled && item.tooltip && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-gray-200 text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      {item.tooltip}
                    </div>
                  )}
                </motion.button>
              ))}
            </nav>

            {/* Fixed Bottom Section */}
            <div className="sticky bottom-0 left-0 right-0 pt-4 bg-gradient-to-t from-gray-950/90 via-gray-950/90 to-transparent">
              <div className="space-y-3">
                {/* Neumorphic Action Card */}
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="p-3 rounded-xl bg-gray-900 border border-gray-800 shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex flex-col space-y-2.5">
                    <Link
                      href="/about"
                      target="_blank"
                      className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-gray-800/40 transition-all duration-200 text-gray-300 hover:text-white"
                    >
                      <div className="p-1.5 rounded-lg bg-emerald-900/30 border border-emerald-800/50 flex items-center justify-center">
                        <FaHeart className="text-emerald-400" size={14} />
                      </div>
                      <span className="text-sm font-medium">Our mission</span>
                    </Link>
                    <Link
                      href="/terms"
                      target="_blank"
                      className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-gray-800/40 transition-all duration-200 text-gray-300 hover:text-white"
                    >
                      <div className="p-1.5 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center">
                        <FiBook className="text-blue-400" size={14} />
                      </div>
                      <span className="text-sm font-medium">Terms</span>
                    </Link>

                    <Link
                      href="https://coff.ee/filippofonseca"
                      target="_blank"
                      className="w-full flex items-center space-x-2.5 p-2 rounded-lg hover:bg-gray-800/40 transition-all duration-200 text-gray-300 hover:text-white"
                    >
                      <div className="p-1.5 rounded-lg bg-amber-900/30 border border-amber-800/50 flex items-center justify-center">
                        <FiCoffee className="text-amber-400" size={14} />
                      </div>
                      <span className="text-sm font-medium">
                        Buy us a coffee
                      </span>
                    </Link>
                  </div>
                </motion.div>

                {/* Disclaimer Text */}
                <div className="px-1 pb-2">
                  <p className="text-[11px] text-gray-500 leading-tight">
                    Yale DegreeIntelligence is unaffiliated with Yale
                    University. Data may be inaccurate - please verify
                    everything with your DUS. We take no responsibility for any
                    errors or omissions. This is purely a tool developed for
                    ourselves that we wished to share, as it's helped us a ton!
                  </p>
                </div>
              </div>
            </div>
          </motion.aside>

          {/* Main Content Area */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex-1 overflow-y-auto" // Add overflow-y-auto here
            style={{ maxHeight: "calc(80vh)" }} // Adjust this value based on your header/footer heights
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
                      <div className="mb-6 flex justify-between items-start">
                        <div>
                          <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                            Your academic journey at Yale,{" "}
                            {user?.displayName?.split(" ")[0]}.
                          </h2>
                          <p>
                            These are all the classes you've taken, including
                            their grades and in-progress ones. Upload a more
                            recent transcript on the top right.
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowUpdateModal(true)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-800 hover:border-gray-700 text-gray-300 hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)]"
                        >
                          <FiRefreshCw className="text-blue-400" />
                        </motion.button>
                      </div>
                      <div className="space-y-8">
                        {Array.from(
                          new Set(
                            courses
                              .filter((course) => !course.skipped)
                              .map((c) => `${c.semester} ${c.year}`)
                          )
                        )
                          .sort((a, b) => {
                            const semesterOrder = {
                              Spring: 0,
                              Summer: 1,
                              Fall: 2,
                            };

                            const [semesterA, yearA] = a.split(" ");
                            const [semesterB, yearB] = b.split(" ");

                            const yA = parseInt(yearA);
                            const yB = parseInt(yearB);

                            if (yA !== yB) return yA - yB;
                            return (
                              semesterOrder[
                                semesterA as keyof typeof semesterOrder
                              ] -
                              semesterOrder[
                                semesterB as keyof typeof semesterOrder
                              ]
                            );
                          })
                          .map((semester) => (
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
                                    (c) =>
                                      `${c.semester} ${c.year}` === semester
                                  )
                                  .map((course) => {
                                    // console.log(
                                    //   "the course name and status",
                                    //   course.code,
                                    //   course.status
                                    // );
                                    return (
                                      <motion.div
                                        key={course.id}
                                        whileHover={{ y: -2 }}
                                        className={`p-4 cursor-pointer rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all`}
                                        onClick={() => {
                                          setModalOpen({
                                            isOpen: true,
                                            course: {
                                              code: course.code,
                                              name:
                                                getCourseNameFromCode(
                                                  course.code
                                                ) ?? "Course",
                                              status: course.status,
                                              skipped: course.skipped || false,
                                            },
                                          });
                                        }}
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
                                              {getCourseNameFromCode(
                                                course.code
                                              )}
                                            </p>
                                            <div className="flex items-center mt-1 space-x-2">
                                              <span
                                                className={`text-xs px-2 py-1 rounded-full ${
                                                  course.status ===
                                                    "completed" &&
                                                  !course.skipped
                                                    ? getGPAColor(
                                                        course.grade || ""
                                                      ) + " bg-emerald-900/20"
                                                    : course.status ===
                                                      "in-progress"
                                                    ? "text-purple-300 bg-purple-900/20"
                                                    : "text-gray-300 bg-gray-800/20"
                                                }`}
                                              >
                                                {course.status ===
                                                  "completed" && !course.skipped
                                                  ? course.grade || "Completed"
                                                  : course.status ===
                                                    "in-progress"
                                                  ? "In Progress"
                                                  : "Skipped"}
                                              </span>
                                              <span className="text-xs text-gray-500">
                                                {course.credits} credit
                                                {course.credits !== 1
                                                  ? "s"
                                                  : ""}
                                              </span>
                                            </div>
                                          </div>
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                              </div>
                            </motion.div>
                          ))}
                        {courses.some((c) => c.skipped) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-8"
                          >
                            <div className="mb-4">
                              <h3 className="text-lg font-medium text-gray-300">
                                "Skipped" Courses for your major
                                {userProfile && userProfile?.majors.length > 0
                                  ? "s"
                                  : ""}
                              </h3>
                              <p className="text-sm text-gray-500">
                                You have indicated to us in the <i>My major</i>{" "}
                                page that you qualify to "skip" these classes,
                                which fulfill requirements.
                              </p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {courses
                                .filter((c) => c.skipped)
                                .map((course) => (
                                  <motion.div
                                    key={course.id}
                                    whileHover={{ y: -2 }}
                                    className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all border-l-2"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-medium">
                                          {course.code}
                                        </h4>
                                        <p className="text-sm text-gray-400">
                                          {getCourseNameFromCode(course.code)}
                                        </p>
                                        <div className="flex items-center mt-1 space-x-2">
                                          <span className="text-xs text-gray-500">
                                            {course.credits} credit
                                            {course.credits !== 1 ? "s" : ""}
                                          </span>
                                        </div>
                                      </div>
                                      {course.grade && (
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
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <h2 className="text-xl font-medium mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                        Let's begin your journey to better contextualize & plan
                        your Yale degree.
                      </h2>
                      <div className="w-full max-w-lg bg-gray-900/50 backdrop-blur-sm p-8 rounded-xl border border-gray-800">
                        <FileUpload onSuccess={parseAndStoreCourses} />
                        <p className="text-center text-gray-500 text-sm mt-4">
                          By uploading your transcript, you agree to our{" "}
                          <Link
                            href="/terms"
                            className="text-gray-400 hover:text-gray-300 hover:underline transition-all hover:scale-[1.3]"
                            target="_blank"
                          >
                            terms.
                          </Link>
                        </p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
              {showUpdateModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setShowUpdateModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-800 relative"
                  >
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-800 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                    <h3 className="text-xl font-medium mb-4 text-gray-200">
                      Update your transcript
                    </h3>
                    <p className="text-gray-400 mb-6">
                      Upload a new transcript to update your course history.
                      We'll only add new courses that aren't already in your
                      record.
                    </p>
                    <FileUpload onSuccess={parseAndStoreCourses} />
                  </motion.div>
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
                        This is based on data from your transcript and the{" "}
                        {userProfile?.majors?.length > 1 ? "majors" : "major"}{" "}
                        you indicated to us.
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
                              {major} - {MAJORS[major] || major}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  <MajorProgressView
                    selectedMajor={selectedMajor}
                    progress={getMajorProgress()!}
                    onRequirementChange={fetchCourses}
                    courses={courses}
                  />
                </motion.div>
              )}
              {activeTab === "distributionals" && (
                <motion.div
                  key="distributionals"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <DistributionalsView courses={courses} />
                </motion.div>
              )}
              {activeTab === "cleoai" && (
                <motion.div
                  key="cleoai"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-6 flex items-start justify-between">
                    <div className="m-0">
                      <h2 className="text-3xl m-0 font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
                        CleoAI – Context-Powered Academic Insight
                      </h2>
                      <p className="text-gray-400 mt-2">
                        More than just a chatbot – CleoAI is your tailored
                        academic advisor, powered by your actual transcript
                        data.
                      </p>
                    </div>

                    <span className="inline-block px-3 py-1 text-sm bg-yellow-900/30 border border-yellow-800 text-yellow-400 rounded-full">
                      Coming Soon
                    </span>
                  </div>

                  <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 space-y-4">
                    <p className="text-lg text-gray-200 font-medium">
                      Sure, you could copy-paste your transcript into ChatGPT…
                    </p>
                    <p className="text-gray-400">But good luck supplying:</p>
                    <ul className="list-disc list-inside text-gray-400 space-y-1 pl-2">
                      <li>Thousands of lines of course history and grades</li>
                      <li>Raw and computed academic stats</li>
                      <li>Dynamic progress toward major and graduation</li>
                      <li>
                        Distributional fulfillment, GPA, and degree requirements
                      </li>
                    </ul>

                    <p className="text-gray-400">
                      CleoAI already knows all of that — because it lives inside
                      your DegreeIntelligence dashboard. No need to re-explain
                      yourself.
                    </p>

                    <div className="p-4 rounded-lg bg-blue-900/20 border border-blue-800 text-blue-300 text-sm italic">
                      This isn’t just AI with words. This is AI with{" "}
                      <span className="font-semibold text-blue-200">
                        context
                      </span>
                      .
                    </div>

                    <p className="text-gray-500 text-sm pt-2">
                      We are actively working on making CleoAI better. Stay
                      tuned. {":)"}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
      <CourseModal
        isOpen={modalOpen.isOpen}
        course={modalOpen.course}
        onClose={() => setModalOpen({ isOpen: false, course: null })}
        allowSkip={false} // Disables skip functionality
      />
    </main>
  );
}
