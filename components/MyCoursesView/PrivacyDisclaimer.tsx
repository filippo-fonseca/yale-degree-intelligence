"use client";

import { AcademicDataDisclaimerCard } from "@/components/disclaimers/AcademicDataDisclaimer";

export function PrivacyDisclaimer() {
  return (
    <AcademicDataDisclaimerCard
      className="mt-10"
      lead="By using DegreeIntelligence, you voluntarily share your courses and grades, whether you upload a transcript or enter them by hand."
    />
  );
}
