"use client";

import type { ReactNode } from "react";

/**
 * The secondary action that sits beside a ShinyButton.
 *
 * Mirrors the landing page's ghost CTA at a smaller size, and lives here
 * rather than in one screen because two hand-copied class strings drift: the
 * pair has to agree on shape and height wherever it appears.
 */
export function GhostButton({
  children,
  onClick,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-full border border-black/10 bg-white px-4 py-2 font-sf text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white ${className}`}
    >
      {children}
    </button>
  );
}

export default GhostButton;
