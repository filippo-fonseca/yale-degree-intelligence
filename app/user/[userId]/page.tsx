"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { db, auth } from "@/config/firebase";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Course,
  FriendsProfileVisibility,
  FriendsPublicData,
  PublicCourse,
  resolveFriendsProfileVisibility,
} from "@/lib/types";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { FiArrowLeft } from "react-icons/fi";
import Link from "next/link";
import { PublicProfileView } from "@/components/FriendsProfile";
import { ShinyButton } from "@/components/ui/shiny-button";
import CustomLoader from "@/components/ui/CustomLoader";

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

function publicCourseToCourse(
  c: PublicCourse,
  userId: string,
  idx: number,
): Course {
  return {
    id: `public-${idx}`,
    code: c.code,
    semester: c.semester,
    year: c.year,
    credits: c.credits,
    status: c.status,
    grade: null,
    userId,
    skipped: c.skipped || c.status === "skipped",
    manualRequirementsFulfilled: c.manualRequirementsFulfilled,
    distributionals: c.distributionals,
  };
}

export default function UserProfilePage() {
  const { userId } = useParams();
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [visibility, setVisibility] = useState<FriendsProfileVisibility>(
    resolveFriendsProfileVisibility(),
  );
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
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

        if (isOwn) {
          const userDoc = await getDoc(doc(db, "users", userId as string));
          if (!userDoc.exists()) {
            throw new Error("User not found");
          }
          const profileData = userDoc.data() as UserProfile;
          setUserProfile(profileData);

          const coursesSnapshot = await getDocs(
            query(collection(db, "courses"), where("userId", "==", userId)),
          );
          const coursesData = coursesSnapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Course[];
          setCourses(coursesData);

          const publicDataDoc = await getDoc(
            doc(db, "friends_public_data", userId as string),
          );
          if (publicDataDoc.exists()) {
            const publicData = publicDataDoc.data() as FriendsPublicData;
            setVisibility(resolveFriendsProfileVisibility(publicData.visibility));
          } else {
            setVisibility(resolveFriendsProfileVisibility());
          }
        } else {
          // Never read users/{otherId} — profiles are owner-only in Firestore.
          // Friend-facing fields live only in friends_public_data.
          await syncFriendData(userId as string);

          const publicDataDoc = await getDoc(
            doc(db, "friends_public_data", userId as string),
          );

          if (!publicDataDoc.exists() || !publicDataDoc.data().enabled) {
            setFriendsFeatureDisabled(true);
            setCourses([]);
            setVisibility(resolveFriendsProfileVisibility());
            setUserProfile(null);
          } else {
            const publicData = publicDataDoc.data() as FriendsPublicData;
            setVisibility(resolveFriendsProfileVisibility(publicData.visibility));

            const publicCourses = (publicData.courses || []).map((c, idx) =>
              publicCourseToCourse(c, userId as string, idx),
            );
            setCourses(publicCourses);

            setUserProfile({
              displayName: publicData.displayName,
              photoURL: publicData.photoURL,
              majors: publicData.majors || [],
              graduationYear: publicData.graduationYear,
              bio: publicData.bio,
            });
          }
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      } finally {
        setLoading(false);
      }
    };

    if (hasPermission) {
      fetchUserData();
    }
  }, [userId, user, hasPermission]);

  useEffect(() => {
    if (authLoading || !user) {
      setPermissionChecked(false);
      return;
    }

    let cancelled = false;
    setPermissionChecked(false);

    const checkFriend = async () => {
      let allowed = false;
      try {
        if (user.uid === userId) {
          allowed = true;
        } else {
          const friendsQ = query(
            collection(db, "friends"),
            where("users", "array-contains", user.uid),
          );
          const friendsSnap = await getDocs(friendsQ);
          friendsSnap.forEach((d) => {
            const users: string[] = d.data().users;
            if (users.includes(userId as string)) allowed = true;
          });
        }
      } catch {
        allowed = false;
      } finally {
        if (!cancelled) {
          setHasPermission(allowed);
          setPermissionChecked(true);
          if (!allowed) setLoading(false);
        }
      }
    };
    checkFriend();

    return () => {
      cancelled = true;
    };
  }, [user, userId, authLoading]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0b]">
        <CustomLoader fullScreen={false} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-6 font-louize dark:bg-[#0a0a0b]">
        <h1 className="text-center text-[1.6rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
          Sign in to view profiles.
        </h1>
        <p className="mt-3 max-w-[46ch] text-center font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Student pages are visible to signed-in Yale accounts, and only to
          friends the student has accepted.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5 font-sf">
          <ShinyButton size="md" withArrow href="/login">
            Sign in
          </ShinyButton>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 font-sf text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white"
          >
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  if (user && !permissionChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa] dark:bg-[#0a0a0b]">
        <CustomLoader fullScreen={false} />
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#fafafa] px-6 font-louize dark:bg-[#0a0a0b]">
        <h1 className="text-center text-[1.6rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
          You&apos;re not friends with this person yet.
        </h1>
        <p className="mt-3 max-w-[46ch] text-center font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          Pages are visible to accepted friends only. Send them a request from
          the Friends tab and their page opens as soon as they accept.
        </p>
        <div className="mt-6 font-sf">
          <ShinyButton size="md" withArrow href="/">
            Go to dashboard
          </ShinyButton>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 text-gray-100 font-louize">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950/20 to-purple-950/20" />
      </div>

      <div className="relative max-w-4xl mx-auto px-6 py-12">
        <button
          onClick={() => router.push("/")}
          className="mb-6 inline-flex items-center gap-2 text-sm text-pink-500 hover:text-pink-300 transition hover:underline"
        >
          <FiArrowLeft />
          Back to the platform
        </button>

        <header className="flex flex-col items-center mb-10">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <CompoundLogo />
          </motion.div>
        </header>

        {loading || !userProfile ? (
          <div className="flex justify-center py-16">
            <CustomLoader fullScreen={false} />
          </div>
        ) : (
          <PublicProfileView
            profile={{
              displayName: userProfile.displayName,
              email: userProfile.email,
              photoURL: userProfile.photoURL,
              majors: userProfile.majors || [],
              graduationYear: userProfile.graduationYear,
              bio: userProfile.bio,
            }}
            courses={courses}
            visibility={visibility}
            isOwnProfile={isOwnProfile}
            friendsFeatureDisabled={friendsFeatureDisabled && !isOwnProfile}
          />
        )}

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
