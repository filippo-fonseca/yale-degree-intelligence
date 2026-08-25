import { createHmac, timingSafeEqual } from "crypto";

/**
 * Signing for unsubscribe links.
 *
 * The link has to work with no session: the person clicking it is reading a
 * campaign email, not signed in, and may never have had an account. So the
 * address travels in the URL, and a signature travels with it. Without one,
 * the endpoint would take any address anyone typed, and a stranger could
 * unsubscribe a classmate for a laugh.
 *
 * Keyed on a server-only secret. In an environment without one, signing is
 * refused rather than falling back to something guessable.
 */
export function unsubscribeSecret(): string | null {
  return process.env.EMAIL_UNSUBSCRIBE_SECRET || null;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signUnsubscribe(email: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(normalizeEmail(email))
    .digest("hex")
    .slice(0, 32);
}

export function verifyUnsubscribe(
  email: string,
  token: string,
  secret: string,
): boolean {
  const expected = signUnsubscribe(email, secret);
  const given = String(token || "");
  if (given.length !== expected.length) return false;
  // Constant-time: a length check already leaked nothing, but the comparison
  // itself should not leak how much of the token was right.
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

/** The link that goes in the email footer and the List-Unsubscribe header. */
export function unsubscribeUrl(
  email: string,
  secret: string,
  base = "https://degreeint.com",
): string {
  const normalized = normalizeEmail(email);
  const token = signUnsubscribe(normalized, secret);
  return `${base}/unsubscribe?e=${encodeURIComponent(normalized)}&t=${token}`;
}
