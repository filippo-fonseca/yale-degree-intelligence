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
      className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-gradient-to-b from-white via-white to-white/0 dark:from-gray-950 dark:via-gray-950 dark:to-gray-950/0 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            View:
          </span>
          <button
            type="button"
            onClick={() => setView("board")}
            data-tour="major-board-toggle"
            className={`px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              view === "board"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
            }`}
          >
            Board
          </button>
          <button
            type="button"
            onClick={() => setView("heatmap")}
            data-tour="major-heatmap-toggle"
            className={`inline-flex items-center px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              view === "heatmap"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800/50"
            }`}
          >
            Heat map
            <span className="ml-1 px-1 py-0.5 rounded text-[8px] font-semibold uppercase tracking-wide bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-300 border border-fuchsia-500/40">
              New
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
