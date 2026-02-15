"use client";

import { useAuth } from "@/context/AuthContext";
import FileUpload from "@/components/file-upload";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBarChart2,
  FiBook,
  FiChevronRight,
  FiChevronDown,
  FiCoffee,
  FiRefreshCw,
  FiUsers,
  FiTrash2,
  FiX,
  FiMenu,
  FiAlertTriangle,
  FiCheck,
} from "react-icons/fi";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  getDoc,
  writeBatch,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import {
  syncFriendsPublicData,
  enableFriendsFeature,
  disableFriendsFeature,
} from "@/lib/syncFriendsPublicData";
import { gradePoints, getDistPillStyle } from "@/lib/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import V2AnnouncementModal from "@/components/V2AnnouncementModal/V2AnnouncementModal";
import { calculateMajorProgress, MAJORS } from "@/lib/majors";
import MajorProgressView from "@/components/MajorProgressView";
import StatsView from "@/components/StatsView";
import MajorSelectionFlow from "@/components/MajorSelectionFlow";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill } from "react-icons/ri";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import DistributionalsView from "@/components/DistributionalProgress";
import { FaBuildingCircleCheck, FaHeart, FaYoutube } from "react-icons/fa6";
import CustomLoader from "@/components/ui/CustomLoader";
import UserSettingsModal from "@/components/UserSettingsModal/UserSettingsModal";
import Link from "next/link";
import LogoIcon from "@/icons/LogoIcon";
import CourseModal from "@/components/MajorProgressView/CourseModal";
import { getGPAColor } from "@/lib/utils/utils";
import { getSharedCourses } from "@/lib/utils/sharedCourses";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal/ConfirmDeleteModal";
import PublicFacingPage from "@/screens/PublicFacingPage";
import FriendsTab from "@/components/FriendsTab/FriendsTab";
import { MessageCircleQuestionMark, MonitorCog, Printer } from "lucide-react";
import Simulator from "@/components/Simulator/Simulator";
import CleoAITab from "@/components/CleoAITab/CleoAITab";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  updatedAt: Date;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [showMajorSelection, setShowMajorSelection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const isBrandNew = userProfile?.graduationYear === 2029;

  // NEW: state for confirming deletion of an in-progress course
  const [confirmDelete, setConfirmDelete] = useState<{
    open: boolean;
    course: Course | null;
  }>({ open: false, course: null });

  const [coursesLoading, setCoursesLoading] = useState(true);

  // Friends feature state
  const [friendsEnabled, setFriendsEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      setCoursesLoading(false);
      setCourses([]);
      setHasData(false);
      setFriendsEnabled(false);
    }
  }, [user]);

  //for the "My courses" section:
  const [modalOpen, setModalOpen] = useState<{
    isOpen: boolean;
    course: {
      id: string;
      code: string;
      name: string;
      status: "completed" | "in-progress" | "not-taken" | "skipped";
      skipped: boolean;
      distributionals: string[];
    } | null;
  }>({ isOpen: false, course: null });

  //tabs:
  const [activeTab, setActiveTab] = useLocalStorage(
    "dashboardActiveTab",
    "upload",
  );

  // Simulator unsaved changes check
  const [simulatorNavCheck, setSimulatorNavCheck] = useState<
    ((callback: () => void) => void) | null
  >(null);

  // Safe tab switch that checks for unsaved simulator changes
  const handleTabChange = (newTab: string) => {
    if (activeTab === "simulator" && simulatorNavCheck) {
      simulatorNavCheck(() => {
        setActiveTab(newTab);
      });
    } else {
      setActiveTab(newTab);
    }
  };

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showSharedCoursesDropdown, setShowSharedCoursesDropdown] =
    useState(false);
  const sharedCoursesRef = useRef<HTMLDivElement>(null);
  const [showV2Modal, setShowV2Modal] = useState(false);

  // Check if user has seen v2 announcement modal - only show on "my courses" tab after onboarding is complete
  useEffect(() => {
    // Don't show if: no user, onboarding in progress, or not on upload tab
    if (!user || showMajorSelection || activeTab !== "upload") return;
    const checkV2ModalSeen = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        const data = userDoc.data();
        if (!data?.hasSeenV2Modal) {
          setShowV2Modal(true);
        }
      } catch (error) {
        console.error("Error checking v2 modal status:", error);
      }
    };
    checkV2ModalSeen();
  }, [user, showMajorSelection, activeTab]);

  const dismissV2Modal = async () => {
    setShowV2Modal(false);
    if (!user) return;
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { hasSeenV2Modal: true },
        { merge: true },
      );
    } catch (error) {
      console.error("Error saving v2 modal status:", error);
    }
  };

  // Close shared courses dropdown on outside click
  useEffect(() => {
    if (!showSharedCoursesDropdown) return;
    const handleClick = (e: MouseEvent) => {
      if (
        sharedCoursesRef.current &&
        !sharedCoursesRef.current.contains(e.target as Node)
      ) {
        setShowSharedCoursesDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showSharedCoursesDropdown]);

  const [distSelectorCourseId, setDistSelectorCourseId] = useState<
    string | null
  >(null);
  const [collapsedSemesters, setCollapsedSemesters] = useState<Set<string>>(
    new Set(),
  );

  // Helper to check if a semester has any in-progress courses
  const semesterHasInProgress = (semesterKey: string) => {
    return courses.some(
      (c) =>
        `${c.semester} ${c.year}` === semesterKey &&
        c.status === "in-progress" &&
        !c.skipped,
    );
  };

  // Toggle semester collapse
  const toggleSemesterCollapse = (semesterKey: string) => {
    setCollapsedSemesters((prev) => {
      const next = new Set(prev);
      if (next.has(semesterKey)) {
        next.delete(semesterKey);
      } else {
        next.add(semesterKey);
      }
      return next;
    });
  };

  const navItems = [
    {
      id: "upload",
      icon: HiDocumentDuplicate,
      label: "My courses",
      disabled: false,
    },
    {
      id: "major",
      icon: RiProgress3Fill,
      label: "My major",
      // badge: "2029 can use!",
    },
    {
      id: "simulator",
      icon: MonitorCog,
      label: "Simulator",
      // badge: "2029 can use!",
    },
    {
      id: "stats",
      icon: FiBarChart2,
      label: "Academic stats",
      disabled: !hasData,
    },
    {
      id: "friends",
      icon: FiUsers,
      label: "Friends",
      disabled: !hasData,
    },
    {
      id: "cleoai",
      icon: LogoIcon,
      label: "Dan",
      comingSoon: true,
    },
    {
      id: "distributionals",
      icon: FaBuildingCircleCheck,
      label: "Distributionals",
      disabled: !hasData,
    },
  ];

  // Live-subscribe to user profile so UI updates without refresh
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as UserProfile;
        setUserProfile(data);
        setSelectedMajor(data.majors?.[0] || "");
        setShowMajorSelection(false); // auto-close once profile exists
      } else {
        setUserProfile(null);
        setShowMajorSelection(true);
      }
    });
    return () => unsub();
  }, [user]);

  // Listen to friends_public_data to track friends feature status
  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, "friends_public_data", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setFriendsEnabled(docSnap.data().enabled || false);
        } else {
          setFriendsEnabled(false);
        }
      },
    );
    return () => unsub();
  }, [user]);

  // Replace your current getMajorProgress with this:
  const getMajorProgress = () => {
    if (!user || !selectedMajor) return null;

    const completedCourseCodes = courses
      .filter(
        (course) =>
          course.status === "completed" &&
          ((course.grade !== null && course.grade !== "In Progress") ||
            course.skipped),
      )
      .map((course) => course.code);

    const inProgressCourseCodes = courses
      .filter((course) => course.grade === "In Progress" && !course.skipped)
      .map((course) => course.code);

    const skippedCourseCodes = courses
      .filter((course) => course.skipped)
      .map((course) => course.code);

    const manualRequirements = courses.flatMap((course) =>
      (course.manualRequirementsFulfilled || [])
        .filter((m) => m.major_id === selectedMajor)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
          credits: course.credits || 1,
        })),
    );

    const excludedRequirements = courses.flatMap((course) =>
      (course.excludedFromRequirements || [])
        .filter((m) => m.major_id === selectedMajor)
        .map((m) => ({
          code: course.code,
          requirement: m.requirement_title,
        })),
    );

    // This works fine even if all arrays are empty.
    return calculateMajorProgress(
      selectedMajor,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes,
      manualRequirements,
      excludedRequirements,
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

  const checkAndRemoveDuplicates = async (userId: string) => {
    if (!userId) return;

    try {
      // Fetch all courses for the user
      const q = query(collection(db, "courses"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      const coursesMap = new Map<string, { id: string; count: number }>();

      // Identify duplicates
      querySnapshot.forEach((doc) => {
        const course = doc.data() as Course;
        // Create a unique key combining semester, year, code, and grade
        const key = `${course.semester}-${course.year}-${course.code}-${
          course.grade || "null"
        }`;

        if (coursesMap.has(key)) {
          // Increment count if duplicate exists
          const existing = coursesMap.get(key)!;
          coursesMap.set(key, { ...existing, count: existing.count + 1 });
        } else {
          // Add new entry
          coursesMap.set(key, { id: doc.id, count: 1 });
        }
      });

      // Prepare batch delete for duplicates
      const batch = writeBatch(db);
      let duplicatesFound = 0;

      coursesMap.forEach((value, key) => {
        if (value.count > 1) {
          // Add to batch delete (we'll keep one copy)
          batch.delete(doc(db, "courses", value.id));
          duplicatesFound++;
          // console.log(`Found duplicate course: ${key}`);
        }
      });

      if (duplicatesFound > 0) {
        // console.log(`Found ${duplicatesFound} duplicates, removing...`);
        await batch.commit();
        // console.log(
        //   `Successfully removed ${duplicatesFound} duplicate courses`
        // );
      } else {
        // console.log("No duplicate courses found");
      }

      return duplicatesFound;
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      throw error;
    }
  };

  const parseAndStoreCourses = async (extractedText: string) => {
    if (!user) return;

    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid),
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);

    const existingCoursesMap = new Map<
      string,
      { docId: string; grade: string | null }
    >();
    existingSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const key = `${data.semester}-${data.year}-${data.code}`;
      existingCoursesMap.set(key, { docId: doc.id, grade: data.grade || null });
    });

    const semesterBlocks = extractedText
      .split("Semester: ")
      .filter((block) => block.trim() !== "");
    const coursesToAdd: Omit<Course, "id">[] = [];

    const seenInThisParse = new Set<string>();

    for (const block of semesterBlocks) {
      const [semesterInfo, ...courseLines] = block.split("\n");
      const [season, year] = semesterInfo.split(" ");

      for (const line of courseLines) {
        if (line.trim() === "") continue;

        const completedMatch = line.match(
          /^- (.+?): (.+?) — (.+?) \((\d+\.\d+)\)$/,
        );
        if (completedMatch) {
          const [, code, name, grade, credits] = completedMatch;
          const key = `${season.trim()}-${year.trim()}-${code.trim()}`;
          const courseKey = `${key}-${grade.trim()}`;

          if (seenInThisParse.has(courseKey)) continue;
          seenInThisParse.add(courseKey);

          const existingCourse = existingCoursesMap.get(key);
          if (existingCourse) {
            if (existingCourse.grade !== grade.trim()) {
              // Grade changed → delete old course
              // console.log(
              //   `Deleting outdated course: ${key} (old grade: ${
              //     existingCourse.grade
              //   }, new grade: ${grade.trim()})`
              // );
              await deleteDoc(doc(db, "courses", existingCourse.docId));
            } else {
              // Already exists with same grade → skip
              // console.log(`Skipping duplicate: ${courseKey}`);
              continue;
            }
          }

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

        const inProgressMatch = line.match(
          /^- (.+?): (.+?) — (?:In Progress|IP) \((\d+\.\d+)\)$/,
        );
        if (inProgressMatch) {
          const [, code, name, credits] = inProgressMatch;
          const key = `${season.trim()}-${year.trim()}-${code.trim()}`;
          const courseKey = `${key}-null`;

          if (seenInThisParse.has(courseKey)) continue;
          seenInThisParse.add(courseKey);

          const existingCourse = existingCoursesMap.get(key);
          if (existingCourse) {
            if (existingCourse.grade !== null) {
              // Grade changed from completed to in-progress → delete old
              // console.log(
              //   `Deleting outdated course: ${key} (old grade: ${existingCourse.grade}, new: null)`
              // );
              await deleteDoc(doc(db, "courses", existingCourse.docId));
            } else {
              // Already exists with same null grade → skip
              // console.log(`Skipping duplicate in-progress: ${courseKey}`);
              continue;
            }
          }

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

    if (coursesToAdd.length > 0) {
      // console.log(`Adding ${coursesToAdd.length} new/updated courses`);
      const batchWrites = coursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });
      await Promise.all(batchWrites);
    } else {
      // console.log("No new or updated courses to add");
    }

    // Refresh
    await fetchCourses();

    try {
      await checkAndRemoveDuplicates(user.uid);
      await fetchCourses();
    } catch (error) {
      console.error("Error during duplicate check:", error);
    }

    // Sync to friends_public_data if enabled
    if (friendsEnabled) {
      const q = query(
        collection(db, "courses"),
        where("userId", "==", user.uid),
      );
      const snap = await getDocs(q);
      const freshCourses = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Course[];
      await syncFriendsPublicData(user.uid, freshCourses, userProfile, {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
      });
    }

    if (showUpdateModal) setShowUpdateModal(false);
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
        { merge: true },
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

  // Handle toggling the friends feature
  const handleToggleFriends = async (enabled: boolean) => {
    if (!user) return;

    try {
      if (enabled) {
        // Enable and sync current courses (without grades)
        await enableFriendsFeature(user.uid, courses, userProfile, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      } else {
        // Disable (keep document but set enabled = false)
        await disableFriendsFeature(user.uid);
      }
    } catch (error) {
      console.error("Error toggling friends feature:", error);
    }
  };

  const openDeleteConfirm = (course: Course) =>
    setConfirmDelete({ open: true, course });

  const closeDeleteConfirm = () =>
    setConfirmDelete({ open: false, course: null });

  // NEW: delete handler (by the doc id we already render in the list)
  const handleDeleteInProgress = async () => {
    if (!user || !confirmDelete.course?.id) return;
    try {
      await deleteDoc(doc(db, "courses", confirmDelete.course.id));
      await fetchCourses(); // refresh list
    } catch (err) {
      console.error("Error deleting course:", err);
    } finally {
      closeDeleteConfirm();
    }
  };

  const toggleDistributional = async (courseId: string, dist: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const current = course.distributionals || [];
    const updated = current.includes(dist)
      ? current.filter((d) => d !== dist)
      : [...current, dist];
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, distributionals: updated } : c,
      ),
    );
    try {
      await updateDoc(doc(db, "courses", courseId), {
        distributionals: updated,
      });
    } catch (error) {
      console.error("Error updating distributionals:", error);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, distributionals: current } : c,
        ),
      );
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
          friendsEnabled={friendsEnabled}
          onClose={() => setShowSettings(false)}
          onSave={handleProfileUpdate}
          onToggleFriends={handleToggleFriends}
          onLogout={() => {
            setShowSettings(false);
            setActiveTab("upload");
            logout();
          }}
          onDeleteAccount={async () => {
            const idToken = await user.getIdToken();
            const response = await fetch("/api/delete-account", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${idToken}`,
              },
            });
            if (!response.ok) {
              throw new Error("Failed to delete account");
            }
            setShowSettings(false);
            setActiveTab("upload");
            logout();
          }}
        />
      )}

      {/* V2 Announcement Modal - One time show */}
      <V2AnnouncementModal show={showV2Modal} onDismiss={dismissV2Modal} />

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

      <div className="relative max-w-7xl mx-auto px-4 lg:px-6">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex justify-between items-center py-4 lg:py-8"
        >
          <div className="flex items-center gap-2 lg:gap-3">
            {/* Mobile hamburger menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 hover:text-white transition-all"
              aria-label="Open menu"
            >
              <FiMenu size={18} />
            </button>
            {/* Logo - icon only on mobile, full on desktop */}
            <div
              onClick={() => setActiveTab("upload")}
              className="cursor-pointer transition-all hover:scale-105"
            >
              {/* Mobile: just icon */}
              <div className="lg:hidden">
                <LogoIcon width={28} height={28} />
              </div>
              {/* Desktop: full logo */}
              <div className="hidden lg:block">
                <CompoundLogo />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <a
              href="https://youtu.be/5H1kjMWQfgs"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-full border border-emerald-800 bg-emerald-900/30 text-emerald-300 hover:bg-emerald-900/50 hover:border-emerald-700 transition-all cursor-pointer"
              title="Watch our launch video!"
            >
              <FaYoutube className="text-red-500" size={14} />
              <strong>Feb 2026 - v2 LAUNCH VID:</strong> We&apos;ve made massive
              updates!
            </a>

            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 lg:p-2 rounded-xl hover:bg-white/[0.06] transition-all border border-white/[0.08] hover:border-white/[0.12] flex items-center gap-1"
              title="Settings"
            >
              <UserAvatar
                photoURL={user.photoURL}
                displayName={user.displayName}
                email={user.email}
                size={28}
              />
              <FiChevronDown className="hidden lg:block text-gray-400 text-sm" />
            </button>
          </div>
        </motion.header>

        <div className="flex flex-row gap-4 lg:gap-8 pb-4 lg:pb-8 h-[calc(100vh-88px)] lg:h-[calc(100vh-120px)]">
          {/* Mobile Sidebar Overlay */}
          <AnimatePresence>
            {sidebarOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSidebarOpen(false)}
                  className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
                />
                {/* Mobile Sidebar */}
                <motion.aside
                  initial={{ x: "-100%" }}
                  animate={{ x: 0 }}
                  exit={{ x: "-100%" }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden flex flex-col justify-between p-4 bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border-r border-white/[0.08] shadow-[8px_0_32px_rgba(0,0,0,0.5)]"
                >
                  {/* Header with logo and close */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/[0.06]">
                    <CompoundLogo size="sm" />
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-gray-300 hover:text-white transition-all"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                  {/* Mobile Nav Items */}
                  <nav className="space-y-1.5 flex-1 overflow-y-auto">
                    {navItems
                      .filter((item) => !item.disabled && !item.comingSoon)
                      .map((item) => (
                        <motion.button
                          key={item.id}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => {
                            handleTabChange(item.id);
                            setSidebarOpen(false);
                            void new Audio("/audio/pop.mp3")
                              .play()
                              .catch(() => null);
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all duration-300 ${
                            activeTab === item.id
                              ? "bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                              : "text-gray-400 hover:text-white hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <item.icon size={item.id === "cleoai" ? 18 : 14} />
                            <span className="text-sm">{item.label}</span>
                          </div>
                          {activeTab === item.id && (
                            <FiChevronRight className="text-blue-400" />
                          )}
                        </motion.button>
                      ))}
                  </nav>
                  {/* Mobile bottom section */}
                  <div className="pt-4 border-t border-white/[0.08] space-y-3">
                    {/* Quick links */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/mission"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white"
                      >
                        <FaHeart className="text-emerald-400" size={12} />
                        <span className="text-xs">Mission</span>
                      </Link>
                      <Link
                        href="/terms"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white"
                      >
                        <FiBook className="text-blue-400" size={12} />
                        <span className="text-xs">Terms</span>
                      </Link>
                      <Link
                        href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white"
                      >
                        <MessageCircleQuestionMark
                          className="text-purple-400"
                          size={12}
                        />
                        <span className="text-xs">Feedback</span>
                      </Link>
                      <Link
                        href="https://coff.ee/filippofonseca"
                        target="_blank"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.06] transition-all text-gray-400 hover:text-white"
                      >
                        <FiCoffee className="text-amber-400" size={12} />
                        <span className="text-xs">Coffee</span>
                      </Link>
                    </div>

                    {/* User profile */}
                    <button
                      onClick={() => {
                        setShowSettings(true);
                        setSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] transition-all"
                    >
                      <UserAvatar
                        photoURL={user.photoURL}
                        displayName={user.displayName}
                        email={user.email}
                        size={32}
                      />
                      <div className="flex-1 text-left">
                        <p className="text-sm text-white truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>

                    {/* Disclaimer */}
                    <p className="text-[9px] text-gray-600 leading-tight px-1">
                      Student-built tool. Verify with your DUS. Not affiliated
                      with Yale.
                    </p>
                  </div>
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Desktop Sidebar Navigation */}
          <motion.aside
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="hidden lg:flex w-56 h-full flex-col justify-between p-4 rounded-3xl bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_80px_rgba(59,130,246,0.06),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3)] ring-1 ring-white/[0.05] overflow-visible"
          >
            {/* Navigation Items */}
            <nav className="space-y-1.5 flex-1 overflow-y-auto overflow-x-visible px-1">
              {/* Always-enabled items (not disabled and not comingSoon) */}
              {navItems
                .filter((item) => !item.disabled && !item.comingSoon)
                .map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ scale: 1.02, x: 2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleTabChange(item.id);
                      void new Audio("/audio/pop.mp3").play().catch(() => null);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all duration-300 relative ${
                      activeTab === item.id
                        ? "bg-gradient-to-br from-white/[0.12] via-white/[0.06] to-transparent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2),0_4px_16px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.08)] backdrop-blur-sm border border-transparent"
                        : "text-gray-400 hover:text-white hover:bg-white/[0.04] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.15)]"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon
                        size={item.id === "cleoai" ? 18 : 12}
                        opacity={
                          item.id === "cleoai" && activeTab !== "cleoai"
                            ? 0.5
                            : 1
                        }
                      />
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

              {/* Coming soon items (shown in main nav but disabled with badge) */}
              {navItems
                .filter((item) => item.comingSoon)
                .map((item) => (
                  <motion.button
                    key={item.id}
                    className="w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all duration-300 relative text-gray-600 cursor-not-allowed opacity-60"
                    disabled
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon
                        size={item.id === "cleoai" ? 18 : 12}
                        opacity={0.5}
                      />
                      <span>{item.label}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                        COMING SOON
                      </span>
                    </div>
                  </motion.button>
                ))}

              {/* Subheader for disabled items (only shown when there are data-dependent disabled items) */}
              {navItems.some((item) => item.disabled && !item.comingSoon) && (
                <div className="pt-3 pb-1 px-4">
                  <p className="text-[9px] font-medium uppercase tracking-widest text-gray-600">
                    After you upload courses:
                  </p>
                </div>
              )}

              {/* Disabled items (data-dependent, not coming soon) */}
              {navItems
                .filter((item) => item.disabled && !item.comingSoon)
                .map((item) => (
                  <motion.button
                    key={item.id}
                    className="w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all duration-300 relative text-gray-600 cursor-not-allowed opacity-60"
                    disabled
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon
                        size={item.id === "cleoai" ? 18 : 12}
                        opacity={0.5}
                      />
                      <span>{item.label}</span>
                    </div>
                  </motion.button>
                ))}
            </nav>

            {/* Fixed Bottom Section */}
            <div className="sticky bottom-0 left-0 right-0 pt-2">
              <div className="space-y-2">
                {/* Neumorphic Action Card */}
                <motion.div
                  whileHover={{ y: -1, scale: 1.005 }}
                  whileTap={{ scale: 0.99 }}
                  className="p-2 rounded-xl bg-gradient-to-br from-white/[0.08] via-transparent to-black/20 border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_60px_rgba(139,92,246,0.04),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.3)] backdrop-blur-md"
                >
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/mission"
                      target="_blank"
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-400 hover:text-white"
                    >
                      <div className="p-1 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-900/30 border border-emerald-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                        <FaHeart
                          className="text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]"
                          size={10}
                        />
                      </div>
                      <span className="text-xs">Our mission</span>
                    </Link>
                    <Link
                      href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                      target="_blank"
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-400 hover:text-white"
                    >
                      <div className="p-1 rounded-md bg-gradient-to-br from-purple-500/20 to-purple-900/30 border border-purple-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                        <MessageCircleQuestionMark
                          className="text-purple-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.4)]"
                          size={10}
                        />
                      </div>
                      <span className="text-xs">Feedback & errors</span>
                    </Link>
                    <Link
                      href="/terms"
                      target="_blank"
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-400 hover:text-white"
                    >
                      <div className="p-1 rounded-md bg-gradient-to-br from-blue-500/20 to-blue-900/30 border border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                        <FiBook
                          className="text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.4)]"
                          size={10}
                        />
                      </div>
                      <span className="text-xs">Terms</span>
                    </Link>
                    <Link
                      href="https://coff.ee/filippofonseca"
                      target="_blank"
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-400 hover:text-white"
                    >
                      <div className="p-1 rounded-md bg-gradient-to-br from-amber-500/20 to-amber-900/30 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                        <FiCoffee
                          className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]"
                          size={10}
                        />
                      </div>
                      <span className="text-xs">Buy us a coffee</span>
                    </Link>
                  </div>
                </motion.div>

                {/* Disclaimer Text */}
                <div className="px-1 pb-1">
                  <p className="text-[10px] text-gray-600 leading-tight text-justify">
                    DegreeIntelligence is a student-built tool. Data may be
                    inaccurate. Verify with your DUS. NOT AFFILIATED AS A YALE
                    STUDENT GROUP.
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
            className="flex-1 h-full overflow-y-auto"
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
                      <div className="mb-4 lg:mb-6 flex flex-col sm:flex-row justify-between items-start gap-3">
                        <div>
                          <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-200 dark:to-purple-200">
                            Your academic journey at Yale,{" "}
                            {user?.displayName?.split(" ")[0]}.
                          </h2>
                          <p className="text-sm lg:text-base text-gray-600 dark:text-gray-300 mt-1">
                            All your classes, grades, and in-progress courses.
                          </p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => setShowUpdateModal(true)}
                          className="flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all shadow-[0_4px_20px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_20px_rgba(0,0,0,0.25)] text-sm"
                        >
                          <FiRefreshCw
                            className="text-blue-500 dark:text-blue-400"
                            size={16}
                          />
                          <span className="hidden sm:inline">
                            Update courses
                          </span>
                        </motion.button>
                      </div>

                      <div className="space-y-8">
                        {Array.from(
                          new Set(
                            courses
                              .filter((course) => !course.skipped)
                              .map((c) => `${c.semester} ${c.year}`),
                          ),
                        )
                          .sort((a, b) => {
                            const semesterOrder = {
                              Spring: 0,
                              Summer: 1,
                              Fall: 2,
                            } as const;
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
                          .map((semester) => {
                            const isCollapsed =
                              collapsedSemesters.has(semester);
                            const hasInProgress =
                              semesterHasInProgress(semester);
                            const semesterCourses = courses.filter(
                              (c) => `${c.semester} ${c.year}` === semester,
                            );

                            return (
                              <motion.div
                                key={semester}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="mb-6"
                              >
                                {/* Semester Header */}
                                <button
                                  onClick={() =>
                                    toggleSemesterCollapse(semester)
                                  }
                                  className="w-full flex items-center justify-between mb-3 group"
                                >
                                  <div className="flex items-center gap-2">
                                    <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors">
                                      {semester}
                                    </h3>
                                    {hasInProgress && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 border border-purple-500/30 text-purple-300">
                                        <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                                        In Progress
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-600">
                                      {semesterCourses.length} course
                                      {semesterCourses.length !== 1 ? "s" : ""}
                                    </span>
                                  </div>
                                  <motion.div
                                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                                    transition={{ duration: 0.2 }}
                                    className="p-1 rounded-md text-gray-500 group-hover:text-gray-300 group-hover:bg-white/[0.05] transition-all"
                                  >
                                    <FiChevronDown size={16} />
                                  </motion.div>
                                </button>

                                {/* Collapsible Courses Grid */}
                                <AnimatePresence initial={false}>
                                  {!isCollapsed && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{
                                        duration: 0.2,
                                        ease: "easeInOut",
                                      }}
                                      className="overflow-hidden"
                                    >
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {courses
                                          .filter(
                                            (c) =>
                                              `${c.semester} ${c.year}` ===
                                              semester,
                                          )
                                          .map((course) => (
                                            <motion.div
                                              key={course.id}
                                              whileHover={{ y: -2 }}
                                              className={`relative p-4 cursor-pointer rounded-xl bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm dark:shadow-none`}
                                              onClick={() => {
                                                setModalOpen({
                                                  isOpen: true,
                                                  course: {
                                                    id: course.id,
                                                    code: course.code,
                                                    name:
                                                      getCourseNameFromCode(
                                                        course.code,
                                                      ) ?? "Course",
                                                    status: course.status,
                                                    skipped:
                                                      course.skipped || false,
                                                    distributionals:
                                                      course.distributionals ||
                                                      [],
                                                  },
                                                });
                                              }}
                                            >
                                              {/* TOP ROW */}
                                              <div className="flex justify-between items-start">
                                                <div className="pr-8">
                                                  <h4 className="font-medium text-gray-900 dark:text-white">
                                                    {course.code}
                                                    {course.skipped && (
                                                      <span className="ml-2 text-xs text-gray-500">
                                                        (skipped)
                                                      </span>
                                                    )}
                                                  </h4>
                                                  <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    {getCourseNameFromCode(
                                                      course.code,
                                                    )}
                                                  </p>
                                                  <div className="flex items-center mt-1 space-x-2">
                                                    <span
                                                      className={`text-xs px-2 py-1 rounded-full ${
                                                        course.status ===
                                                          "completed" &&
                                                        !course.skipped
                                                          ? getGPAColor(
                                                              course.grade ||
                                                                "",
                                                            ) +
                                                            " bg-emerald-100 dark:bg-emerald-900/20"
                                                          : course.status ===
                                                              "in-progress"
                                                            ? "text-purple-600 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/20"
                                                            : "text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800/20"
                                                      }`}
                                                    >
                                                      {course.status ===
                                                        "completed" &&
                                                      !course.skipped
                                                        ? course.grade ||
                                                          "Completed"
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

                                                {/* NEW: Trash button ONLY for in-progress (and not skipped) */}
                                                {course.status ===
                                                  "in-progress" &&
                                                  !course.skipped && (
                                                    <button
                                                      aria-label="Delete in-progress course"
                                                      className="absolute top-3 right-3 p-2 rounded-lg border border-red-300 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 hover:border-red-400 dark:hover:border-red-700 transition-all"
                                                      onClick={(e) => {
                                                        e.stopPropagation(); // don't open the CourseModal
                                                        openDeleteConfirm(
                                                          course,
                                                        );
                                                      }}
                                                      title="Delete this in-progress course"
                                                    >
                                                      <FiTrash2 className="w-4 h-4" />
                                                    </button>
                                                  )}
                                              </div>
                                              {/* Distributional tags */}
                                              <div
                                                className="mt-2"
                                                onClick={(e) =>
                                                  e.stopPropagation()
                                                }
                                              >
                                                <div className="flex flex-wrap items-center gap-1.5">
                                                  {(
                                                    course.distributionals || []
                                                  ).map((d) => (
                                                    <span
                                                      key={d}
                                                      className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getDistPillStyle(d)}`}
                                                    >
                                                      {d}
                                                    </span>
                                                  ))}
                                                  {(
                                                    course.distributionals || []
                                                  ).length === 0 ? (
                                                    // Gradient border when no distributionals assigned
                                                    <button
                                                      onClick={() =>
                                                        setDistSelectorCourseId(
                                                          distSelectorCourseId ===
                                                            course.id
                                                            ? null
                                                            : course.id,
                                                        )
                                                      }
                                                      className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-purple-500/50 hover:border-purple-400/70 transition-all"
                                                    >
                                                      + assign distributional
                                                      req.
                                                    </button>
                                                  ) : (
                                                    <button
                                                      onClick={() =>
                                                        setDistSelectorCourseId(
                                                          distSelectorCourseId ===
                                                            course.id
                                                            ? null
                                                            : course.id,
                                                        )
                                                      }
                                                      className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800/50 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700/50 border border-dashed border-gray-300 dark:border-gray-700/50 transition-all"
                                                    >
                                                      edit distribs.
                                                    </button>
                                                  )}
                                                </div>
                                                <AnimatePresence>
                                                  {distSelectorCourseId ===
                                                    course.id && (
                                                    <motion.div
                                                      initial={{
                                                        opacity: 0,
                                                        height: 0,
                                                      }}
                                                      animate={{
                                                        opacity: 1,
                                                        height: "auto",
                                                      }}
                                                      exit={{
                                                        opacity: 0,
                                                        height: 0,
                                                      }}
                                                      className="overflow-hidden"
                                                    >
                                                      <div className="mt-2 p-3 rounded-lg bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 space-y-2.5">
                                                        <div>
                                                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                                                            Areas
                                                          </p>
                                                          <div className="flex flex-wrap gap-1.5">
                                                            {[
                                                              "Hu",
                                                              "So",
                                                              "Sc",
                                                            ].map((d) => (
                                                              <button
                                                                key={d}
                                                                onClick={() =>
                                                                  toggleDistributional(
                                                                    course.id,
                                                                    d,
                                                                  )
                                                                }
                                                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                                                  (
                                                                    course.distributionals ||
                                                                    []
                                                                  ).includes(d)
                                                                    ? getDistPillStyle(
                                                                        d,
                                                                      )
                                                                    : "bg-white dark:bg-gray-800/50 text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                                                                }`}
                                                              >
                                                                {d}
                                                              </button>
                                                            ))}
                                                          </div>
                                                        </div>
                                                        <div>
                                                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                                                            Skills
                                                          </p>
                                                          <div className="flex flex-wrap gap-1.5">
                                                            {["QR", "WR"].map(
                                                              (d) => (
                                                                <button
                                                                  key={d}
                                                                  onClick={() =>
                                                                    toggleDistributional(
                                                                      course.id,
                                                                      d,
                                                                    )
                                                                  }
                                                                  className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                                                    (
                                                                      course.distributionals ||
                                                                      []
                                                                    ).includes(
                                                                      d,
                                                                    )
                                                                      ? getDistPillStyle(
                                                                          d,
                                                                        )
                                                                      : "bg-white dark:bg-gray-800/50 text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                                                                  }`}
                                                                >
                                                                  {d}
                                                                </button>
                                                              ),
                                                            )}
                                                          </div>
                                                        </div>
                                                        <div>
                                                          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1.5">
                                                            Language
                                                          </p>
                                                          <div className="flex flex-wrap gap-1.5">
                                                            {[
                                                              "L1",
                                                              "L2",
                                                              "L3",
                                                              "L4",
                                                              "L5",
                                                            ].map((d) => (
                                                              <button
                                                                key={d}
                                                                onClick={() =>
                                                                  toggleDistributional(
                                                                    course.id,
                                                                    d,
                                                                  )
                                                                }
                                                                className={`text-xs px-2.5 py-1 rounded-full border font-medium transition-all ${
                                                                  (
                                                                    course.distributionals ||
                                                                    []
                                                                  ).includes(d)
                                                                    ? getDistPillStyle(
                                                                        d,
                                                                      )
                                                                    : "bg-white dark:bg-gray-800/50 text-gray-500 border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600"
                                                                }`}
                                                              >
                                                                {d}
                                                              </button>
                                                            ))}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </motion.div>
                                                  )}
                                                </AnimatePresence>
                                              </div>
                                            </motion.div>
                                          ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}

                        {courses.some((c) => c.skipped) && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mb-8"
                          >
                            <div className="mb-4">
                              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300">
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
                                    className="p-4 rounded-xl bg-white dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all border-l-2 shadow-sm dark:shadow-none"
                                  >
                                    <div className="flex justify-between items-start">
                                      <div>
                                        <h4 className="font-medium text-gray-900 dark:text-white">
                                          {course.code}
                                        </h4>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">
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
                                            course.grade,
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

                      {/* Data & Privacy Disclaimer */}
                      <div className="mt-10 p-4 rounded-xl bg-gradient-to-br from-gray-900/40 via-gray-900/30 to-gray-950/40 border border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="text-[11px] text-gray-500 leading-relaxed">
                          <span className="font-medium text-gray-400">
                            By using DegreeIntelligence, you voluntarily share
                            your grades.
                          </span>{" "}
                          Your transcript PDF is processed locally and is{" "}
                          <span className="text-emerald-400/80">
                            never stored
                          </span>{" "}
                          on our servers. However, we do store your course and
                          grade data in our database (private only to your
                          profile) to provide you with insights, progress
                          tracking, and recommendations for your major. By
                          uploading academic information, you confirm that you
                          are providing your own data and consent to its storage
                          and processing for academic planning purposes.{" "}
                          <Link
                            href="/terms"
                            target="_blank"
                            className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                          >
                            Read our full terms
                          </Link>
                          .
                        </p>
                        <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                          DegreeIntelligence is{" "}
                          <span className="font-medium">not affiliated</span> in
                          any way, shape, or form with Yale University, Yale
                          College, or DegreeAudit. We are simply a free,
                          student-built personal project that we wanted to share
                          with the community because we genuinely found it
                          helpful for ourselves.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      {/* Header */}
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200 mb-2">
                          Let's get your courses loaded, {user?.displayName}.
                        </h2>
                        <p className="text-gray-400 text-sm">
                          {isBrandNew
                            ? "After registration, we'll parse your classes and fill in grades when they post."
                            : "Upload your unofficial transcript to see your academic journey. We won't store the file."}
                        </p>
                      </div>

                      {/* Tutorial Steps */}
                      <div className="w-full max-w-xl mb-6">
                        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-md border border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]">
                          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
                              <Printer size={14} className="text-pink-400" />
                            </span>
                            How to get your transcript
                          </h3>
                          <div className="space-y-3">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-[0_2px_8px_rgba(236,72,153,0.3)]">
                                1
                              </div>
                              <div className="flex-1 pt-0.5">
                                <p className="text-sm text-gray-300">
                                  Go to{" "}
                                  <a
                                    href="https://yub.yale.edu"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-pink-400 hover:text-pink-300 underline underline-offset-2"
                                  >
                                    Yale Hub
                                  </a>{" "}
                                  and sign in
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-[0_2px_8px_rgba(236,72,153,0.3)]">
                                2
                              </div>
                              <div className="flex-1 pt-0.5">
                                <p className="text-sm text-gray-300">
                                  Navigate to{" "}
                                  <span className="px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/50 text-gray-200 font-mono text-xs">
                                    Academics
                                  </span>{" "}
                                  →{" "}
                                  <span className="px-1.5 py-0.5 rounded bg-gray-800/60 border border-gray-700/50 text-gray-200 font-mono text-xs">
                                    Unofficial Transcript
                                  </span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-[0_2px_8px_rgba(236,72,153,0.3)]">
                                3
                              </div>
                              <div className="flex-1 pt-0.5">
                                <p className="text-sm text-gray-300">
                                  Click{" "}
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-300 font-medium text-xs">
                                    Print
                                  </span>{" "}
                                  and save as PDF. Then upload it here.
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Upload Area */}
                      <div
                        id="upload-transcript"
                        className="w-full max-w-xl p-6 rounded-xl bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-md border border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]"
                      >
                        <FileUpload onSuccess={parseAndStoreCourses} />
                      </div>

                      {/* Data & Privacy Disclaimer */}
                      <div className="w-full max-w-xl mt-5 p-4 rounded-xl bg-gradient-to-br from-gray-900/40 via-gray-900/30 to-gray-950/40 border border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 mt-0.5">
                            <svg
                              className="w-3.5 h-3.5 text-emerald-400"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-[11px] text-gray-400 leading-relaxed">
                              <span className="font-medium text-gray-300">
                                By uploading, you voluntarily share your grades.
                              </span>{" "}
                              Your transcript PDF is processed locally and is{" "}
                              <span className="text-emerald-400">
                                never stored
                              </span>{" "}
                              on our servers. However, we store your course and
                              grade data in our database (private only to your
                              profile) to provide insights and recommendations
                              for your major. By uploading academic information,
                              you confirm that you are providing your own data
                              and consent to its storage and processing for
                              academic planning purposes.{" "}
                              <Link
                                href="/terms"
                                target="_blank"
                                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                              >
                                Read our full terms
                              </Link>
                              .
                            </p>
                            <p className="text-[10px] text-gray-600 mt-2 leading-relaxed">
                              DegreeIntelligence is{" "}
                              <span className="font-medium">
                                not affiliated
                              </span>{" "}
                              in any way, shape, or form with Yale University,
                              Yale College, or DegreeAudit. We are simply a
                              free, student-built personal project that we
                              wanted to share with the community because we
                              genuinely found it helpful for ourselves.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NEW: confirmation modal */}
                  <ConfirmDeleteModal
                    isOpen={confirmDelete.open}
                    course={confirmDelete.course}
                    onCancel={closeDeleteConfirm}
                    onConfirm={handleDeleteInProgress}
                  />
                </motion.div>
              )}

              {showUpdateModal && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-gray-100/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                  onClick={() => setShowUpdateModal(false)}
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-lg bg-white dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800 relative shadow-xl dark:shadow-none"
                  >
                    <button
                      onClick={() => setShowUpdateModal(false)}
                      className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500 dark:text-gray-400"
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
                    <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">
                      Update your transcript
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
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
                    <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-200 dark:to-purple-200">
                      Numbers aren't everything, but they're important.
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300">
                      Here's a comprehesive visual overview of your academic
                      trajectory over your time at Yale.
                    </p>
                  </div>
                  <StatsView courses={courses} />
                </motion.div>
              )}
              {activeTab === "major" && (
                <motion.div
                  key="major"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {user && userProfile && (
                    <div className="mb-6">
                      <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-200 dark:to-purple-200">
                        This is how you're doing for your{" "}
                        {userProfile?.majors?.length > 1 ? "majors" : "major"},{" "}
                        {user?.displayName?.split(" ")[0]}.
                      </h2>
                      <p className="text-gray-600 dark:text-gray-300">
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
                      <div className="mb-4">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
                          Viewing Progress For
                        </label>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {userProfile.majors.map((major) => (
                            <button
                              key={major}
                              onClick={() => setSelectedMajor(major)}
                              className={`px-3 py-1.5 rounded-xl text-sm transition-all duration-200 ${
                                selectedMajor === major
                                  ? "bg-gradient-to-br from-blue-500/20 via-blue-600/15 to-purple-500/20 text-blue-200 border border-blue-500/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(59,130,246,0.15)]"
                                  : "bg-gray-900/40 text-gray-400 border border-gray-800/60 hover:border-gray-700 hover:bg-gray-800/50 hover:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                              }`}
                            >
                              {major} - {MAJORS[major] || major}
                            </button>
                          ))}

                          {/* Shared Courses Indicator */}
                          {(() => {
                            const { courses: sharedCourses, totalCredits } =
                              getSharedCourses(userProfile, courses);
                            const isWarning = totalCredits > 2;
                            const hasShared = sharedCourses.length > 0;

                            return (
                              <div
                                ref={sharedCoursesRef}
                                className="relative ml-2"
                              >
                                <button
                                  onClick={() =>
                                    setShowSharedCoursesDropdown(
                                      !showSharedCoursesDropdown,
                                    )
                                  }
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs transition-all duration-200 ${
                                    isWarning
                                      ? "bg-amber-900/30 text-amber-300 border border-amber-600/40 hover:border-amber-500/60"
                                      : "bg-emerald-900/30 text-emerald-300 border border-emerald-600/40 hover:border-emerald-500/60"
                                  }`}
                                >
                                  {isWarning ? (
                                    <FiAlertTriangle size={12} />
                                  ) : (
                                    <FiCheck size={12} />
                                  )}
                                  <span>
                                    {hasShared
                                      ? `${totalCredits} shared cr${totalCredits !== 1 ? "s" : ""}`
                                      : "No overlap"}
                                  </span>
                                  <FiChevronDown
                                    size={12}
                                    className={`transition-transform ${showSharedCoursesDropdown ? "rotate-180" : ""}`}
                                  />
                                </button>

                                {/* Dropdown */}
                                <AnimatePresence>
                                  {showSharedCoursesDropdown && (
                                    <motion.div
                                      initial={{ opacity: 0, y: -5 }}
                                      animate={{ opacity: 1, y: 0 }}
                                      exit={{ opacity: 0, y: -5 }}
                                      className="absolute top-full left-0 mt-2 z-50 w-80 max-h-80 overflow-y-auto rounded-xl bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-medium text-gray-300 uppercase tracking-wider">
                                          Shared Courses
                                        </h4>
                                        <button
                                          onClick={() =>
                                            setShowSharedCoursesDropdown(false)
                                          }
                                          className="text-gray-500 hover:text-gray-300"
                                        >
                                          <FiX size={14} />
                                        </button>
                                      </div>

                                      {!hasShared ? (
                                        <div className="text-center py-4">
                                          <FiCheck
                                            className="mx-auto text-emerald-400 mb-2"
                                            size={24}
                                          />
                                          <p className="text-sm text-emerald-300 font-medium">
                                            All clear!
                                          </p>
                                          <p className="text-xs text-gray-500 mt-1">
                                            No courses are counting toward
                                            multiple majors.
                                          </p>
                                        </div>
                                      ) : (
                                        <>
                                          <div
                                            className={`text-xs mb-3 p-2 rounded-lg ${
                                              isWarning
                                                ? "bg-amber-900/20 text-amber-300 border border-amber-700/30"
                                                : "bg-emerald-900/20 text-emerald-300 border border-emerald-700/30"
                                            }`}
                                          >
                                            {isWarning ? (
                                              <>
                                                <strong>Heads up:</strong> You
                                                have more than 2 credits shared
                                                between majors. You may need to
                                                revise your course plan.
                                              </>
                                            ) : (
                                              <>
                                                <strong>
                                                  You&apos;re good!
                                                </strong>{" "}
                                                Having 1-2 shared credits
                                                between majors is typically
                                                allowed.
                                              </>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-600 mb-3 italic">
                                            Note: Pre-requisites don&apos;t
                                            count toward the 2-credit overlap
                                            limit. Check manually! We're just
                                            warning you, just in case.
                                          </p>

                                          <div className="space-y-2">
                                            {sharedCourses.map((course) => (
                                              <div
                                                key={course.code}
                                                className="p-2 rounded-lg bg-gray-800/50 border border-gray-700/30"
                                              >
                                                <div className="flex items-center justify-between mb-1">
                                                  <span className="text-sm font-medium text-gray-200">
                                                    {course.code}
                                                  </span>
                                                  <span className="text-[10px] text-gray-500">
                                                    {course.credits} cr
                                                  </span>
                                                </div>
                                                <div className="space-y-1">
                                                  {course.majors.map((m) => (
                                                    <div
                                                      key={m.majorId}
                                                      className="text-[11px]"
                                                    >
                                                      <span className="text-purple-300">
                                                        {m.majorName}:
                                                      </span>{" "}
                                                      <span className="text-gray-400">
                                                        {m.requirements.join(
                                                          ", ",
                                                        ) || "General"}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </>
                                      )}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          })()}
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
              {activeTab === "simulator" && (
                <motion.div
                  key="simulator"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  {userProfile && (
                    <Simulator
                      remainingCourses={
                        // 1. Aggregate all remaining courses across ALL majors
                        userProfile.majors
                          .flatMap((major) => {
                            // You'll need to compute progress for each major
                            const completedCourseCodes = courses
                              .filter(
                                (course) =>
                                  course.status === "completed" &&
                                  ((course.grade !== null &&
                                    course.grade !== "In Progress") ||
                                    course.skipped),
                              )
                              .map((course) => course.code);

                            const inProgressCourseCodes = courses
                              .filter(
                                (course) =>
                                  course.grade === "In Progress" &&
                                  !course.skipped,
                              )
                              .map((course) => course.code);

                            const skippedCourseCodes = courses
                              .filter((course) => course.skipped)
                              .map((course) => course.code);

                            const manualRequirements = courses.flatMap(
                              (course) =>
                                (course.manualRequirementsFulfilled || [])
                                  .filter((m) => m.major_id === major)
                                  .map((m) => ({
                                    code: course.code,
                                    requirement: m.requirement_title,
                                    credits: course.credits || 1,
                                  })),
                            );

                            const excludedRequirements = courses.flatMap(
                              (course) =>
                                (course.excludedFromRequirements || [])
                                  .filter((m) => m.major_id === major)
                                  .map((m) => ({
                                    code: course.code,
                                    requirement: m.requirement_title,
                                  })),
                            );

                            // Get progress for this major
                            const progress = calculateMajorProgress(
                              major,
                              completedCourseCodes,
                              inProgressCourseCodes,
                              skippedCourseCodes,
                              manualRequirements,
                              excludedRequirements,
                            );

                            // Extract all "not taken" requirements
                            return (
                              progress?.remainingRequirements.flatMap((req) =>
                                req.options
                                  .filter(
                                    (opt) =>
                                      !opt.completed &&
                                      !opt.inProgress &&
                                      !opt.skipped,
                                  )
                                  .map(
                                    (opt) =>
                                      ({
                                        id: `${opt.code}-sim-${major}`,
                                        code: opt.code,
                                        name: opt.name,
                                        grade: null,
                                        semester: "TBD",
                                        year: 0,
                                        userId: user?.uid || "",
                                        status: "not-taken" as const, // This is the key fix
                                        credits: opt.credits,
                                        skipped: false,
                                      }) as Course,
                                  ),
                              ) || []
                            );
                          })
                          .filter(
                            (course, idx, arr) =>
                              arr.findIndex((c) => c.code === course.code) ===
                              idx,
                          )
                      }
                      completedCourses={courses.filter(
                        (c) =>
                          c.status === "completed" ||
                          c.status === "in-progress",
                      )}
                      graduationYear={userProfile.graduationYear}
                      userMajors={userProfile.majors}
                    />
                  )}
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
              {activeTab === "friends" && (
                <motion.div
                  key="friends"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FriendsTab
                    friendsEnabled={friendsEnabled}
                    onToggleFriends={handleToggleFriends}
                  />
                </motion.div>
              )}
              {activeTab === "cleoai" && (
                <motion.div
                  key="cleoai"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-[calc(100vh-200px)]"
                >
                  <CleoAITab
                    courses={courses}
                    selectedMajor={selectedMajor}
                    userProfile={userProfile}
                    stats={calculateStats()}
                  />
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
        allowSkip={false}
        onToggleDistributional={(courseId, dist) => {
          toggleDistributional(courseId, dist);
          // Update modal state to reflect change
          setModalOpen((prev) => {
            if (!prev.course || prev.course.id !== courseId) return prev;
            const currentDists = prev.course.distributionals || [];
            const newDists = currentDists.includes(dist)
              ? currentDists.filter((d) => d !== dist)
              : [...currentDists, dist];
            return {
              ...prev,
              course: { ...prev.course, distributionals: newDists },
            };
          });
        }}
      />
    </main>
  );
}
