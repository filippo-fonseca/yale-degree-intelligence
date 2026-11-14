import { createHash, randomBytes, timingSafeEqual } from "crypto";

/** URL-safe random string with `bytes` bytes of entropy. */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

/** Hex SHA-256. Tokens are stored only as this hash, never in the clear. */
export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function base64UrlSha256(value: string): string {
  return createHash("sha256").update(value).digest("base64url");
}

/** Constant-time string comparison (lengths are not secret here). */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// RFC 7636 section 4.1: 43-128 chars from the unreserved set.
const VERIFIER_PATTERN = /^[A-Za-z0-9\-._~]{43,128}$/;
// A S256 challenge is a base64url SHA-256: exactly 43 chars, no padding.
const CHALLENGE_PATTERN = /^[A-Za-z0-9\-_]{43}$/;

export function isValidCodeChallenge(challenge: string): boolean {
  return CHALLENGE_PATTERN.test(challenge);
}

/** PKCE S256 check. `plain` is not supported (OAuth 2.1). */
export function verifyPkceS256(verifier: string, challenge: string): boolean {
  if (!VERIFIER_PATTERN.test(verifier)) return false;
  return safeEqual(base64UrlSha256(verifier), challenge);
}
