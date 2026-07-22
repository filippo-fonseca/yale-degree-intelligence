import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { adminDb } from "@/config/firebaseAdmin";
import { encryptSecret } from "@/lib/serverCrypto";
import { isAuthError, requireAuth } from "@/lib/apiAuth";

const KEYS_COLLECTION = "dan_keys";

// Save (and validate) the user's Anthropic API key.
export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;
  const uid = auth.uid;

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
  if (!adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const uid = auth.uid;

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
  if (!adminDb) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;
  const uid = auth.uid;

  await adminDb.collection(KEYS_COLLECTION).doc(uid).delete();
  return NextResponse.json({ connected: false });
}
