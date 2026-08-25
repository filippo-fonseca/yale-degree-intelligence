import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import { isAuthError, requireAuth } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  try {
    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const auth = await requireAuth(req, { checkRevoked: true });
    if (isAuthError(auth)) return auth;
    const userId = auth.uid;

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

    // 3. Delete all friendships involving this user (and their lookup entries)
    const friendsSnapshot = await adminDb
      .collection("friends")
      .where("users", "array-contains", userId)
      .get();

    // Delete friends_lookup entries for each friendship
    const lookupDeletes = friendsSnapshot.docs.map((doc) => {
      const users = [...doc.data().users].sort();
      const lookupId = `${users[0]}_${users[1]}`;
      return adminDb!.collection("friends_lookup").doc(lookupId).delete();
    });
    await Promise.all(lookupDeletes);

    // Delete the friends documents
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

    // 6. Delete CleoAI conversation history
    await adminDb.collection("cleoai_conversations").doc(userId).delete();

    // 7. Delete all ai_responses for this user (batched)
    const aiResponsesSnapshot = await adminDb
      .collection("ai_responses")
      .where("userId", "==", userId)
      .get();
    const BATCH_SIZE = 500;
    for (let i = 0; i < aiResponsesSnapshot.docs.length; i += BATCH_SIZE) {
      const batch = adminDb.batch();
      aiResponsesSnapshot.docs
        .slice(i, i + BATCH_SIZE)
        .forEach((doc) => batch.delete(doc.ref));
      await batch.commit();
    }

    // 8. Delete friends_public_data and the discovery entry for this user
    await adminDb.collection("friends_public_data").doc(userId).delete();
    await adminDb.collection("friends_directory").doc(userId).delete();

    // 9. Delete leftover secrets from the retired Dan advisor and MCP server.
    // Both features are gone, but old documents can still exist for users who
    // connected them, and they must never be left orphaned.
    await adminDb.collection("dan_keys").doc(userId).delete();
    await adminDb.collection("mcp_tokens").doc(userId).delete();

    // 10. Delete user from Firebase Authentication
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
