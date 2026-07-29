import { isAdminEmail } from "@/lib/admin";

/**
 * Who may use the product / hit authenticated APIs.
 * - Any @yale.edu address
 * - Hardcoded creator admin emails (incl. non-Yale for local/ops)
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (email.endsWith("@yale.edu")) return true;
  if (isAdminEmail(email)) return true;
  return false;
}
