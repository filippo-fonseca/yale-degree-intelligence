"use client";

import { useEffect, useState, useCallback } from "react";
import { HelpCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { TipModal } from "@/components/ui/TipModal";

export function resetCertificateTipSeen(
  storageKey = "myCertificateTipModalShown",
) {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
  }
}

type CertificateTipModalProps = {
  storageKey?: string;
  autoOpenOnMount?: boolean;
  onDismiss?: () => void;
  zIndexClassName?: string;
  forceOpen?: boolean;
};

export default function CertificateTipModal({
  storageKey = "myCertificateTipModalShown",
  autoOpenOnMount = true,
  onDismiss,
  zIndexClassName,
  forceOpen = false,
}: CertificateTipModalProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const firstName = user?.displayName?.split(" ")[0];

  useEffect(() => {
    if (typeof window === "undefined" || !autoOpenOnMount) return;
    const seen = window.localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [autoOpenOnMount, storageKey]);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  const dismiss = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(storageKey, "true");
    }
    setOpen(false);
    onDismiss?.();
  }, [onDismiss, storageKey]);

  return (
    <TipModal
      open={open}
      onClose={dismiss}
      z={zIndexClassName}
      label="manual fulfill & skip"
      title={"About \u201CManual fulfill\u201D & \u201CSkip\u201D"}
      intro={
        <>
          {firstName ? `${firstName}, you` : "You"} may fulfill more
          requirements than we can detect automatically: certificate programs do
          not always list every course that can satisfy a requirement.
        </>
      }
      points={[
        {
          term: "Manual fulfill",
          body: (
            <>
              mark a requirement as satisfied by linking a class straight from
              your transcript, using the &ldquo;Fulfill manually&rdquo; button on
              the requirement&apos;s card.
            </>
          ),
        },
        {
          term: "Skip a class",
          body: (
            <>
              record an approved exemption from a listed class, placement credit
              for instance. Click a course pill in the &ldquo;Remaining&rdquo;
              section, then &ldquo;Mark as skipped&rdquo;.
            </>
          ),
        },
      ]}
      footnote="Use these when your program coordinator confirms you are covered but our parser cannot infer it."
    />
  );
}

export function CertificateTipHelpButton({
  onClick,
  className = "",
  label = "Help! I know I fulfill more requirements toward my certificate(s) than what's shown here.",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    // Was an animated conic-gradient border in teal. v3 does not have a second
    // accent system: a hairline row with a teal icon, matching the major
    // variant and everything else on the page.
    <div className={`relative ${className}`}>
      <button
        onClick={onClick}
        className="flex w-full items-center justify-between rounded-xl border border-black/[0.08] bg-white p-3 font-sf text-sm text-gray-600 transition-colors hover:border-black/[0.14] hover:text-gray-900 dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-white/[0.16] dark:hover:text-white"
        title="What do 'Manual fulfill' and 'Skip' mean?"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-teal-500 dark:text-teal-400" />
          <span className="text-left">{label}</span>
        </div>
      </button>
    </div>
  );
}
