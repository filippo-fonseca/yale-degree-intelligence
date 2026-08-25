"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { FiX } from "react-icons/fi";

/**
 * The one modal window.
 *
 * Every dialog in the app used to bring its own: some rounded-xl, some
 * rounded-3xl, backdrops from black/50 to black/70, panels on gray-900,
 * gradient glass, or plain white, and close buttons in three different
 * treatments. This is the v3 window the setup flow and the what's-new modal
 * use, in one place, so a new dialog cannot invent a fourth variant.
 *
 * Escape closes, the backdrop closes, and body scroll is locked while open,
 * because every dialog wanted those and only some of them had them.
 */

export interface ModalShellProps {
  open: boolean;
  onClose: () => void;
  /** Mono text at the left of the status bar. Lowercase reads best. */
  label?: string;
  /** Mono text at the right. Keep it short: a count, a state, a hint. */
  note?: string;
  children: ReactNode;
  /** Tailwind max-width for the window. */
  maxWidth?: string;
  /** Set false for a dialog that must be answered rather than dismissed. */
  dismissable?: boolean;
  className?: string;
  /** Sits above the sidebar by default; raise it for dialogs over dialogs. */
  z?: string;
}

export function ModalShell({
  open,
  onClose,
  label,
  note,
  children,
  maxWidth = "max-w-lg",
  dismissable = true,
  className = "",
  z = "z-[100]",
}: ModalShellProps) {
  useEffect(() => {
    if (!open || !dismissable) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismissable, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 ${z} flex items-center justify-center overflow-y-auto bg-black/50 p-3 font-louize backdrop-blur-md dark:bg-black/75 sm:p-4`}
          onClick={(e) => {
            if (dismissable && e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
            className={`relative my-auto w-full ${maxWidth} overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] dark:border-white/[0.09] dark:bg-[#101013] ${className}`}
          >
            {(label || note) && (
              <>
                <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                  <span>{label}</span>
                  {note && <span className={dismissable ? "pr-6" : ""}>{note}</span>}
                </div>
                <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.08]" />
              </>
            )}

            {dismissable && (
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-3 top-2 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
              >
                <FiX size={16} />
              </button>
            )}

            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Title and supporting line, in the proportions the rest of v3 uses. */
export function ModalHeader({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div>
      <h2 className="text-[1.35rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
        {title}
      </h2>
      {children && (
        <p className="mt-2 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {children}
        </p>
      )}
    </div>
  );
}

export default ModalShell;
