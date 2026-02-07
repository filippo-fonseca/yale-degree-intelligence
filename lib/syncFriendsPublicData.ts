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
 * Syncs course data (without grades) to friends_public_data collection.
 * Only runs if the user has enabled the friends feature.
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

    // Build public courses array (NO GRADES - this is critical for privacy)
    const publicCourses: PublicCourse[] = courses
      .filter((c) => !c.skipped)
      .map((c) => ({
        code: c.code,
        semester: c.semester,
        year: c.year,
        credits: c.credits,
        status: c.status === "not-taken" ? "completed" : c.status,
        manualRequirementsFulfilled: c.manualRequirementsFulfilled,
      }));

    // Update the public data document
    await setDoc(doc(db, "friends_public_data", userId), {
      userId,
      enabled: true,
      enabledAt: publicDataDoc.data().enabledAt,
      updatedAt: serverTimestamp(),
      displayName: user.displayName || null,
      email: user.email || null,
      photoURL: user.photoURL || null,
      majors: userProfile?.majors || [],
      graduationYear: userProfile?.graduationYear || null,
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
  const publicCourses: PublicCourse[] = courses
    .filter((c) => !c.skipped)
    .map((c) => ({
      code: c.code,
      semester: c.semester,
      year: c.year,
      credits: c.credits,
      status: c.status === "not-taken" ? "completed" : c.status,
      manualRequirementsFulfilled: c.manualRequirementsFulfilled,
    }));

  await setDoc(doc(db, "friends_public_data", userId), {
    userId,
    enabled: true,
    enabledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    displayName: user.displayName || null,
    email: user.email || null,
    photoURL: user.photoURL || null,
    majors: userProfile?.majors || [],
    graduationYear: userProfile?.graduationYear || null,
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
