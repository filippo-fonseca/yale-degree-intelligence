/**
 * One mapping from an engine Verdict to the three things a picker row needs.
 *
 * Both the My Certificates flow and the Simulator flow render blocked and
 * warned options the same way, so the mapping lives here rather than in either
 * component: consistency beats novelty, and neither surface gets to invent its
 * own idea of what "blocked" looks like.
 *
 * tone "neutral" is the reduced-emphasis zinc treatment used for blocked rows
 * and for plain informational lines; tone "amber" is the warn treatment, which
 * always stays selectable.
 */

import type { Verdict, Violation } from "@/lib/certificatePolicy";
import { certificateEligibility } from "@/lib/certificatePolicy";

export type PolicyPresentation = {
  disabled: boolean;
  tone: "neutral" | "amber";
  reason?: string;
};

export function presentVerdict(verdict: Verdict): PolicyPresentation {
  if (!verdict.allowed) {
    return { disabled: true, tone: "neutral", reason: verdict.reason };
  }

  switch (verdict.kind) {
    case "warn":
      return { disabled: false, tone: "amber", reason: verdict.reason };
    case "overlap-ok":
      return {
        disabled: false,
        tone: "neutral",
        reason: `overlap ${verdict.budget.used}/${verdict.budget.cap}`,
      };
    default:
      return { disabled: false, tone: "neutral" };
  }
}

/** A stored conflict renders with the blocked treatment plus its reason. */
export function presentViolation(violation: Violation): PolicyPresentation {
  return { disabled: true, tone: "neutral", reason: violation.reason };
}

/**
 * Whole-certificate eligibility, for the certificate selectors and the banner
 * on the certificate card. Ineligible certificates stay selectable by design.
 */
export function presentCertificateEligibility(
  certId: string,
  majorIds: string[]
): PolicyPresentation {
  const eligibility = certificateEligibility(certId, majorIds);
  if (eligibility.eligible) return { disabled: false, tone: "neutral" };
  return { disabled: false, tone: "amber", reason: eligibility.warning };
}
