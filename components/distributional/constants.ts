// ─── Constants ────────────────────────────────────────────────────────────────

export const AREA_REQS = [
  { code: "Hu", name: "Humanities & Arts", color: "purple" },
  { code: "So", name: "Social Sciences", color: "sky" },
  { code: "Sc", name: "Sciences", color: "emerald" },
] as const;

export const SKILL_REQS = [
  { code: "QR", name: "Quantitative Reasoning", color: "red" },
  { code: "WR", name: "Writing", color: "orange" },
] as const;

export const LANG_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

// Per-distributional color tokens that match getDistPillStyle palette
// but work for full card surfaces (not just pills).
export const CARD_COLORS: Record<
  string,
  {
    bar: string;
    ring: string;
    label: string;
    badge: string;
  }
> = {
  purple: {
    bar: "#a855f7",
    ring: "border-purple-300 dark:border-purple-700/50",
    label: "text-purple-700 dark:text-purple-300",
    badge: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700/40",
  },
  sky: {
    bar: "#38bdf8",
    ring: "border-sky-300 dark:border-sky-700/50",
    label: "text-sky-700 dark:text-sky-300",
    badge: "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border border-sky-300 dark:border-sky-700/40",
  },
  emerald: {
    bar: "#34d399",
    ring: "border-emerald-300 dark:border-emerald-700/50",
    label: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/40",
  },
  red: {
    bar: "#f87171",
    ring: "border-red-300 dark:border-red-700/50",
    label: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700/40",
  },
  orange: {
    bar: "#fb923c",
    ring: "border-orange-300 dark:border-orange-700/50",
    label: "text-orange-700 dark:text-orange-300",
    badge: "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-700/40",
  },
};

// Per-distributional hex colors for pie slices (matches CARD_COLORS + pill palette)
export const DIST_PIE_COLORS: Record<string, string> = {
  Hu: "#a855f7",   // purple
  So: "#38bdf8",   // sky
  Sc: "#34d399",   // emerald
  QR: "#f87171",   // red
  WR: "#fb923c",   // orange
  Language: "#2dd4bf", // teal (L1-L5)
};

export const DIST_SLICES = [
  { code: "Hu", label: "Humanities (Hu)" },
  { code: "So", label: "Social Sciences (So)" },
  { code: "Sc", label: "Sciences (Sc)" },
  { code: "QR", label: "Quant. Reasoning (QR)" },
  { code: "WR", label: "Writing (WR)" },
  { code: "Language", label: "Language (L)" },
] as const;

export const DIST_HEAT_ITEMS = [
  ...AREA_REQS.map((r) => ({ ...r, target: 2 })),
  ...SKILL_REQS.map((r) => ({ ...r, target: 2 })),
];

export const DIST_STATUS_LABEL: Record<string, string> = {
  completed: "Met",
  inProgress: "In progress",
  partial: "Partial",
  notStarted: "Not started",
};
