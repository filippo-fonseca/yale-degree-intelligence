import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/config/firebaseAdmin";
import { isAllowedEmail } from "@/lib/allowedEmail";

export type AuthedUser = {
  uid: string;
  email?: string;
};

export type RequireAuthOptions = {
  /** Reject tokens that were revoked (extra round-trip to Firebase). */
  checkRevoked?: boolean;
};

/**
 * Verify Firebase ID token from Authorization: Bearer <token>.
 * Also enforces the Yale / allowlist email gate server-side.
 * Returns AuthedUser or a NextResponse error to return immediately.
 */
export async function requireAuth(
  req: NextRequest | Request,
  options: RequireAuthOptions = {}
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
      authHeader.split("Bearer ")[1].trim(),
      options.checkRevoked === true
    );
    if (!isAllowedEmail(decoded.email)) {
      return NextResponse.json(
        { error: "Only @yale.edu accounts are allowed." },
        { status: 403 }
      );
    }
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
