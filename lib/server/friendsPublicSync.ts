import { FieldValue, type Firestore } from "firebase-admin/firestore";
import {
  effectiveDistributionals,
  hasStoredDistributionals,
} from "@/lib/utils/effectiveDistributionals";

/**
 * Server-side refresh of a student's friend-facing projection
 * (friends_public_data and friends_directory) from their real courses and
 * profile. Grades never leave /courses: the projection is built field by field.
 *
 * Lifted out of /api/sync-friend-data so writes that happen on the server
 * (the MCP tools) can keep a public profile current the same way the browser
 * does after its own writes.
 */

export interface PublicCourse {
  code: string;
  semester: string;
  year: number;
  credits: number;
  status: "completed" | "in-progress" | "skipped";
  skipped?: boolean;
  manualRequirementsFulfilled?: { major_id: string; requirement_title: string }[];
  distributionals?: string[];
}

/**
 * Publish the four fields Friends search reads, into the collection search
 * actually subscribes to. Kept deliberately narrow: no bio, no courses. See
 * lib/friendsDirectory.ts for why the split exists.
 */
async function syncDirectoryEntry(
  db: Firestore,
  userId: string,
  entry: {
    displayName: string | null;
    photoURL: string | null;
    majors: string[];
    graduationYear: number | null;
  },
) {
  const next = {
    userId,
    enabled: true,
    displayName: entry.displayName,
    photoURL: entry.photoURL,
    majors: entry.majors,
    graduationYear: entry.graduationYear,
  };
  const ref = db.collection("friends_directory").doc(userId);
  const existing = await ref.get();
  const current = existing.data();
  const unchanged =
    current?.enabled === true &&
    current?.displayName === next.displayName &&
    current?.photoURL === next.photoURL &&
    current?.graduationYear === next.graduationYear &&
    JSON.stringify(current?.majors ?? []) === JSON.stringify(next.majors);
  if (unchanged) return;
  await ref.set({ ...next, updatedAt: FieldValue.serverTimestamp() });
}

export type FriendsSyncResult = {
  synced: boolean;
  reason?: string;
  coursesCount?: number;
};

/** Rebuilds userId's projection when their friends feature is on. */
export async function syncFriendsPublicDataFor(
  db: Firestore,
  userId: string,
): Promise<FriendsSyncResult> {
  // Check if target user has friends feature enabled
  const publicDataDoc = await db
    .collection("friends_public_data")
    .doc(userId)
    .get();

  if (!publicDataDoc.exists || !publicDataDoc.data()?.enabled) {
    return { synced: false, reason: "Friends feature not enabled" };
  }

  // Fetch target user's actual courses
  const coursesSnapshot = await db
    .collection("courses")
    .where("userId", "==", userId)
    .get();

  const courses = coursesSnapshot.docs.map((doc) => doc.data());

  // Build public courses array (NO GRADES)
  // Include ALL courses including skipped ones (they count toward requirements)
  const publicCourses: PublicCourse[] = courses.map((c) => {
    const course: PublicCourse = {
      code: c.code,
      semester: c.semester,
      year: c.year,
      credits: c.credits,
      status: c.skipped ? "skipped" : (c.status === "not-taken" ? "completed" : c.status),
      skipped: c.skipped || false,
    };
    if (c.manualRequirementsFulfilled?.length) {
      course.manualRequirementsFulfilled = c.manualRequirementsFulfilled;
    }
    // Friends see the same effective tags the owner does, catalog defaults
    // included. Omitting the key means "nobody has said anything", so the
    // reader can fall back to the catalog itself; an explicit empty array
    // means the owner cleared every tag and must not be overridden.
    const tagged = { code: c.code as string, distributionals: c.distributionals };
    const dists = effectiveDistributionals(tagged);
    if (dists.length > 0) {
      course.distributionals = dists;
    } else if (hasStoredDistributionals(tagged)) {
      course.distributionals = [];
    }
    return course;
  });

  // Fetch target user's profile for majors, etc.
  const userDoc = await db.collection("users").doc(userId).get();
  const userProfile = userDoc.exists ? userDoc.data() : null;

  // Get existing public data for comparison
  const existingData = publicDataDoc.data();
  const existingCourses = (existingData?.courses || []) as PublicCourse[];

  // Compare courses to see if update is needed
  const coursesChanged = !coursesAreEqual(existingCourses, publicCourses);
  const profileChanged =
    JSON.stringify(existingData?.majors || []) !==
      JSON.stringify(userProfile?.majors || []) ||
    existingData?.graduationYear !== (userProfile?.graduationYear || null) ||
    existingData?.bio !== (userProfile?.bio || null);

  // The directory entry is a separate document, so it is reconciled whether
  // or not the content doc changed: this route runs whenever a friend opens
  // your page, which makes it the repair path for accounts whose entry
  // predates the collection.
  await syncDirectoryEntry(db, userId, {
    displayName: existingData?.displayName ?? userProfile?.displayName ?? null,
    photoURL: existingData?.photoURL ?? userProfile?.photoURL ?? null,
    majors: userProfile?.majors || [],
    graduationYear: userProfile?.graduationYear ?? null,
  });

  if (!coursesChanged && !profileChanged) {
    return { synced: false, reason: "Data unchanged" };
  }

  // Update friends_public_data
  await db
    .collection("friends_public_data")
    .doc(userId)
    .update({
      courses: publicCourses,
      majors: userProfile?.majors || [],
      graduationYear: userProfile?.graduationYear || null,
      bio: userProfile?.bio || null,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return { synced: true, coursesCount: publicCourses.length };
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
    const existingManual = JSON.stringify(
      existing.manualRequirementsFulfilled || []
    );
    const newManual = JSON.stringify(
      newCourse.manualRequirementsFulfilled || []
    );
    if (existingManual !== newManual) return false;
    const existingDists = JSON.stringify(
      [...(existing.distributionals || [])].sort()
    );
    const newDists = JSON.stringify(
      [...(newCourse.distributionals || [])].sort()
    );
    if (existingDists !== newDists) return false;
  }

  return true;
}
