"use client";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
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
  FiPlus,
  FiSun,
  FiMoon,
  FiChevronsLeft,
  FiChevronsRight,
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
import { calculateMajorProgress, MAJORS } from "@/lib/majors";
import { HiDocumentDuplicate } from "react-icons/hi";
import { RiProgress3Fill } from "react-icons/ri";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { FaBuildingCircleCheck, FaHeart } from "react-icons/fa6";
import CustomLoader from "@/components/ui/CustomLoader";
import UserSettingsModal from "@/components/UserSettingsModal/UserSettingsModal";
import Link from "next/link";
import LogoIcon from "@/icons/LogoIcon";
import CourseModal from "@/components/MajorProgressView/CourseModal";
import { getGPAColor } from "@/lib/utils/utils";
import { getSharedCourses } from "@/lib/utils/sharedCourses";
import ConfirmDeleteModal from "@/components/ConfirmDeleteModal/ConfirmDeleteModal";
import ManualCourseEntryModal from "@/components/ManualCourseEntryModal";
import PublicFacingPage from "@/screens/PublicFacingPage";
import {
  MessageCircleQuestionMark,
  MonitorCog,
  Printer,
  Search,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import V3WelcomeModal from "@/components/V3Welcome/V3WelcomeModal";
import AppTour from "@/components/Tutorial/AppTour";
import { setUserFlag } from "@/lib/userFlags";
import dynamic from "next/dynamic";

// Heavy, tab-gated views are code-split so logged-out visitors and inactive
// tabs don't pull this code into the initial bundle. They render client-side
// only (the dashboard is already a client tree behind auth).
const TabFallback = () => (
  <div className="flex items-center justify-center py-24 text-sm text-gray-400 dark:text-gray-500">
    Loading…
  </div>
);
const MyCoursesView = dynamic(() => import("@/components/MyCoursesView"), {
  ssr: false,
  loading: TabFallback,
});
const StatsView = dynamic(() => import("@/components/StatsView"), {
  ssr: false,
  loading: TabFallback,
});
const MajorProgressView = dynamic(
  () => import("@/components/MajorProgressView"),
  { ssr: false, loading: TabFallback },
);
const DistributionalsView = dynamic(
  () => import("@/components/DistributionalProgress"),
  { ssr: false, loading: TabFallback },
);
const FriendsTab = dynamic(() => import("@/components/FriendsTab/FriendsTab"), {
  ssr: false,
  loading: TabFallback,
});
const Simulator = dynamic(() => import("@/components/Simulator/Simulator"), {
  ssr: false,
  loading: TabFallback,
});
const CleoAITab = dynamic(() => import("@/components/CleoAITab/CleoAITab"), {
  ssr: false,
  loading: TabFallback,
});
const MajorSelectionFlow = dynamic(
  () => import("@/components/MajorSelectionFlow"),
  { ssr: false },
);

interface UserProfile {
  majors: string[];
  graduationYear: number;
  updatedAt: Date;
  // Shared courses the user has manually marked as prerequisites, which are
  // exempt from the cross-major overlap warning (Yale's prereq data is spotty).
  prereqOverrides?: string[];
  // Onboarding flags: whether the user has seen the guided tour and the v3
  // welcome modal. Persisted so we don't re-show them on every visit.
  hasSeenTutorial?: boolean;
  hasSeenV3Welcome?: boolean;
}

export default function Home() {
  const { user, loading, logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [showMajorSelection, setShowMajorSelection] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useLocalStorage<boolean>(
    "di-sidebar-pinned",
    true,
  );
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered;
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [onboardChecked, setOnboardChecked] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  // Tracks whether the live profile subscription has resolved at least once.
  // Kept separate from coursesLoading so we don't flash the new-user/empty
  // state for returning users while their profile snapshot is still in-flight.
  const [profileLoading, setProfileLoading] = useState(true);
  const isBrandNew = userProfile?.graduationYear === 2030;

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
      setProfileLoading(false);
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

  // Global ⌘K / Ctrl+K to open the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandPaletteOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showManualEntryModal, setShowManualEntryModal] = useState(false);
  // When the manual-add flow is opened from a specific semester header, this
  // holds that semester key (e.g. "Fall 2026") so the modal can preselect it.
  const [manualEntryPreselectSemester, setManualEntryPreselectSemester] =
    useState<string | undefined>(undefined);
  const openManualEntry = (semester?: string) => {
    setManualEntryPreselectSemester(semester);
    setShowManualEntryModal(true);
  };
  const [showSharedCoursesDropdown, setShowSharedCoursesDropdown] =
    useState(false);
  const sharedCoursesRef = useRef<HTMLDivElement>(null);

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

  const navItems: {
    id: string;
    icon: React.ComponentType<any>;
    label: string;
    disabled?: boolean;
    comingSoon?: boolean;
  }[] = [
    {
      id: "upload",
      icon: HiDocumentDuplicate,
      label: "My courses",
      disabled: false,
    },
    {
      id: "major",
      icon: RiProgress3Fill,
      label: (userProfile?.majors?.length ?? 0) > 1 ? "My majors" : "My major",
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

    setProfileLoading(true);
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
      // Profile snapshot has now resolved at least once.
      setProfileLoading(false);
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

  // One-time onboarding: show the v3 welcome (then the tour) to users who
  // haven't seen them yet. Runs once per session after the profile loads.
  useEffect(() => {
    if (onboardChecked || !user || !userProfile) return;
    setOnboardChecked(true);
    if (!userProfile.hasSeenV3Welcome) {
      setWelcomeOpen(true);
    } else if (!userProfile.hasSeenTutorial) {
      setTourOpen(true);
    }
  }, [user, userProfile, onboardChecked]);

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

  // Handler for manually entered courses
  const handleManualCourseEntry = async (coursesToAdd: Omit<Course, "id">[]) => {
    if (!user) return;

    // Check for duplicates against existing courses
    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid),
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);

    const existingCoursesMap = new Map<
      string,
      { docId: string; grade: string | null }
    >();
    existingSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const key = `${data.semester}-${data.year}-${data.code}`;
      existingCoursesMap.set(key, { docId: docSnap.id, grade: data.grade || null });
    });

    const newCoursesToAdd: Omit<Course, "id">[] = [];

    for (const course of coursesToAdd) {
      const key = `${course.semester}-${course.year}-${course.code}`;
      const existingCourse = existingCoursesMap.get(key);

      if (existingCourse) {
        // If course exists with different grade, delete old and add new
        if (existingCourse.grade !== course.grade) {
          await deleteDoc(doc(db, "courses", existingCourse.docId));
          newCoursesToAdd.push(course);
        }
        // If same grade, skip (duplicate)
      } else {
        newCoursesToAdd.push(course);
      }
    }

    if (newCoursesToAdd.length > 0) {
      const batchWrites = newCoursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });
      await Promise.all(batchWrites);
    }

    // Refresh courses
    await fetchCourses();

    // Check and remove any duplicates
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

    setShowManualEntryModal(false);
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

  // Mark/unmark a shared course as a prerequisite (exempt from overlap warning).
  // Persisted on the profile; the onSnapshot subscription refreshes the UI.
  const handleTogglePrereqOverride = async (code: string) => {
    if (!user) return;
    const current = userProfile?.prereqOverrides || [];
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { prereqOverrides: next, updatedAt: new Date() },
        { merge: true },
      );
    } catch (error) {
      console.error("Error updating prerequisite overrides:", error);
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

  if (loading || (user && (coursesLoading || profileLoading)))
    return <CustomLoader />;

  if (!user) return <PublicFacingPage />;

  return (
    <main
      className={`min-h-screen neu-page text-gray-900 dark:text-gray-100 font-louize overflow-hidden`}
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
          onReplayTour={() => {
            setShowSettings(false);
            setTourOpen(true);
          }}
          onReplayWelcome={() => {
            // Dev-only: replay the full new-user v3 flow. Resets BOTH onboarding
            // booleans on users/{uid} and re-opens the welcome modal immediately.
            // This ONLY flips flags; it never touches plans or courses.
            if (user) {
              void setUserFlag(user.uid, "hasSeenV3Welcome", false);
              void setUserFlag(user.uid, "hasSeenTutorial", false);
            }
            setShowSettings(false);
            setTourOpen(false);
            setWelcomeOpen(true);
          }}
          onReplayTutorial={() => {
            // Dev-only: reset just the tutorial flag and re-open the tour.
            if (user) void setUserFlag(user.uid, "hasSeenTutorial", false);
            setShowSettings(false);
            setWelcomeOpen(false);
            setTourOpen(true);
          }}
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

      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/20"></div>
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bg-black/[0.04] dark:bg-white/5 backdrop-blur-sm"
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
              className="lg:hidden p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
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
            <button
              onClick={() => setCommandPaletteOpen(true)}
              className="lg:hidden p-1.5 rounded-xl neu-control hover:-translate-y-0.5 transition-all text-gray-600 dark:text-gray-300"
              title="Search (⌘K)"
              aria-label="Open search"
            >
              <Search size={16} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1.5 lg:p-2 rounded-xl neu-control hover:-translate-y-0.5 transition-all text-gray-600 dark:text-gray-300"
              title={
                resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label="Toggle theme"
            >
              <span className="flex h-7 w-7 items-center justify-center">
                {resolvedTheme === "dark" ? (
                  <FiSun size={18} />
                ) : (
                  <FiMoon size={18} />
                )}
              </span>
            </button>

            <button
              onClick={() => setShowSettings(true)}
              className="p-1.5 lg:p-2 rounded-xl neu-control hover:-translate-y-0.5 transition-all flex items-center gap-1"
              title="Settings"
            >
              <UserAvatar
                photoURL={user.photoURL}
                displayName={user.displayName}
                email={user.email}
                size={28}
              />
              <FiChevronDown className="hidden lg:block text-gray-500 dark:text-gray-400 text-sm" />
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
                  className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden flex flex-col justify-between p-4 neu-surface border-r border-black/[0.06] dark:border-white/[0.08]"
                >
                  {/* Header with logo and close */}
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <CompoundLogo size="sm" />
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
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
                              ? "neu-control-active text-gray-900 dark:text-white"
                              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
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
                  <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
                    {/* Quick links */}
                    <div className="grid grid-cols-2 gap-2">
                      <Link
                        href="/mission"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <FaHeart className="text-emerald-400" size={12} />
                        <span className="text-xs">Mission</span>
                      </Link>
                      <Link
                        href="/terms"
                        onClick={() => setSidebarOpen(false)}
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      >
                        <FiBook className="text-blue-400" size={12} />
                        <span className="text-xs">Terms</span>
                      </Link>
                      <Link
                        href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                        className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.06] transition-all"
                    >
                      <UserAvatar
                        photoURL={user.photoURL}
                        displayName={user.displayName}
                        email={user.email}
                        size={32}
                      />
                      <div className="flex-1 text-left">
                        <p className="text-sm text-gray-900 dark:text-white truncate">
                          {user.displayName}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                          {user.email}
                        </p>
                      </div>
                    </button>

                    {/* Disclaimer */}
                    <p className="text-[9px] text-gray-400 dark:text-gray-600 leading-tight px-1">
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
            animate={{ opacity: 1, x: 0, width: sidebarExpanded ? 224 : 76 }}
            transition={{ width: { type: "spring", stiffness: 380, damping: 38 } }}
            onMouseEnter={() => setSidebarHovered(true)}
            onMouseLeave={() => setSidebarHovered(false)}
            className="hidden lg:flex h-full flex-col justify-between p-3 rounded-3xl neu-surface backdrop-blur-xl ring-1 ring-black/[0.03] dark:ring-white/[0.05] overflow-visible"
          >
            {/* Pin / collapse toggle */}
            <div
              className={`flex mb-1.5 ${sidebarExpanded ? "justify-end" : "justify-center"}`}
            >
              <button
                onClick={() => {
                  const next = !sidebarPinned;
                  setSidebarPinned(next);
                  // Clear hover so the sidebar retracts immediately on collapse,
                  // instead of staying open because the cursor is still over it.
                  if (!next) setSidebarHovered(false);
                }}
                title={sidebarPinned ? "Collapse sidebar" : "Keep sidebar open"}
                aria-label={
                  sidebarPinned ? "Collapse sidebar" : "Keep sidebar open"
                }
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
              >
                {sidebarPinned ? (
                  <FiChevronsLeft size={16} />
                ) : (
                  <FiChevronsRight size={16} />
                )}
              </button>
            </div>

            {/* Global search trigger (⌘K) */}
            <div className="px-1 mb-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={() => setCommandPaletteOpen(true)}
                data-tour="search"
                title={sidebarExpanded ? undefined : "Search (⌘K)"}
                className={`w-full flex items-center rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors ${
                  sidebarExpanded
                    ? "justify-between px-3 py-2.5"
                    : "justify-center p-3"
                }`}
              >
                <span className="flex items-center space-x-3">
                  <Search size={14} />
                  {sidebarExpanded && (
                    <span className="text-sm whitespace-nowrap">Search</span>
                  )}
                </span>
                {sidebarExpanded && (
                  <kbd className="flex items-center gap-0.5 rounded-md border border-black/[0.08] dark:border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
                    ⌘K
                  </kbd>
                )}
              </motion.button>
            </div>

            {/* Navigation Items */}
            <nav className="space-y-1.5 flex-1 overflow-y-auto overflow-x-visible px-1">
              {/* Always-enabled items (not disabled and not comingSoon) */}
              {navItems
                .filter((item) => !item.disabled && !item.comingSoon)
                .map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      handleTabChange(item.id);
                      void new Audio("/audio/pop.mp3").play().catch(() => null);
                    }}
                    data-tour={`nav-${item.id}`}
                    title={sidebarExpanded ? undefined : item.label}
                    className={`relative w-full flex items-center px-3 py-3 text-left rounded-2xl transition-colors duration-200 ${
                      sidebarExpanded ? "justify-between" : "justify-center"
                    } ${
                      activeTab === item.id
                        ? "text-gray-900 dark:text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    {activeTab === item.id && (
                      <motion.div
                        layoutId="sidebarActiveTab"
                        transition={{
                          type: "spring",
                          stiffness: 480,
                          damping: 40,
                        }}
                        className="absolute inset-0 rounded-2xl neu-control-active"
                      />
                    )}
                    <div className="relative z-10 flex items-center space-x-3">
                      <item.icon
                        size={item.id === "cleoai" ? 18 : 12}
                        opacity={
                          item.id === "cleoai" && activeTab !== "cleoai"
                            ? 0.5
                            : 1
                        }
                      />
                      {sidebarExpanded && (
                        <span className="whitespace-nowrap">{item.label}</span>
                      )}
                    </div>

                    {sidebarExpanded && activeTab === item.id && (
                      <FiChevronRight className="relative z-10 text-blue-500 dark:text-blue-400" />
                    )}
                  </motion.button>
                ))}

              {/* Coming soon items (shown in main nav but disabled with badge) */}
              {navItems
                .filter((item) => item.comingSoon)
                .map((item) => (
                  <motion.button
                    key={item.id}
                    data-tour={`nav-${item.id}`}
                    title={sidebarExpanded ? undefined : item.label}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-2xl transition-all duration-300 relative text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60 ${
                      sidebarExpanded ? "justify-between" : "justify-center"
                    }`}
                    disabled
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon
                        size={item.id === "cleoai" ? 18 : 12}
                        opacity={0.5}
                      />
                      {sidebarExpanded && (
                        <span className="whitespace-nowrap">{item.label}</span>
                      )}
                      {sidebarExpanded && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          COMING SOON
                        </span>
                      )}
                    </div>
                  </motion.button>
                ))}

              {/* Subheader for disabled items (only shown when there are data-dependent disabled items) */}
              {sidebarExpanded &&
                navItems.some((item) => item.disabled && !item.comingSoon) && (
                  <div className="pt-3 pb-1 px-4">
                    <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-600">
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
                    data-tour={`nav-${item.id}`}
                    title={sidebarExpanded ? undefined : item.label}
                    className={`w-full flex items-center px-3 py-3 text-left rounded-2xl transition-all duration-300 relative text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60 ${
                      sidebarExpanded ? "justify-between" : "justify-center"
                    }`}
                    disabled
                  >
                    <div className="flex items-center space-x-3">
                      <item.icon
                        size={item.id === "cleoai" ? 18 : 12}
                        opacity={0.5}
                      />
                      {sidebarExpanded && (
                        <span className="whitespace-nowrap">{item.label}</span>
                      )}
                    </div>
                  </motion.button>
                ))}
            </nav>

            {/* Fixed Bottom Section */}
            <div
              className={`sticky bottom-0 left-0 right-0 pt-2 ${
                sidebarExpanded ? "" : "hidden"
              }`}
            >
              <div className="space-y-2">
                {/* Neumorphic Action Card */}
                <motion.div
                  whileHover={{ y: -1, scale: 1.005 }}
                  whileTap={{ scale: 0.99 }}
                  className="p-2 rounded-xl neu-surface-sm backdrop-blur-md"
                >
                  <div className="flex flex-col space-y-1">
                    <Link
                      href="/mission"
                      target="_blank"
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                      className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
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
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-tight text-justify">
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
            className="flex-1 min-w-0 h-full overflow-y-auto overflow-x-clip"
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
                  <MyCoursesView
                    courses={courses}
                    hasData={hasData}
                    coursesLoading={coursesLoading}
                    user={user}
                    isBrandNew={isBrandNew}
                    onManualAdd={openManualEntry}
                    onReupload={() => setShowUpdateModal(true)}
                    onUploadSuccess={parseAndStoreCourses}
                    onDeleteCourse={async (course) => {
                      if (!user || !course?.id) return;
                      await deleteDoc(doc(db, "courses", course.id));
                      await fetchCourses();
                    }}
                    onToggleDistributional={async (courseId, dist) => {
                      await toggleDistributional(courseId, dist);
                    }}
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
                    className="w-full max-w-lg neu-surface backdrop-blur-sm p-8 rounded-2xl relative"
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
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Upload a new transcript to update your course history.
                      We'll only add new courses that aren't already in your
                      record.
                    </p>
                    <div className="mb-5 p-3 rounded-xl neu-inset">
                      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
                        How to get your transcript
                      </p>
                      <ol className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
                        <li>
                          1. Go to{" "}
                          <a
                            href="https://yub.yale.edu"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-pink-600 dark:text-pink-400 hover:underline underline-offset-2"
                          >
                            Yale Hub
                          </a>{" "}
                          and sign in
                        </li>
                        <li>
                          2. Go to{" "}
                          <span className="font-mono text-xs px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-200">
                            Academics
                          </span>{" "}
                          →{" "}
                          <span className="font-mono text-xs px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-200">
                            Unofficial Transcript
                          </span>
                        </li>
                        <li>
                          3. Click{" "}
                          <span className="font-medium text-blue-600 dark:text-blue-300">
                            Print
                          </span>
                          , save as PDF, and upload it below
                        </li>
                      </ol>
                    </div>
                    <FileUpload onSuccess={parseAndStoreCourses} />
                  </motion.div>
                </motion.div>
              )}

              {/* Manual Course Entry Modal */}
              <ManualCourseEntryModal
                isOpen={showManualEntryModal}
                onClose={() => {
                  setShowManualEntryModal(false);
                  setManualEntryPreselectSemester(undefined);
                }}
                onSubmit={handleManualCourseEntry}
                userId={user?.uid || ""}
                initialSemester={manualEntryPreselectSemester}
              />

              {activeTab === "stats" && (
                <motion.div
                  key="stats"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-4">
                    <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
                      Numbers aren't everything, but they're important.
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Here's a comprehensive visual overview of your academic
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
                      <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
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
                                  : "bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                              }`}
                            >
                              {major} - {MAJORS[major] || major}
                            </button>
                          ))}

                          {/* Shared Courses Indicator */}
                          {(() => {
                            const {
                              courses: sharedCourses,
                              totalCredits,
                              overriddenCredits,
                            } = getSharedCourses(userProfile, courses);
                            const isWarning = totalCredits > 2;
                            const hasShared = sharedCourses.length > 0;
                            const overrideCount = sharedCourses.filter(
                              (c) => c.isPrereqOverride,
                            ).length;

                            return (
                              <div
                                ref={sharedCoursesRef}
                                data-tour="major-shared-courses"
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
                                      ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-400/60 dark:border-amber-600/40 hover:border-amber-500/60"
                                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-400/60 dark:border-emerald-600/40 hover:border-emerald-500/60"
                                  }`}
                                >
                                  {isWarning ? (
                                    <FiAlertTriangle size={12} />
                                  ) : (
                                    <FiCheck size={12} />
                                  )}
                                  <span>
                                    {totalCredits > 0
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
                                      className="absolute top-full left-0 mt-2 z-50 w-80 max-h-80 overflow-y-auto rounded-xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700/50 shadow-[0_8px_32px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] p-3"
                                    >
                                      <div className="flex items-center justify-between mb-2">
                                        <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                          Double Major Conflict Manager
                                        </h4>
                                        <button
                                          onClick={() =>
                                            setShowSharedCoursesDropdown(false)
                                          }
                                          className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                        >
                                          <FiX size={14} />
                                        </button>
                                      </div>

                                      {!hasShared ? (
                                        <div className="text-center py-4">
                                          <FiCheck
                                            className="mx-auto text-emerald-600 dark:text-emerald-400 mb-2"
                                            size={24}
                                          />
                                          <p className="text-sm text-emerald-600 dark:text-emerald-300 font-medium">
                                            All clear!
                                          </p>
                                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                            No courses are counting toward
                                            multiple majors.
                                          </p>
                                        </div>
                                      ) : (
                                        <>
                                          <div
                                            className={`text-xs mb-3 p-2 rounded-lg ${
                                              isWarning
                                                ? "bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/30"
                                                : "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/30"
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
                                                allowed. Do check with both
                                                DUSs!
                                              </>
                                            )}
                                          </div>
                                          <p className="text-[10px] text-gray-400 dark:text-gray-600 mb-3 italic">
                                            Prerequisites don&apos;t count toward
                                            the 2-credit overlap limit, but Yale
                                            isn&apos;t always clear about which
                                            courses are prereqs. If you know one
                                            is, mark it below to exempt it from
                                            the warning.
                                          </p>
                                          {overrideCount > 0 && (
                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mb-3 -mt-1.5">
                                              {overriddenCredits} cr
                                              {overriddenCredits !== 1
                                                ? "s"
                                                : ""}{" "}
                                              waived as prerequisite
                                              {overrideCount !== 1
                                                ? "s"
                                                : ""}
                                              .
                                            </p>
                                          )}

                                          <div className="space-y-2">
                                            {sharedCourses.map((course, idx) => {
                                              const showPrereqHeader =
                                                course.isPrereqOverride &&
                                                (idx === 0 ||
                                                  !sharedCourses[idx - 1]
                                                    .isPrereqOverride);
                                              return (
                                                <div key={course.code}>
                                                  {showPrereqHeader && (
                                                    <div className="flex items-center gap-2 pt-1 pb-1.5">
                                                      <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                                                        Marked as prerequisites
                                                      </span>
                                                      <div className="flex-1 h-px bg-emerald-300/50 dark:bg-emerald-700/30" />
                                                    </div>
                                                  )}
                                                  <div
                                                    className={`p-2 rounded-lg border transition-all ${
                                                      course.isPrereqOverride
                                                        ? "bg-emerald-50/60 dark:bg-emerald-900/10 border-emerald-300/60 dark:border-emerald-700/30"
                                                        : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700/30"
                                                    }`}
                                                  >
                                                <div className="flex items-center justify-between mb-1">
                                                  <span
                                                    className={`text-sm font-medium ${
                                                      course.isPrereqOverride
                                                        ? "text-gray-500 dark:text-gray-400 line-through"
                                                        : "text-gray-800 dark:text-gray-200"
                                                    }`}
                                                  >
                                                    {course.code}
                                                  </span>
                                                  <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                    {course.credits} cr
                                                  </span>
                                                </div>
                                                <div className="space-y-1">
                                                  {course.majors.map((m) => (
                                                    <div
                                                      key={m.majorId}
                                                      className="text-[11px]"
                                                    >
                                                      <span className="text-purple-600 dark:text-purple-300">
                                                        {m.majorName}:
                                                      </span>{" "}
                                                      <span className="text-gray-500 dark:text-gray-400">
                                                        {m.requirements.join(
                                                          ", ",
                                                        ) || "General"}
                                                      </span>
                                                    </div>
                                                  ))}
                                                </div>
                                                <button
                                                  onClick={() =>
                                                    handleTogglePrereqOverride(
                                                      course.code,
                                                    )
                                                  }
                                                  className={`mt-2 w-full flex items-center justify-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium border transition-all ${
                                                    course.isPrereqOverride
                                                      ? "border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                                                      : "border-emerald-400/60 dark:border-emerald-600/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                                                  }`}
                                                >
                                                  {course.isPrereqOverride ? (
                                                    <>
                                                      <FiX size={11} />
                                                      Unmark prerequisite
                                                    </>
                                                  ) : (
                                                    <>
                                                      <FiCheck size={11} />
                                                      Mark as prerequisite
                                                    </>
                                                  )}
                                                </button>
                                                  </div>
                                                </div>
                                              );
                                            })}
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
                  {getMajorProgress() ? (
                    <MajorProgressView
                      selectedMajor={selectedMajor}
                      progress={getMajorProgress()!}
                      onRequirementChange={fetchCourses}
                      courses={courses}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <p className="text-gray-500 dark:text-gray-400 text-lg">
                        {!selectedMajor
                          ? "Please select a major to view your progress."
                          : "Loading your major progress..."}
                      </p>
                    </div>
                  )}
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

      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        courses={courses}
        selectedMajor={selectedMajor}
        hasData={hasData}
        onNavigate={handleTabChange}
        onImportTranscript={() => {
          handleTabChange("upload");
          if (hasData) setShowUpdateModal(true);
        }}
        onManualAdd={() => setShowManualEntryModal(true)}
        onToggleTheme={toggleTheme}
      />

      <V3WelcomeModal
        open={welcomeOpen}
        onClose={() => {
          setWelcomeOpen(false);
          if (user) void setUserFlag(user.uid, "hasSeenV3Welcome");
        }}
        onStartTour={() => {
          setWelcomeOpen(false);
          if (user) void setUserFlag(user.uid, "hasSeenV3Welcome");
          setTourOpen(true);
        }}
      />

      <AppTour
        open={tourOpen}
        onClose={() => {
          setTourOpen(false);
          if (user) void setUserFlag(user.uid, "hasSeenTutorial");
        }}
        onComplete={() => {
          if (user) void setUserFlag(user.uid, "hasSeenTutorial");
        }}
        onNavigate={(tabId) => handleTabChange(tabId)}
      />
    </main>
  );
}
