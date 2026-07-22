import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebaseAdmin";
import { isAuthError, requireAuth } from "@/lib/apiAuth";
import {
  generateToken,
  getTokenStatus,
  revokeToken,
} from "@/lib/mcp/tokenStore";

export const runtime = "nodejs";

// Report whether the user has an MCP token (never returns the token itself).
export async function GET(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  return NextResponse.json(await getTokenStatus(auth.uid));
}

// Generate (or rotate) the user's MCP token. Returns the plaintext once.
export async function POST(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;

  const token = await generateToken(auth.uid);
  return NextResponse.json({ token });
}

// Revoke the user's MCP token.
export async function DELETE(req: NextRequest) {
  if (!adminDb) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;

  await revokeToken(auth.uid);
  return NextResponse.json({ connected: false });
}
