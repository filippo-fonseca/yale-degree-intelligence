// components/modals/MajorTipModal.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X as XIcon, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export function resetMajorTipSeen(storageKey = "myMajorTipModalShown") {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(storageKey);
  }
}

type MajorTipModalProps = {
  storageKey?: string;
  autoOpenOnMount?: boolean;
  onDismiss?: () => void;
  zIndexClassName?: string;
  /** NEW: instantly open the modal when true */
  forceOpen?: boolean;
};

export default function MajorTipModal({
  storageKey = "myMajorTipModalShown",
  autoOpenOnMount = true,
  onDismiss,
  zIndexClassName = "z-50",
  forceOpen = false,
}: MajorTipModalProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  // Auto-open once per device
  useEffect(() => {
    if (typeof window === "undefined" || !autoOpenOnMount) return;
    const seen = window.localStorage.getItem(storageKey);
    if (!seen) setOpen(true);
  }, [autoOpenOnMount, storageKey]);

  // NEW: immediate open when parent requests it
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
          key="major-tip-modal"
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
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-800/60">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-300" />
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
                <span className="font-medium text-blue-600 dark:text-blue-200">
                  fulfill more requirements
                </span>{" "}
                than we can automatically detect, as the DUS for each major
                might not all list specific courses that apply for a given
                requirement all the time.
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
                  from your transcript. You can do this from a pink "Fulfill
                  manually" button on each requirement's card.
                </li>
                <li>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    Skip a class
                  </span>{" "}
                  — indicate an approved exemption to a listed class on a
                  requirement (i.e. say you started with Calc III, you could
                  mark Calc I and II as skipped, so we'll count them for your
                  major's progress even though you didn't take them). You can do
                  this by clicking on a card's pill in the "Remaining" section
                  and clicking "Mark as skipped".
                </li>
              </ul>
              <p className="text-gray-400 dark:text-gray-500">
                Use these when your DUS/department confirms you’re covered but
                our parser can’t infer it automatically.
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

/** Optional inline help button */
export function MajorTipHelpButton({
  onClick,
  className = "",
  label = "Help! I know I fulfill more requirements toward my major than what's shown here.",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      {/* Animated gradient border */}
      <div
        className="border-none absolute -inset-[1px] rounded-lg bg-[conic-gradient(from_var(--angle),#ec4899,#8b5cf6,#3b82f6,#ec4899)] opacity-75 blur-[2px] animate-border-spin"
        style={{ "--angle": "0deg" } as React.CSSProperties}
      />
      <div
        className="absolute -inset-[1px] rounded-lg bg-[conic-gradient(from_var(--angle),#ec4899,#8b5cf6,#3b82f6,#ec4899)] animate-border-spin"
        style={{ "--angle": "0deg" } as React.CSSProperties}
      />
      <button
        onClick={onClick}
        className="relative flex items-center justify-between w-full p-3 bg-white dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        title="What do 'Manual fulfill' and 'Skip' mean?"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-pink-500" />
          <span>{label}</span>
        </div>
      </button>
    </div>
  );
}
