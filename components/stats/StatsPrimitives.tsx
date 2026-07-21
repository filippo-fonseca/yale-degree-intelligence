"use client";

import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { FiInfo } from "react-icons/fi";
import { Skeleton } from "@/components/ui/Skeleton";

/** Matches the MajorStatCard pattern exactly. */
export function StatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  icon,
  sub,
  delta,
  deltaText,
  tooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  sub?: string;
  delta?: number;
  deltaText?: string;
  tooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all relative shadow-neu"
    >
      {tooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {tooltip}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && (
          <span className={`${color} opacity-70`}>{icon}</span>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-medium ${color}`}>{value}</p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
          {sub}
        </p>
      )}
      {delta !== undefined && delta !== 0 && deltaText && (
        <p
          className={`text-[11px] mt-0.5 ${
            delta > 0
              ? "text-emerald-500 dark:text-emerald-400"
              : delta > -0.05
              ? "text-gray-400 dark:text-gray-500"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(2)}{" "}
          <span className="text-gray-400 dark:text-gray-500">{deltaText}</span>
        </p>
      )}
    </motion.div>
  );
}

/** Chart container matching the My Major surface style. */
export function ChartCard({
  title,
  description,
  icon,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm text-gray-900 dark:text-white leading-snug">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 shrink-0 ml-2">
            {icon}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

/** Skeleton shimmer for a single stat card. */
export function StatCardSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu">
      <Skeleton className="h-3 w-24 mb-2" rounded="rounded" />
      <Skeleton className="h-6 w-16 mb-1.5" rounded="rounded" />
      <Skeleton className="h-2.5 w-20" rounded="rounded" />
    </div>
  );
}

/** Skeleton shimmer for a chart card. */
export function ChartCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu ${className}`}
    >
      <Skeleton className="h-4 w-40 mb-1" rounded="rounded" />
      <Skeleton className="h-2.5 w-56 mb-4" rounded="rounded" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

/** Empty state when no GPA-eligible courses exist. */
export function EmptyState({ inProgressCount = 0 }: { inProgressCount?: number }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center gap-4"
      >
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-200 dark:border-violet-800/30">
          <GraduationCap className="h-10 w-10 text-violet-600 dark:text-violet-300" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-800 dark:text-gray-200">
            No graded courses yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Add completed courses with grades and credits to see your GPA and
            charts here.
          </p>
          {inProgressCount > 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {inProgressCount} course{inProgressCount !== 1 ? "s" : ""} in
              progress — stats will appear once graded.
            </p>
          )}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-3">
            Only you can see your grades.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function gpaColor(gpa: number): string {
  if (gpa >= 3.7) return "text-emerald-600 dark:text-emerald-300";
  if (gpa >= 3.3) return "text-blue-600 dark:text-blue-300";
  if (gpa >= 2.7) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}

export function creditsColor(credits: number): string {
  if (credits >= 32) return "text-emerald-600 dark:text-emerald-300";
  if (credits >= 24) return "text-blue-600 dark:text-blue-300";
  if (credits >= 16) return "text-amber-600 dark:text-amber-300";
  return "text-red-600 dark:text-red-300";
}
