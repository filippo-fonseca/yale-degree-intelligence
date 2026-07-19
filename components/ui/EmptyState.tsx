"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

export type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  className?: string;
};

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className = "",
}: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex flex-col items-center justify-center py-12 px-6 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/50 dark:via-gray-900/35 dark:to-gray-950/50 backdrop-blur-md border border-dashed border-gray-200 dark:border-white/[0.10] text-center ${className}`}
    >
      <div className="p-4 rounded-2xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] mb-4">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
        {title}
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 max-w-sm leading-relaxed">
        {description}
      </p>
      {(primaryAction || secondaryAction) && (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-pink-600 dark:text-pink-300 bg-pink-50 dark:bg-pink-900/20 rounded-lg border border-pink-200 dark:border-pink-800/40 hover:bg-pink-100 dark:hover:bg-pink-800/30 transition"
            >
              {primaryAction.label}
            </button>
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-white/[0.04] rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
