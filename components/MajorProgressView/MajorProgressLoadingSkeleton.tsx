"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export default function MajorProgressLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      {/* Progress bar card */}
      <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-800/50 shadow-neu">
        <Skeleton rounded="rounded-full" className="h-2 w-full" />
        <Skeleton rounded="rounded-lg" className="h-6 w-44 mt-2" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} rounded="rounded-xl" className="h-16" />
        ))}
      </div>
      {/* Board columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, c) => (
          <div
            key={c}
            className="rounded-xl border border-gray-200 dark:border-gray-800/50 p-3 space-y-3"
          >
            <Skeleton rounded="rounded-lg" className="h-5 w-28" />
            {Array.from({ length: 3 }).map((_, r) => (
              <Skeleton key={r} rounded="rounded-xl" className="h-20" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
