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
        {/* Animated gradient border */}
        <div
          className="absolute -inset-[1px] rounded-lg bg-[conic-gradient(from_var(--angle),#ec4899,#8b5cf6,#3b82f6,#ec4899)] opacity-75 blur-[2px] animate-border-spin"
          style={{ "--angle": "0deg" } as React.CSSProperties}
        />
        <div
          className="absolute -inset-[1px] rounded-lg bg-[conic-gradient(from_var(--angle),#ec4899,#8b5cf6,#3b82f6,#ec4899)] animate-border-spin"
          style={{ "--angle": "0deg" } as React.CSSProperties}
        />
        <button
          onClick={() => setIsExpanded(true)}
          className="relative flex items-center justify-between w-full p-3 bg-white dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <div className="text-pink-500">{icon}</div>
            <span>{previewText}</span>
          </div>
          <FiChevronDown className="w-4 h-4 text-pink-400 animate-bounce" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 shadow-neu-sm text-sm text-gray-700 dark:text-gray-300 ${className}`}
    >
      {autoHide && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div>{icon}</div>
            <span className="font-medium">{previewText}</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
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
          className="self-end flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors mt-1"
        >
          <span>Collapse</span>
          <FiChevronUp className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
