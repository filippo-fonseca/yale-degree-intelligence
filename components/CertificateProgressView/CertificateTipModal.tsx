"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X as XIcon, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function resetCertificateTipSeen(storageKey = "myCertificateTipModalShown") {
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
  zIndexClassName = "z-50",
  forceOpen = false,
}: CertificateTipModalProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

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
    <AnimatePresence>
      {open && (
        <motion.div
          key="certificate-tip-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${zIndexClassName} bg-black/70 backdrop-blur-sm flex items-center justify-center p-4`}
          onClick={dismiss}
        >
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 shadow-[0_10px_40px_rgba(0,0,0,0.15)] dark:shadow-[0_10px_40px_rgba(0,0,0,0.45)]"
          >
            <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-900/30 border border-teal-300 dark:border-teal-800/60">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 dark:text-teal-300" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  About “Manual fulfill” & “Skip”
                </h3>
              </div>
              <button
                onClick={dismiss}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                aria-label="Close"
                title="Close"
              >
                <XIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                {user?.displayName?.split(" ")[0]}, we know you might{" "}
                <span className="font-medium text-teal-600 dark:text-teal-200">
                  fulfill more requirements
                </span>{" "}
                than we can automatically detect, as certificate programs may
                not list every course that can satisfy a given requirement.
              </p>
              <p className="text-gray-500 dark:text-gray-400">
                That’s why every requirement includes:
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-500 dark:text-gray-400">
                <li>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    Manual fulfill
                  </span>{" "}
                  — mark a requirement as satisfied by linking a class directly
                  from your transcript. Use the teal "Fulfill manually" button on
                  each requirement card.
                </li>
                <li>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    Skip a class
                  </span>{" "}
                  — indicate an approved exemption to a listed class on a
                  requirement (e.g. placement credit). Click a pill in the
                  "Remaining" section and choose "Mark as skipped".
                </li>
              </ul>
              <p className="text-gray-400 dark:text-gray-500">
                Use these when your program coordinator confirms you’re covered
                but our parser can’t infer it automatically.
              </p>
            </div>

            <div className="p-5 pt-0 flex items-center justify-end gap-2">
              <button
                onClick={dismiss}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50 dark:bg-gray-900/60 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
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
    <div className={`relative ${className}`}>
      <div
        className="border-none absolute -inset-[1px] rounded-lg bg-[conic-gradient(from_var(--angle),#14b8a6,#0d9488,#2dd4bf,#14b8a6)] opacity-75 blur-[2px] animate-border-spin"
        style={{ "--angle": "0deg" } as React.CSSProperties}
      />
      <div
        className="absolute -inset-[1px] rounded-lg bg-[conic-gradient(from_var(--angle),#14b8a6,#0d9488,#2dd4bf,#14b8a6)] animate-border-spin"
        style={{ "--angle": "0deg" } as React.CSSProperties}
      />
      <button
        onClick={onClick}
        className="relative flex items-center justify-between w-full p-3 bg-white dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title="What do 'Manual fulfill' and 'Skip' mean?"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-teal-500" />
          <span>{label}</span>
        </div>
      </button>
    </div>
  );
}
