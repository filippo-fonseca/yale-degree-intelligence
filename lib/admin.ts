/**
 * Who operates this instance.
 *
 * Read from ADMIN_EMAILS (comma-separated) rather than hardcoded, so a fork
 * configures its own operators instead of inheriting ours.
 *
 * SERVER ONLY. `process.env.ADMIN_EMAILS` is undefined in the browser, so this
 * module must not be imported from a client component: it would silently
 * evaluate to "nobody is an admin". Client code calls GET /api/me instead (see
 * the useIsAdmin hook), which keeps the list off the wire entirely. That is the
 * point of the split: the list previously reached the browser inside the JS
 * bundle, because client components imported this file.
 *
 * The real gate is here and in the API routes. Anything the client does with
 * admin status is presentation only (showing a menu item, routing to /admin);
 * every privileged read is re-checked server-side against this list.
 */

function loadAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** True when the given email operates this instance. */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  // Read per call rather than once at module load: a serverless instance can
  // outlive an environment change, and a list cached at import time would stay
  // stale until the next cold start.
  return loadAdminEmails().has(email.trim().toLowerCase());
}

/** Whether this deployment has any operator configured at all. */
export function hasAdminsConfigured(): boolean {
  return loadAdminEmails().size > 0;
}
