import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebaseAdmin";
import { isAuthError, requireAuth } from "@/lib/apiAuth";

export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  const { friendId } = await req.json().catch(() => ({ friendId: undefined }));
  if (typeof friendId !== "string" || !friendId) {
    return NextResponse.json({ error: "friendId is required" }, { status: 400 });
  }

  const friendRef = adminDb.collection("friends").doc(friendId);
  const friendSnap = await friendRef.get();
  if (!friendSnap.exists) {
    return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
  }

  const friendData = friendSnap.data()!;
  if (!friendData.users?.includes(auth.uid)) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const users = [...friendData.users].sort();
  const lookupId = `${users[0]}_${users[1]}`;

  const batch = adminDb.batch();
  batch.delete(friendRef);
  batch.delete(adminDb.collection("friends_lookup").doc(lookupId));
  await batch.commit();

  return NextResponse.json({ success: true });
}
