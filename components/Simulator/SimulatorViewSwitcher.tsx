"use client";

export type SimulatorView = "canvas" | "progress";

const VIEWS: { id: SimulatorView; label: string }[] = [
  { id: "canvas", label: "Canvas" },
  { id: "progress", label: "Progress" },
];

/**
 * The Simulator's two predominant views. Canvas holds everything interactive
 * (plan bar, pool, semester grid); Progress holds the read-only readouts.
 * Styling follows MajorProgressViewSwitcher so the app has one tab idiom.
 */
export default function SimulatorViewSwitcher({
  view,
  setView,
}: {
  view: SimulatorView;
  setView: (view: SimulatorView) => void;
}) {
  return (
    <div
      className="flex items-center gap-2 w-full sm:w-auto"
      data-tour="simulator-view-switcher"
    >
      {VIEWS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => setView(v.id)}
          aria-pressed={view === v.id}
          data-sim-view={v.id}
          className={`h-10 px-4 flex-1 sm:flex-none text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center justify-center ${
            view === v.id
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-200 border border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
              : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]"
          }`}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
