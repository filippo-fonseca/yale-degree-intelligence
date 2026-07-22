export type ReqStatus = "completed" | "inProgress" | "partial" | "notStarted";

export type ReqStats = {
  req: any;
  reqCompleted: number;
  reqInProgress: number;
  notStarted: boolean;
};

/** Single source of truth for a requirement's status. */
export function getReqStatus(
  reqCompleted: number,
  reqInProgress: number,
  required: number,
): ReqStatus {
  // A 0-credit requirement (a "suggested" prerequisite) is only done once a
  // course actually satisfies it; 0 >= 0 must not read as completed.
  if (required <= 0) {
    if (reqCompleted > 0) return "completed";
    if (reqInProgress > 0) return "inProgress";
    return "notStarted";
  }
  if (reqCompleted >= required) return "completed";
  if (reqInProgress > 0) return "inProgress";
  if (reqCompleted > 0) return "partial";
  return "notStarted";
}

/**
 * Short human breakdown of a requirement's credit mix, e.g. "in progress",
 * "1 completed, 1 not started", "1 in progress, 1 not started". Returns null
 * when there's nothing useful to add (fully completed, or purely not started).
 */
export function getReqBreakdown(
  reqCompleted: number,
  reqInProgress: number,
  required: number,
): string | null {
  const completed = reqCompleted;
  const inProgress = reqInProgress;
  const notStarted = Math.max(0, required - completed - inProgress);

  // Everything left is in progress: reads cleaner without a number.
  if (inProgress > 0 && completed === 0 && notStarted === 0) return "in progress";

  const parts: string[] = [];
  if (completed > 0) parts.push(`${completed} completed`);
  if (inProgress > 0) parts.push(`${inProgress} in progress`);
  if (notStarted > 0) parts.push(`${notStarted} not started`);

  // A lone "n not started" just restates the x/y badge; skip it.
  if (parts.length < 2) return null;
  return parts.join(", ");
}

/** Fraction of the requirement satisfied by completed credits (0..1). */
export function getReqRatio(reqCompleted: number, required: number): number {
  if (required <= 0) return reqCompleted > 0 ? 1 : 0;
  return Math.min(1, reqCompleted / required);
}

type StatusClasses = {
  /** Outer card surface + border. */
  card: string;
  /** Requirement title text. */
  title: string;
  /** Count/credits badge. */
  badge: string;
  /** Requirement description text. */
  description: string;
  /** Accent text for column headers / labels. */
  accent: string;
};

export const STATUS_CLASSES: Record<ReqStatus, StatusClasses> = {
  completed: {
    card: "bg-emerald-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-emerald-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-emerald-200 dark:border-emerald-800/25 hover:border-emerald-300 dark:hover:border-emerald-600/35",
    title: "text-emerald-700 dark:text-emerald-300",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/30",
    description: "text-emerald-600 dark:text-emerald-300/70",
    accent: "text-emerald-600 dark:text-emerald-300",
  },
  inProgress: {
    card: "bg-blue-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-gray-900/50 dark:to-gray-950/50 border-blue-200 dark:border-blue-800/30 hover:border-blue-300 dark:hover:border-blue-600/40",
    title: "text-blue-600 dark:text-blue-300",
    badge:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-300 dark:border-blue-700/30",
    description: "text-blue-500 dark:text-blue-300/70",
    accent: "text-blue-600 dark:text-blue-300",
  },
  partial: {
    card: "bg-amber-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-amber-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-amber-200 dark:border-amber-800/30 hover:border-amber-300 dark:hover:border-amber-600/40",
    title: "text-amber-700 dark:text-amber-300",
    badge:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/30",
    description: "text-amber-600 dark:text-amber-300/70",
    accent: "text-amber-600 dark:text-amber-300",
  },
  notStarted: {
    card: "bg-red-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-red-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-red-200 dark:border-red-800/25 hover:border-red-300 dark:hover:border-red-600/35",
    title: "text-red-600 dark:text-red-300",
    badge:
      "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700/30",
    description: "text-red-500 dark:text-red-300/70",
    accent: "text-red-600 dark:text-red-300",
  },
};

/**
 * Heat-map cell color. In-progress requirements get a blue tint; otherwise the
 * cell ramps from red (0%) through amber (partial) to green (complete).
 */
export function getHeatCellClasses(status: ReqStatus, ratio: number): string {
  if (status === "completed")
    return "bg-emerald-500/90 dark:bg-emerald-500/80 border-emerald-600/40 text-white";
  if (status === "inProgress")
    return "bg-blue-500/80 dark:bg-blue-500/70 border-blue-600/40 text-white";
  if (status === "partial") {
    if (ratio >= 0.66)
      return "bg-amber-400/90 dark:bg-amber-500/70 border-amber-600/40 text-amber-950 dark:text-white";
    if (ratio >= 0.33)
      return "bg-amber-300/90 dark:bg-amber-600/50 border-amber-500/40 text-amber-950 dark:text-amber-50";
    return "bg-orange-300/80 dark:bg-orange-700/40 border-orange-500/40 text-orange-950 dark:text-orange-50";
  }
  return "bg-red-200/80 dark:bg-red-900/40 border-red-400/40 text-red-900 dark:text-red-200";
}
