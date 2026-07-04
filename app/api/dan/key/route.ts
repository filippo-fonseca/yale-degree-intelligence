import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import { encryptSecret } from "@/lib/serverCrypto";

const KEYS_COLLECTION = "dan_keys";

async function getUid(req: NextRequest): Promise<string | null> {
  if (!adminAuth) return null;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(authHeader.split("Bearer ")[1]);
    return decoded.uid;
  } catch {
    return null;
  }
}

// Save (and validate) the user's Anthropic API key.
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { apiKey } = await req.json().catch(() => ({ apiKey: undefined }));
  if (typeof apiKey !== "string" || !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "That doesn't look like an Anthropic API key." },
      { status: 400 }
    );
  }

  // Validate against Anthropic with a free call before storing.
  try {
    await new Anthropic({ apiKey }).models.list({ limit: 1 });
  } catch (e: any) {
    const status = e?.status === 401 ? 400 : 502;
    return NextResponse.json(
      {
        error:
          status === 400
            ? "Anthropic rejected that key. Double-check and try again."
            : "Couldn't reach Anthropic to validate the key. Try again.",
      },
      { status }
    );
  }

  await adminDb.collection(KEYS_COLLECTION).doc(uid).set({
    encryptedKey: encryptSecret(apiKey),
    last4: apiKey.slice(-4),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });

  return NextResponse.json({ connected: true, last4: apiKey.slice(-4) });
}

// Report connection status (never returns the key itself).
export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const snap = await adminDb.collection(KEYS_COLLECTION).doc(uid).get();
  if (!snap.exists) return NextResponse.json({ connected: false });
  const data = snap.data()!;
  return NextResponse.json({
    connected: true,
    last4: data.last4 ?? null,
    lastUsedAt: data.lastUsedAt ?? null,
  });
}

// Remove the stored key.
export async function DELETE(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await adminDb.collection(KEYS_COLLECTION).doc(uid).delete();
  return NextResponse.json({ connected: false });
}
