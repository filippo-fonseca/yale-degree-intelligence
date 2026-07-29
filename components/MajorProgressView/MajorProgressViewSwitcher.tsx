"use client";

export default function MajorProgressViewSwitcher({
  view,
  setView,
}: {
  view: "board" | "heatmap";
  setView: (view: "board" | "heatmap") => void;
}) {
  return (
    <div
      data-tour="major-view-switcher"
      className="sticky top-0 z-20 -mx-1 px-1 py-2.5"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            View:
          </span>
          <button
            type="button"
            onClick={() => setView("board")}
            data-tour="major-board-toggle"
            className={`h-9 px-3.5 text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center ${
              view === "board"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-200 border border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]"
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setView("heatmap")}
            data-tour="major-heatmap-toggle"
            className={`h-9 px-3.5 text-sm font-medium rounded-xl transition-all duration-200 inline-flex items-center gap-1.5 ${
              view === "heatmap"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-200 border border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:text-gray-800 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-white/[0.1]"
            }`}
          >
            Heat map
            <span className="px-1.5 py-px rounded text-[10px] leading-none font-semibold uppercase tracking-wide bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/40">
              New
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
