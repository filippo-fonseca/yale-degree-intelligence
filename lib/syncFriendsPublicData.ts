import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  getDocs,
  collection,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import { Course, PublicCourse } from "@/lib/types";

interface UserProfile {
  majors: string[];
  graduationYear?: number;
  bio?: string;
}

interface UserInfo {
  displayName?: string | null;
  email?: string | null;
  photoURL?: string | null;
}

/**
 * Compares two PublicCourse arrays to check if they're equivalent.
 */
function coursesAreEqual(
  existingCourses: PublicCourse[],
  newCourses: PublicCourse[]
): boolean {
  if (existingCourses.length !== newCourses.length) return false;

  const existingMap = new Map<string, PublicCourse>();
  existingCourses.forEach((c) => {
    const key = `${c.code}-${c.semester}-${c.year}`;
    existingMap.set(key, c);
  });

  for (const newCourse of newCourses) {
    const key = `${newCourse.code}-${newCourse.semester}-${newCourse.year}`;
    const existing = existingMap.get(key);
    if (!existing) return false;
    if (existing.credits !== newCourse.credits) return false;
    if (existing.status !== newCourse.status) return false;
    if ((existing.skipped || false) !== (newCourse.skipped || false)) return false;
    const existingManual = JSON.stringify(existing.manualRequirementsFulfilled || []);
    const newManual = JSON.stringify(newCourse.manualRequirementsFulfilled || []);
    if (existingManual !== newManual) return false;
  }

  return true;
}

/**
 * Syncs course data (without grades) to friends_public_data collection.
 * Only runs if the user has enabled the friends feature.
 * Compares data first and skips update if unchanged.
 */
export async function syncFriendsPublicData(
  userId: string,
  courses: Course[],
  userProfile: UserProfile | null,
  user: UserInfo
): Promise<void> {
  try {
    // Check if friends feature is enabled
    const publicDataDoc = await getDoc(doc(db, "friends_public_data", userId));

    if (!publicDataDoc.exists() || !publicDataDoc.data().enabled) {
      // Friends feature not enabled, skip sync
      return;
    }

    const existingData = publicDataDoc.data();

    // Build public courses array (NO GRADES - this is critical for privacy)
    // Include ALL courses including skipped ones (they count toward requirements)
    // Filter out undefined values - Firebase doesn't allow them
    const publicCourses: PublicCourse[] = courses.map((c) => {
      const course: PublicCourse = {
        code: c.code || "",
        semester: c.semester || "",
        year: c.year || 0,
        credits: c.credits || 0,
        status: c.skipped ? "skipped" : (c.status === "not-taken" ? "completed" : c.status),
        skipped: c.skipped || false,
      };
      // Only include manualRequirementsFulfilled if it exists and is not empty
      if (c.manualRequirementsFulfilled && c.manualRequirementsFulfilled.length > 0) {
        course.manualRequirementsFulfilled = c.manualRequirementsFulfilled;
      }
      return course;
    });

    // Check if data has changed - skip update if unchanged
    const existingCourses = (existingData.courses || []) as PublicCourse[];
    if (
      coursesAreEqual(existingCourses, publicCourses) &&
      existingData.displayName === (user.displayName || null) &&
      JSON.stringify(existingData.majors || []) === JSON.stringify(userProfile?.majors || []) &&
      existingData.graduationYear === (userProfile?.graduationYear || null)
    ) {
      return; // Data unchanged, skip update
    }

    // Update the public data document
    await setDoc(doc(db, "friends_public_data", userId), {
      userId,
      enabled: true,
      enabledAt: existingData.enabledAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      displayName: user.displayName || null,
      email: user.email || null,
      photoURL: user.photoURL || null,
      majors: userProfile?.majors || [],
      graduationYear: userProfile?.graduationYear ?? null,
      bio: userProfile?.bio || null,
      courses: publicCourses,
    });
  } catch (error) {
    console.error("Error syncing friends public data:", error);
  }
}

/**
 * Enables the friends feature for a user and creates their public data.
 */
export async function enableFriendsFeature(
  userId: string,
  courses: Course[],
  userProfile: UserProfile | null,
  user: UserInfo
): Promise<void> {
  // Include ALL courses including skipped ones (they count toward requirements)
  // Filter out undefined values - Firebase doesn't allow them
  const publicCourses: PublicCourse[] = courses.map((c) => {
    const course: PublicCourse = {
      code: c.code || "",
      semester: c.semester || "",
      year: c.year || 0,
      credits: c.credits || 0,
      status: c.skipped ? "skipped" : (c.status === "not-taken" ? "completed" : c.status),
      skipped: c.skipped || false,
    };
    // Only include manualRequirementsFulfilled if it exists and is not empty
    if (c.manualRequirementsFulfilled && c.manualRequirementsFulfilled.length > 0) {
      course.manualRequirementsFulfilled = c.manualRequirementsFulfilled;
    }
    return course;
  });

  await setDoc(doc(db, "friends_public_data", userId), {
    userId,
    enabled: true,
    enabledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    displayName: user.displayName || null,
    email: user.email || null,
    photoURL: user.photoURL || null,
    majors: userProfile?.majors || [],
    graduationYear: userProfile?.graduationYear ?? null,
    bio: userProfile?.bio || null,
    courses: publicCourses,
  });
}

/**
 * Disables the friends feature for a user.
 * This completely resets to default state:
 * - Deletes friends_public_data document
 * - Removes all friendships
 * - Removes all friends_lookup entries
 * - Removes all friend requests (sent and received)
 */
export async function disableFriendsFeature(userId: string): Promise<void> {
  try {
    // 1. Delete friends_public_data document
    await deleteDoc(doc(db, "friends_public_data", userId));

    // 2. Get all friendships involving this user
    const friendsSnapshot = await getDocs(
      query(collection(db, "friends"), where("users", "array-contains", userId))
    );

    // 3. Delete friends_lookup entries and friends documents
    const deletePromises: Promise<void>[] = [];

    friendsSnapshot.forEach((friendDoc) => {
      const users = [...friendDoc.data().users].sort();
      const lookupId = `${users[0]}_${users[1]}`;

      // Delete the friends_lookup entry
      deletePromises.push(deleteDoc(doc(db, "friends_lookup", lookupId)));

      // Delete the friends document
      deletePromises.push(deleteDoc(doc(db, "friends", friendDoc.id)));
    });

    // 4. Delete all friend requests sent by this user
    const sentRequestsSnapshot = await getDocs(
      query(collection(db, "friend-requests"), where("from", "==", userId))
    );
    sentRequestsSnapshot.forEach((reqDoc) => {
      deletePromises.push(deleteDoc(doc(db, "friend-requests", reqDoc.id)));
    });

    // 5. Delete all friend requests received by this user
    const receivedRequestsSnapshot = await getDocs(
      query(collection(db, "friend-requests"), where("to", "==", userId))
    );
    receivedRequestsSnapshot.forEach((reqDoc) => {
      deletePromises.push(deleteDoc(doc(db, "friend-requests", reqDoc.id)));
    });

    await Promise.all(deletePromises);
  } catch (error) {
    console.error("Error disabling friends feature:", error);
    throw error;
  }
}
