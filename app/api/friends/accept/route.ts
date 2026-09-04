import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
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

  const { requestId } = await req.json().catch(() => ({ requestId: undefined }));
  if (typeof requestId !== "string" || !requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  const requestRef = adminDb.collection("friend-requests").doc(requestId);
  const requestSnap = await requestRef.get();
  if (!requestSnap.exists) {
    return NextResponse.json({ error: "Friend request not found" }, { status: 404 });
  }

  const requestData = requestSnap.data()!;
  if (requestData.to !== auth.uid) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }
  if (requestData.status !== "pending") {
    return NextResponse.json(
      { error: "Friend request is no longer pending" },
      { status: 409 }
    );
  }

  const users = [requestData.from, requestData.to].sort();
  const lookupId = `${users[0]}_${users[1]}`;

  const batch = adminDb.batch();
  batch.set(adminDb.collection("friends").doc(), {
    users,
    createdAt: FieldValue.serverTimestamp(),
  });
  batch.set(adminDb.collection("friends_lookup").doc(lookupId), {
    users,
    createdAt: FieldValue.serverTimestamp(),
  });
  // respondedAt lets the sender's notification sort by when the request was
  // accepted rather than when it was sent.
  batch.update(requestRef, {
    status: "accepted",
    respondedAt: FieldValue.serverTimestamp(),
  });
  await batch.commit();

  return NextResponse.json({ success: true });
}
