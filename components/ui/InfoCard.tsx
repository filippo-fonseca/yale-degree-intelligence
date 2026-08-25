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
        <button
          type="button"
          onClick={() => setIsExpanded(true)}
          className="relative flex w-full items-center justify-between rounded-xl border border-black/[0.08] bg-white p-3 font-sf text-sm text-gray-600 transition-colors hover:border-black/[0.14] hover:text-gray-900 dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:border-white/[0.16] dark:hover:text-white"
        >
          <div className="flex items-center gap-2">
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
            <span className="font-medium">{previewText}</span>
          </div>
          <FiChevronDown className="h-4 w-4 text-gray-400 transition-transform group-hover:translate-y-0.5 dark:text-gray-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative z-[1] flex flex-col gap-2 rounded-xl border border-black/[0.08] bg-white p-3.5 font-sf text-sm leading-relaxed text-gray-600 dark:border-white/[0.09] dark:bg-white/[0.03] dark:text-gray-300 ${className}`}
    >
      {autoHide && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="text-gray-400 dark:text-gray-500">{icon}</div>
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
          className="mt-1 flex items-center gap-1 self-end font-sf text-xs text-gray-400 transition-colors hover:text-gray-900 dark:text-gray-500 dark:hover:text-white"
        >
          <span>Collapse</span>
          <FiChevronUp className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
