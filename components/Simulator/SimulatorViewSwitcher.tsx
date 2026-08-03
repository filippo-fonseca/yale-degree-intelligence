"use client";

export type SimulatorView = "canvas" | "progress";

const VIEWS: { id: SimulatorView; label: string }[] = [
  { id: "canvas", label: "Canvas" },
  { id: "progress", label: "Progress" },
];

/**
 * The Simulator's two predominant views. Canvas holds everything interactive
 * (plan bar, pool, semester grid); Progress holds the read-only readouts.
 * Styling follows MajorProgressViewSwitcher so the app has one tab idiom, a
 * notch smaller: these sit under the plan row and are subordinate to it.
 */
export default function SimulatorViewSwitcher({
  view,
  setView,
  /** Dot on Progress, for users who have not opened it since it gained the
   *  grade and distributional readouts. */
  showProgressNew = false,
}: {
  view: SimulatorView;
  setView: (view: SimulatorView) => void;
  showProgressNew?: boolean;
}) {
  return (
    <div
      className="flex items-center gap-1.5 w-full sm:w-auto"
      data-tour="simulator-view-switcher"
    >
      {VIEWS.map((v) => {
        const isNew = v.id === "progress" && showProgressNew;
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            aria-pressed={view === v.id}
            data-sim-view={v.id}
            className={`relative h-8 px-3.5 flex-1 sm:flex-none text-[13px] font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center ${
              view === v.id
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-200 border border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]"
            }`}
          >
            {v.label}
            {isNew && (
              <>
                {/* Dot rather than a "New" chip: these pills are a fixed pair
                    and a chip would change their width. */}
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pink-500 ring-2 ring-white dark:ring-gray-950" />
                <span className="sr-only">(new)</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
