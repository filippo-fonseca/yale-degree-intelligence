import { FiInfo, FiChevronDown, FiChevronUp, FiX } from "react-icons/fi";
import React, { useState } from "react";

interface InfoCardProps {
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  autoHide?: boolean;
  previewText?: string;
}

export function InfoCard({
  children,
  icon = <FiInfo className="w-4 h-4" />,
  className = "",
  autoHide = false,
  previewText = "More info",
}: InfoCardProps) {
  const [isExpanded, setIsExpanded] = useState(!autoHide);

  if (autoHide && !isExpanded) {
    return (
      <div className={`relative z-[1] group ${className}`}>
        {/* Soft gradient glow on hover — kept inside the stacking context so
            neighboring neumorphic cards cannot erase the bottom border. */}
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-[conic-gradient(from_var(--angle),#ec4899,#8b5cf6,#3b82f6,#ec4899)] opacity-0 blur-[3px] group-hover:opacity-40 transition-opacity duration-300" />
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="relative flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 text-sm text-gray-700 shadow-sm transition-all hover:border-pink-500/30 hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:bg-white/[0.07]"
        >
          <div className="flex items-center gap-2">
            <div className="text-pink-500 dark:text-pink-400">{icon}</div>
            <span className="font-medium">{previewText}</span>
          </div>
          <FiChevronDown className="h-4 w-4 text-pink-400 transition-transform group-hover:translate-y-0.5" />
        </button>
      </div>
    );
  }

  return (
    // dark:bg-transparent is load-bearing: the dark treatment is a gradient,
    // which is a background-image, so without it the light mode's white
    // background-color survives and the card reads as a stray white field on a
    // dark page.
    <div
      className={`relative z-[1] flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3.5 text-sm leading-relaxed text-gray-600 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.05] dark:to-white/[0.02] dark:text-gray-300 dark:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)] ${className}`}
    >
      {autoHide && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="text-pink-500 dark:text-pink-400">{icon}</div>
            <span className="font-medium text-gray-800 dark:text-gray-100">{previewText}</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 -m-1 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            aria-label="Hide info"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className={autoHide ? "pt-1" : ""}>{children}</div>
      {autoHide && (
        <button
          onClick={() => setIsExpanded(false)}
          className="self-end flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-pink-500 dark:hover:text-pink-300 transition-colors mt-1"
        >
          <span>Collapse</span>
          <FiChevronUp className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
