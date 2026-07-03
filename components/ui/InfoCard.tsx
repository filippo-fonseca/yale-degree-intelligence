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
      <div className={`relative group ${className}`}>
        {/* Soft gradient glow on hover */}
        <div className="absolute -inset-px rounded-2xl bg-[conic-gradient(from_var(--angle),#ec4899,#8b5cf6,#3b82f6,#ec4899)] opacity-0 blur-[3px] group-hover:opacity-40 transition-opacity duration-300" />
        <button
          onClick={() => setIsExpanded(true)}
          className="relative flex items-center justify-between w-full p-3 rounded-2xl neu-control backdrop-blur-xl text-sm text-gray-700 dark:text-gray-300 hover:-translate-y-0.5 transition-all"
        >
          <div className="flex items-center gap-2">
            <div className="text-pink-500 dark:text-pink-400">{icon}</div>
            <span className="font-medium">{previewText}</span>
          </div>
          <FiChevronDown className="w-4 h-4 text-pink-400 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3.5 rounded-2xl neu-surface-sm backdrop-blur-xl text-sm leading-relaxed text-gray-600 dark:text-gray-300 ${className}`}
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
