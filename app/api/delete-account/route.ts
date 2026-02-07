import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify the token and get the user ID
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Delete all user data from Firestore collections

    // 1. Delete user profile from 'users' collection
    await adminDb.collection("users").doc(userId).delete();

    // 2. Delete all courses belonging to this user
    const coursesSnapshot = await adminDb
      .collection("courses")
      .where("userId", "==", userId)
      .get();
    const courseDeletes = coursesSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(courseDeletes);

    // 3. Delete all friendships involving this user
    const friendsSnapshot = await adminDb
      .collection("friends")
      .where("users", "array-contains", userId)
      .get();
    const friendDeletes = friendsSnapshot.docs.map((doc) => doc.ref.delete());
    await Promise.all(friendDeletes);

    // 4. Delete all friend requests sent by or to this user
    const sentRequestsSnapshot = await adminDb
      .collection("friend-requests")
      .where("from", "==", userId)
      .get();
    const receivedRequestsSnapshot = await adminDb
      .collection("friend-requests")
      .where("to", "==", userId)
      .get();
    const requestDeletes = [
      ...sentRequestsSnapshot.docs.map((doc) => doc.ref.delete()),
      ...receivedRequestsSnapshot.docs.map((doc) => doc.ref.delete()),
    ];
    await Promise.all(requestDeletes);

    // 5. Delete all conversations belonging to this user
    const conversationsSnapshot = await adminDb
      .collection("conversations")
      .where("userId", "==", userId)
      .get();
    const conversationDeletes = conversationsSnapshot.docs.map((doc) =>
      doc.ref.delete()
    );
    await Promise.all(conversationDeletes);

    // 6. Delete user from Firebase Authentication
    await adminAuth.deleteUser(userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
