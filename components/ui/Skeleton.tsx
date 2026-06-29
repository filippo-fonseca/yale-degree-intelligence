"use client";

import React from "react";

// Shared skeleton primitive for data-loading states across the app.
// Matches the app's light/dark surfaces and uses a subtle shimmer sweep.

type SkeletonProps = {
  className?: string;
  rounded?: string;
};

export function Skeleton({ className = "", rounded = "rounded-lg" }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-gray-200/70 dark:bg-white/[0.06] ${rounded} ${className}`}
    >
      <div className="absolute inset-0 -translate-x-full animate-skeleton-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/[0.08]" />
    </div>
  );
}

export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-3.5 ${i === lines - 1 ? "w-2/3" : "w-full"}`}
        />
      ))}
    </div>
  );
}

export default Skeleton;
