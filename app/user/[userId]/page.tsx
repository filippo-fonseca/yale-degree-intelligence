"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { getFullMajorNameById } from "@/lib/majors";
import { db, auth } from "@/config/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { Course, FriendsPublicData, PublicCourse } from "@/lib/types";
import { FiBook, FiCreditCard, FiLock } from "react-icons/fi";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { gradePoints } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { truncate } from "@/lib/utils/utils";
import { YearBadge } from "@/components/ui/YearBadge";

/**
 * Triggers a sync of the target user's friends_public_data with their actual courses.
 * This ensures friends always see up-to-date data including manual adds and skips.
 */
async function syncFriendData(targetUserId: string): Promise<void> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const token = await currentUser.getIdToken();
    await fetch("/api/sync-friend-data", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ targetUserId }),
    });
  } catch (error) {
    // Silently fail - this is a background optimization
    console.error("Failed to sync friend data:", error);
  }
}

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
  const [friendsFeatureDisabled, setFriendsFeatureDisabled] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setLoading(true);
        setFriendsFeatureDisabled(false);

        const isOwn = user.uid === userId;
        setIsOwnProfile(isOwn);

        // Fetch user profile from Firestore
        const userDoc = await getDoc(doc(db, "users", userId as string));
        if (!userDoc.exists()) {
          throw new Error("User not found");
        }
        const profileData = userDoc.data() as UserProfile;
        setUserProfile(profileData);

        if (isOwn) {
          // Own profile: fetch from courses collection (with grades)
          // Keep ALL courses including skipped ones for progress calculation
          const coursesSnapshot = await getDocs(
            query(collection(db, "courses"), where("userId", "==", userId))
          );
          const coursesData = coursesSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Course[];
          setCourses(coursesData);
        } else {
          // Friend's profile: first sync their data, then fetch
          // This ensures we see the latest data including manual adds and skips
          await syncFriendData(userId as string);

          const publicDataDoc = await getDoc(
            doc(db, "friends_public_data", userId as string)
          );

          if (!publicDataDoc.exists() || !publicDataDoc.data().enabled) {
            // Friend hasn't enabled the feature
            setFriendsFeatureDisabled(true);
            setCourses([]);
          } else {
            const publicData = publicDataDoc.data() as FriendsPublicData;

            // Convert PublicCourse[] to Course[] (grade will be null)
            // Keep ALL courses including skipped ones for progress calculation
            const publicCourses: Course[] = (publicData.courses || []).map(
              (c: PublicCourse, idx: number) => ({
                id: `public-${idx}`,
                code: c.code,
                semester: c.semester,
                year: c.year,
                credits: c.credits,
                status: c.status,
                grade: null, // NEVER expose grades
                userId: userId as string,
                skipped: c.skipped || c.status === "skipped", // Include skipped flag
                manualRequirementsFulfilled: c.manualRequirementsFulfilled,
              })
            );

            setCourses(publicCourses);
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
        setError("Failed to load user profile");
      } finally {
        setLoading(false);
      }
    };

    if (hasPermission) {
      fetchUserData();
    }
  }, [userId, user, hasPermission]);

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
    // Include both completed and skipped courses (skipped = got credit elsewhere like AP)
    return courses
      .filter((c) => c.status === "completed" || c.skipped)
      .reduce((sum, course) => sum + (course.credits || 0), 0);
  };

  const getCompletedCoursesCount = () => {
    // Include both completed and skipped courses for the count
    return courses.filter((c) => c.status === "completed" || c.skipped).length;
  };

  const getGPAColor = (grade: string) => {
    if (!gradePoints[grade]) return "text-gray-400";
    const gpa = gradePoints[grade];
    if (gpa >= 4.0) return "text-purple-400";
    if (gpa >= 3.0) return "text-blue-400";
    if (gpa >= 2.0) return "text-yellow-400";
    return "text-red-400";
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
          Oop. You're not friends with this person on DegreeIntelligence.
        </div>
        <div className="text-gray-400 text-center max-w-md">
          You must be friends with this user to view their profile. Try sending
          them a friend request in the "Friends" tab.
        </div>
        <Link
          href="/"
          className="mt-6 px-4 py-2 text-sm font-semibold border-2 border-pink-500 hover:bg-pink-700 text-white rounded-lg transition"
        >
          Go to dashboard
        </Link>
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
          className="mb-6 inline-flex items-center gap-2 text-sm text-pink-500 hover:text-pink-300 transition hover:underline"
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

              {userProfile?.majors && userProfile.majors.length > 0 && (
                <p className="text-sm text-gray-400 mt-1">
                  {truncate(
                    userProfile.majors
                      .map((m) => getFullMajorNameById(m) || m)
                      .join(", "),
                    70
                  )}
                </p>
              )}

              {userProfile?.graduationYear && (
                <div className="mt-2">
                  <YearBadge graduationYear={userProfile.graduationYear} />
                </div>
              )}

              {userProfile?.bio && (
                <div className="mt-6 w-full">
                  <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                    <p className="text-gray-300">
                      {userProfile?.bio || "Yale student."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </header>

        {/* Friends Feature Disabled Notice */}
        {friendsFeatureDisabled && !isOwnProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-8 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 text-center"
          >
            <div className="flex justify-center mb-4">
              <div className="p-3 rounded-full bg-gray-800/50 border border-gray-700">
                <FiLock className="text-gray-400 w-8 h-8" />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-300 mb-2">
              Course Data Hidden
            </h3>
            <p className="text-gray-500 max-w-md mx-auto">
              This user hasn't enabled course sharing yet. They can turn it on
              in their settings to share their courses with friends.
            </p>
          </motion.div>
        )}

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
                    {getCompletedCoursesCount()}
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

        {/* Course Timeline Section */}
        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mb-12"
        >
          <h2 className="text-xl font-medium mb-6 text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
            Academic Journey
          </h2>
          {courses.length == 0 && <p>No courses taken or in progress.</p>}

          <div className="space-y-12">
            {Array.from(
              new Set(
                courses
                  .map((c) => c.year)
                  .filter((y): y is number => y !== undefined)
              )
            )
              .sort((a, b) => a - b)
              .map((year) => {
                const yearCourses = courses.filter((c) => c.year === year);
                const semesters = Array.from(
                  new Set(yearCourses.map((c) => c.semester))
                )
                  .filter((s): s is string => s !== undefined)
                  .sort((a, b) => {
                    // Sort semesters in chronological order
                    const order: Record<string, number> = {
                      Spring: 0,
                      Summer: 1,
                      Fall: 2,
                    };
                    return (order[a] || 0) - (order[b] || 0);
                  });

                return (
                  <motion.div
                    key={year}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 overflow-hidden"
                  >
                    <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900/70 to-gray-900/30">
                      <h3 className="text-lg font-medium text-blue-200">
                        Year {year}
                      </h3>
                    </div>

                    <div className="divide-y divide-gray-800">
                      {semesters.map((semester) => {
                        const semesterCourses = yearCourses.filter(
                          (c) => c.semester === semester
                        );
                        const semesterCredits = semesterCourses.reduce(
                          (sum: number, c) => sum + (c.credits || 0),
                          0
                        );

                        return (
                          <div key={`${year}-${semester}`} className="p-6">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="font-medium text-gray-300">
                                {semester} {year}
                              </h4>
                              <span className="text-sm text-gray-500">
                                {semesterCredits} credit
                                {semesterCredits !== 1 ? "s" : ""}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              {semesterCourses.map((course) => (
                                <motion.div
                                  key={course.id}
                                  whileHover={{ y: -2 }}
                                  className={`p-4 rounded-lg ${
                                    course.status === "completed" &&
                                    !course.skipped
                                      ? "bg-emerald-900/10 border-emerald-800/50"
                                      : course.status === "in-progress"
                                        ? "bg-purple-900/10 border-purple-800/50"
                                        : "bg-gray-800/10 border-gray-700/50"
                                  } border`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h5 className="font-medium">
                                        {course.code}
                                        {course.skipped && (
                                          <span className="ml-2 text-xs text-gray-500">
                                            (skipped)
                                          </span>
                                        )}
                                      </h5>
                                      <p className="text-sm text-gray-400">
                                        {truncate(
                                          getCourseNameFromCode(course.code) ||
                                            "Course",
                                          50
                                        )}
                                      </p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      {/* {course.grade && (
                                        <span
                                          className={`text-sm font-medium ${
                                            course.status === "completed"
                                              ? getGPAColor(course.grade)
                                              : "text-gray-400"
                                          }`}
                                        >
                                          {course.grade}
                                        </span>
                                      )} */}
                                      <span className="text-xs text-gray-500">
                                        {course.credits} cr
                                      </span>
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}

            {/* Courses without year/semester */}
            {courses.filter((c) => !c.year || !c.semester).length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 overflow-hidden"
              >
                <div className="p-6 border-b border-gray-800 bg-gradient-to-r from-gray-900/70 to-gray-900/30">
                  <h3 className="text-lg font-medium text-blue-200">
                    Other Courses
                  </h3>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {courses
                      .filter((c) => !c.year || !c.semester)
                      .map((course) => (
                        <motion.div
                          key={course.id}
                          whileHover={{ y: -2 }}
                          className={`p-4 rounded-lg ${
                            course.status === "completed" && !course.skipped
                              ? "bg-emerald-900/10 border-emerald-800/50"
                              : course.status === "in-progress"
                                ? "bg-purple-900/10 border-purple-800/50"
                                : "bg-gray-800/10 border-gray-700/50"
                          } border`}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-medium">
                                {course.code}
                                {course.skipped && (
                                  <span className="ml-2 text-xs text-gray-500">
                                    (skipped)
                                  </span>
                                )}
                              </h5>
                              <p className="text-sm text-gray-400">
                                {getCourseNameFromCode(course.code) || "Course"}
                              </p>
                            </div>
                            <div className="flex flex-col items-end">
                              {course.grade && (
                                <span
                                  className={`text-sm font-medium ${
                                    course.status === "completed"
                                      ? getGPAColor(course.grade)
                                      : "text-gray-400"
                                  }`}
                                >
                                  {course.grade}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {course.credits} cr
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
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
