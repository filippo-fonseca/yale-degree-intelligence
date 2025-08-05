// src/app/user/[userId]/page.tsx
"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { MAJORS } from "@/lib/majors";
import { calculateMajorProgress } from "@/lib/majors";
import { db } from "@/config/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Course } from "@/lib/types";
import { FiBook, FiCreditCard } from "react-icons/fi";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { gradePoints } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";

interface UserProfile {
  displayName?: string;
  email?: string;
  photoURL?: string;
  majors: string[];
  graduationYear?: number;
  bio?: string;
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);

        // Fetch user profile from Firestore (assuming you store email and photoURL here)
        const userDoc = await getDoc(doc(db, "users", userId as string));
        if (!userDoc.exists()) {
          throw new Error("User not found");
        }
        const profileData = userDoc.data() as UserProfile;
        setUserProfile(profileData);

        // Fetch user courses
        const coursesSnapshot = await getDocs(
          query(collection(db, "courses"), where("userId", "==", userId))
        );
        const coursesData = coursesSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Course[];
        setCourses(coursesData);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  const getMajorProgress = (major: string) => {
    if (!courses.length) return null;

    const completedCourseCodes = courses
      .filter(
        (course) =>
          (course.status === "completed" &&
            course.grade !== null &&
            course.grade !== "In Progress") ||
          course.skipped
      )
      .map((course) => course.code);

    const inProgressCourseCodes = courses
      .filter((course) => course.grade === "In Progress" && !course.skipped)
      .map((course) => course.code);

    const skippedCourseCodes = courses
      .filter((course) => course.skipped)
      .map((course) => course.code);

    return calculateMajorProgress(
      major,
      completedCourseCodes,
      inProgressCourseCodes,
      skippedCourseCodes
    );
  };

  const getDisplayNameFromEmail = (email?: string) => {
    if (!email) return "Yale Student";
    if (email.endsWith("@yale.edu")) {
      const namePart = email.split("@")[0];
      const [firstName, lastName] = namePart.split(".");
      return `${firstName.charAt(0).toUpperCase() + firstName.slice(1)} ${
        lastName.charAt(0).toUpperCase() + lastName.slice(1)
      }`;
    }
    return email.split("@")[0];
  };

  const calculateTotalCredits = () => {
    return courses
      .filter((c) => c.status === "completed")
      .reduce((sum, course) => sum + (course.credits || 0), 0);
  };

  // 1. Permission check
  useEffect(() => {
    if (!user) return; // or handle not-logged-in edge case
    setAuthLoading(true);
    const checkFriend = async () => {
      try {
        // Allow viewing own profile
        if (user.uid === userId) {
          setHasPermission(true);
          return setAuthLoading(false);
        }
        // Check "friends" collection for mutual friendship
        const friendsQ = query(
          collection(db, "friends"),
          where("users", "array-contains", user.uid)
        );
        const friendsSnap = await getDocs(friendsQ);
        let allowed = false;
        friendsSnap.forEach((doc) => {
          const users: string[] = doc.data().users;
          if (users.includes(userId as string)) allowed = true;
        });
        setHasPermission(allowed);
      } catch {
        setHasPermission(false);
      } finally {
        setAuthLoading(false);
      }
    };
    checkFriend();
  }, [user, userId]);

  // 3. Early return logic
  if (!user || authLoading)
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading profile...</div>
      </div>
    );

  if (!hasPermission) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center">
        <div className="text-2xl font-semibold text-blue-300 mb-3">
          Private Profile
        </div>
        <div className="text-gray-400 text-center max-w-md">
          You must be friends with this user to view their profile. Try sending
          a friend request!
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-louize">
      {/* Background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950/20 to-purple-950/20"></div>
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-pink-500 hover:text-pink-300 transition"
        >
          <FiArrowLeft />
          Back to the platform
        </button>
        {/* Header */}
        <header className="flex flex-col items-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <CompoundLogo />
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-lg p-8 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
          >
            <div className="flex flex-col items-center text-center">
              <div className="relative mb-4">
                {userProfile?.photoURL ? (
                  <img
                    src={userProfile.photoURL}
                    alt={getDisplayNameFromEmail(userProfile.email)}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-700"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-4xl font-medium border-2 border-gray-700">
                    {getDisplayNameFromEmail(userProfile?.email)
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
              </div>

              <h1 className="text-2xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                {getDisplayNameFromEmail(userProfile?.email)}
              </h1>

              {userProfile?.graduationYear && (
                <p className="text-gray-400 mt-1">
                  Class of {userProfile.graduationYear}
                </p>
              )}

              <div className="mt-6 w-full">
                <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                  <p className="text-gray-300">
                    {userProfile?.bio ||
                      "This student hasn't written a bio yet."}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </header>

        {/* Stats Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mb-12"
        >
          <h2 className="text-xl font-medium mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
            Academic Overview
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-900/20 border border-blue-700/50">
                  <FiBook className="text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Courses Taken</p>
                  <p className="text-xl font-medium">
                    {courses.filter((c) => c.status === "completed").length}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-900/20 border border-purple-700/50">
                  <FiCreditCard className="text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Credits Completed</p>
                  <p className="text-xl font-medium">
                    {calculateTotalCredits()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.section>

        {/* Majors Section */}
        {userProfile?.majors && userProfile.majors.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-xl font-medium mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
              Major Progress
            </h2>

            <div className="space-y-8">
              {userProfile.majors.map((major, index) => {
                const progress = getMajorProgress(major);
                if (!progress) return null;

                const completionPercentage = progress.percentage;
                const completedCredits = progress.completedCredits;
                const totalCredits = progress.totalCredits;

                return (
                  <div
                    key={major}
                    className="p-6 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800"
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-lg font-medium">
                          {MAJORS[major] || major}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {completedCredits}/{totalCredits} credits completed
                        </p>
                      </div>
                      <div className="text-3xl font-medium text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                        {completionPercentage.toFixed(0)}%
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full bg-gray-900 rounded-full h-2 mb-4">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${completionPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-purple-500"
                      />
                    </div>

                    {/* Requirements summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                      <div className="p-4 rounded-lg bg-gray-800/30 border border-emerald-700/30">
                        <p className="text-sm text-emerald-300 mb-1">
                          Completed Requirements
                        </p>
                        <p className="text-lg">
                          {progress.completedRequirements.length} /{" "}
                          {progress.completedRequirements.length +
                            progress.remainingRequirements.length}
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-gray-800/30 border border-amber-700/30">
                        <p className="text-sm text-amber-300 mb-1">
                          Remaining Requirements
                        </p>
                        <p className="text-lg">
                          {progress.remainingRequirements.length}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.section>
        )}

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center text-gray-500 text-sm mt-12"
        >
          <p>Profile powered by Yale DegreeIntelligence.</p>
          <p className="mt-1">
            Not officially affiliated with Yale University. There can be
            mistakes.
          </p>
        </motion.footer>
      </div>
    </main>
  );
}
