import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";

export type AuthedUser = {
  uid: string;
  email?: string;
};

/**
 * Verify Firebase ID token from Authorization: Bearer <token>.
 * Returns AuthedUser or a NextResponse error to return immediately.
 */
export async function requireAuth(
  req: NextRequest | Request
): Promise<AuthedUser | NextResponse> {
  if (!adminAuth) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const decoded = await adminAuth.verifyIdToken(
      authHeader.split("Bearer ")[1].trim()
    );
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export function isAuthError(
  result: AuthedUser | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/** Simple in-memory sliding-window rate limiter (per-instance). */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): NextResponse | null {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }
  entry.count += 1;
  if (entry.count > limit) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }
  return null;
}
