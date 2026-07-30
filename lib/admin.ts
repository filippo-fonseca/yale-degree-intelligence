/** Creator accounts only (settings Dev tools, admin dashboard). */
export const ADMIN_EMAILS = [
  "filippo.fonseca@yale.edu",
  "filifonsecacagnazzo@gmail.com",
] as const;

/** Primary admin email (kept for display / backwards-compatible imports). */
export const ADMIN_EMAIL = ADMIN_EMAILS[0];

const ADMIN_EMAIL_SET = new Set(
  ADMIN_EMAILS.map((email) => email.toLowerCase()),
);

/** True when the given email belongs to the creator (any of their accounts). */
export function isAdminEmail(email: string | null | undefined): boolean {
  return !!email && ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}
