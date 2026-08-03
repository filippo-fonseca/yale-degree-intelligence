import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/config/firebaseAdmin";
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

function tooManyRequests(retryAfterMs: number): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(Math.max(1, Math.ceil(retryAfterMs / 1000))) },
    }
  );
}

/**
 * Per-instance fallback, used only when the Admin SDK is unavailable (local
 * dev without credentials). Serverless gives every instance its own Map and
 * wipes it on cold start, so this cannot bound anything in production.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

function inMemoryRateLimit(
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
  if (entry.count > limit) return tooManyRequests(entry.resetAt - now);
  return null;
}

/**
 * Fixed-window rate limiter backed by Firestore, so the count is shared by
 * every serverless instance instead of living in per-instance memory.
 *
 * Counting happens inside a transaction, which is what makes it safe against
 * a burst of concurrent requests: the read and the increment cannot interleave,
 * so N parallel calls consume N units rather than all seeing the same count.
 *
 * Windows are fixed rather than sliding, so a caller can spend their budget at
 * the end of one window and again at the start of the next. That 2x boundary
 * burst is an accepted tradeoff for a single cheap document per window.
 *
 * Documents carry `expiresAt` so a Firestore TTL policy on
 * `rate_limits.expiresAt` can reap them; without that policy they accumulate
 * harmlessly but forever.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<NextResponse | null> {
  if (!adminDb) return inMemoryRateLimit(key, limit, windowMs);

  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  // Hash the key: it embeds uids, emails, and IPs, none of which are safe to
  // drop into a Firestore document id verbatim.
  const keyHash = createHash("sha256").update(key).digest("hex").slice(0, 32);
  const ref = adminDb.collection("rate_limits").doc(`${keyHash}_${windowStart}`);

  try {
    const count = await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? Number(snap.data()?.count) || 0 : 0;
      const next = current + 1;
      tx.set(
        ref,
        {
          count: next,
          windowStart,
          limit,
          expiresAt: Timestamp.fromMillis(resetAt + windowMs),
        },
        { merge: true }
      );
      return next;
    });
    return count > limit ? tooManyRequests(resetAt - now) : null;
  } catch (error) {
    // Never fail a request because the limiter itself broke. Falling back to
    // the in-memory bucket is weaker but still better than no limit at all.
    console.error("Rate limit check failed; falling back to in-memory:", error);
    return inMemoryRateLimit(key, limit, windowMs);
  }
}
