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
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center justify-between w-full p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-sm text-gray-300 hover:bg-gray-800/70 transition-colors ${className}`}
      >
        <div className="flex items-center gap-2">
          <div>{icon}</div>
          <span>{previewText}</span>
        </div>
        <FiChevronDown className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 bg-gray-800/50 rounded-lg border border-gray-700 text-sm text-gray-300 ${className}`}
    >
      {autoHide && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div>{icon}</div>
            <span className="font-medium">{previewText}</span>
          </div>
          <button
            onClick={() => setIsExpanded(false)}
            className="text-gray-400 hover:text-gray-200 transition-colors"
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
          className="self-end flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors mt-1"
        >
          <span>Collapse</span>
          <FiChevronUp className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
