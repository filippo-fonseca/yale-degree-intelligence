"use client";

import { Skeleton } from "@/components/ui/Skeleton";

export function CoursesLoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} rounded="rounded-xl" className="h-16" />
        ))}
      </div>

      {/* Controls bar skeleton */}
      <Skeleton rounded="rounded-xl" className="h-9" />

      {/* Semester blocks */}
      {Array.from({ length: 2 }).map((_, si) => (
        <div key={si} className="space-y-3">
          <Skeleton rounded="rounded-lg" className="h-6 w-40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, ci) => (
              <Skeleton key={ci} rounded="rounded-xl" className="h-20" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
