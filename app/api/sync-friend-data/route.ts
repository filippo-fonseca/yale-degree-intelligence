import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import { requireAuth, isAuthError, rateLimit } from "@/lib/apiAuth";
import { FieldValue } from "firebase-admin/firestore";
import {
  effectiveDistributionals,
  hasStoredDistributionals,
} from "@/lib/utils/effectiveDistributionals";

interface PublicCourse {
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
 * API endpoint to sync a user's friends_public_data with their actual courses.
 * Called when someone views a friend's profile to ensure data is up-to-date.
 */
export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const user = await requireAuth(req);
    if (isAuthError(user)) return user;
    const callerId = user.uid;

    // Get the target user ID from request body
    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json(
        { error: "targetUserId is required" },
        { status: 400 }
      );
    }

    const limited = rateLimit(
      `sync-friend:${callerId}:${targetUserId}`,
      30,
      60 * 60 * 1000
    );
    if (limited) return limited;

    // Allow syncing own data or friend's data
    if (callerId !== targetUserId) {
      // Verify caller is a friend of the target user
      const friendsSnapshot = await adminDb
        .collection("friends")
        .where("users", "array-contains", callerId)
        .get();

      let isFriend = false;
      friendsSnapshot.docs.forEach((doc) => {
        const users: string[] = doc.data().users;
        if (users.includes(targetUserId)) {
          isFriend = true;
        }
      });

      if (!isFriend) {
        return NextResponse.json(
          { error: "Not authorized to sync this user's data" },
          { status: 403 }
        );
      }
    }

    // Check if target user has friends feature enabled
    const publicDataDoc = await adminDb
      .collection("friends_public_data")
      .doc(targetUserId)
      .get();

    if (!publicDataDoc.exists || !publicDataDoc.data()?.enabled) {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: "Friends feature not enabled",
      });
    }

    // Fetch target user's actual courses
    const coursesSnapshot = await adminDb
      .collection("courses")
      .where("userId", "==", targetUserId)
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
    const userDoc = await adminDb.collection("users").doc(targetUserId).get();
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

    if (!coursesChanged && !profileChanged) {
      return NextResponse.json({
        success: true,
        synced: false,
        reason: "Data unchanged",
      });
    }

    // Update friends_public_data
    await adminDb
      .collection("friends_public_data")
      .doc(targetUserId)
      .update({
        courses: publicCourses,
        majors: userProfile?.majors || [],
        graduationYear: userProfile?.graduationYear || null,
        bio: userProfile?.bio || null,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({
      success: true,
      synced: true,
      coursesCount: publicCourses.length,
    });
  } catch (error) {
    console.error("Error syncing friend data:", error);
    return NextResponse.json(
      { error: "Failed to sync friend data" },
      { status: 500 }
    );
  }
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
