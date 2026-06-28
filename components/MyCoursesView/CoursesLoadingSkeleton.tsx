"use client";

export function CoursesLoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Stat cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-3 rounded-xl bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/40 h-16"
          />
        ))}
      </div>

      {/* Controls bar skeleton */}
      <div className="h-9 rounded-xl bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/40" />

      {/* Semester blocks */}
      {Array.from({ length: 2 }).map((_, si) => (
        <div key={si} className="space-y-3">
          <div className="h-6 w-40 rounded-lg bg-gray-100 dark:bg-gray-900/40" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, ci) => (
              <div
                key={ci}
                className="h-20 rounded-xl bg-gray-100 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800/40"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
