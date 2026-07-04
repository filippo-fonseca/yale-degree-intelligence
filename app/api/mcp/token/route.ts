import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
import {
  generateToken,
  getTokenStatus,
  revokeToken,
} from "@/lib/mcp/tokenStore";

export const runtime = "nodejs";

async function getUid(req: NextRequest): Promise<string | null> {
  if (!adminAuth) return null;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(
      authHeader.split("Bearer ")[1],
    );
    return decoded.uid;
  } catch {
    return null;
  }
}

// Report whether the user has an MCP token (never returns the token itself).
export async function GET(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await getTokenStatus(uid));
}

// Generate (or rotate) the user's MCP token. Returns the plaintext once.
export async function POST(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = await generateToken(uid);
  return NextResponse.json({ token });
}

// Revoke the user's MCP token.
export async function DELETE(req: NextRequest) {
  if (!adminAuth || !adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const uid = await getUid(req);
  if (!uid) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await revokeToken(uid);
  return NextResponse.json({ connected: false });
}
