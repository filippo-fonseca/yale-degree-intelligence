import { isAdminEmail } from "@/lib/admin";

/**
 * The part of the access rule that needs no configuration: any Yale address.
 *
 * Safe to evaluate in the browser, because it is a rule rather than a list.
 * Lower-cased first: the check used to be case-sensitive, which would have
 * failed closed on a differently-cased address.
 */
export function isYaleEmail(email: string | null | undefined): boolean {
  return !!email && email.trim().toLowerCase().endsWith("@yale.edu");
}

/**
 * Who may use the product and hit authenticated APIs: any Yale address, plus
 * this deployment's configured operators (see lib/admin).
 *
 * SERVER ONLY, because it consults the operator list. The browser cannot answer
 * this for a non-Yale operator without being handed that list, so client code
 * uses isYaleEmail for the common case and asks GET /api/me otherwise.
 */
export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (isYaleEmail(email)) return true;
  if (isAdminEmail(email)) return true;
  return false;
}
