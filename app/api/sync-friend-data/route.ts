import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import { requireAuth, isAuthError, rateLimit } from "@/lib/apiAuth";
import { syncFriendsPublicDataFor } from "@/lib/server/friendsPublicSync";

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

    const limited = await rateLimit(
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

    const result = await syncFriendsPublicDataFor(adminDb, targetUserId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Error syncing friend data:", error);
    return NextResponse.json(
      { error: "Failed to sync friend data" },
      { status: 500 }
    );
  }
}
