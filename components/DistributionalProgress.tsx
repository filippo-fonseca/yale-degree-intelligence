"use client";

import { Course } from "@/lib/types";
import { getCourseNameFromCode } from "@/lib/courseCatalog";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { FiCheck, FiInfo, FiGrid, FiList, FiZap, FiSliders } from "react-icons/fi";
import { getDistPillStyle } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  allocateDistributionals,
  type DistAllocation,
} from "@/lib/distributionalAllocation";
import {
  getReqStatus,
  getReqRatio,
  getHeatCellClasses,
  STATUS_CLASSES,
} from "./MajorProgressView/requirementStatus";
import { PieChart } from "@mui/x-charts/PieChart";
import { useTheme } from "@/context/ThemeContext";
import { Skeleton } from "@/components/ui/Skeleton";

// ─── Constants ────────────────────────────────────────────────────────────────

const AREA_REQS = [
  { code: "Hu", name: "Humanities & Arts", color: "purple" },
  { code: "So", name: "Social Sciences", color: "sky" },
  { code: "Sc", name: "Sciences", color: "emerald" },
] as const;

const SKILL_REQS = [
  { code: "QR", name: "Quantitative Reasoning", color: "red" },
  { code: "WR", name: "Writing", color: "orange" },
] as const;

const LANG_LEVELS = ["L1", "L2", "L3", "L4", "L5"] as const;

// Per-distributional color tokens that match getDistPillStyle palette
// but work for full card surfaces (not just pills).
const CARD_COLORS: Record<
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

// ─── Chart helpers ────────────────────────────────────────────────────────────

const CHART_FONT =
  "var(--font-sf), ui-sans-serif, system-ui, -apple-system, sans-serif";

// Per-distributional hex colors for pie slices (matches CARD_COLORS + pill palette)
const DIST_PIE_COLORS: Record<string, string> = {
  Hu: "#a855f7",   // purple
  So: "#38bdf8",   // sky
  Sc: "#34d399",   // emerald
  QR: "#f87171",   // red
  WR: "#fb923c",   // orange
  Language: "#2dd4bf", // teal (L1-L5)
};

const makeChartTooltipSlotProps = (isDark: boolean) => {
  const surface = isDark ? "#0f172a" : "rgba(255, 255, 255, 0.98)";
  const border = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)";
  const primary = isDark ? "#F3F4F6" : "#111827";
  const secondary = isDark ? "#D1D5DB" : "#4B5563";
  const shadow = isDark
    ? "0 12px 32px rgba(0, 0, 0, 0.55)"
    : "0 12px 32px rgba(0, 0, 0, 0.18)";
  return {
    tooltip: {
      sx: {
        backgroundColor: `${surface} !important`,
        backgroundImage: "none !important",
        border: `1px solid ${border}`,
        borderRadius: "0.6rem",
        boxShadow: shadow,
        color: `${primary} !important`,
        fontFamily: CHART_FONT,
        overflow: "hidden",
        "& *": {
          color: `${primary} !important`,
          fontFamily: CHART_FONT,
        },
        "& caption, & th, & td, & .MuiChartsTooltip-cell, & .MuiChartsTooltip-valueCell, & .MuiChartsTooltip-axisValueCell, & .MuiTypography-root":
          {
            color: `${primary} !important`,
            fontFamily: CHART_FONT,
            fontSize: "0.78rem",
            backgroundColor: "transparent !important",
          },
        "& .MuiChartsTooltip-labelCell": {
          color: `${secondary} !important`,
        },
        "& caption": {
          borderColor: border,
        },
        "& .MuiChartsTooltip-mark": {
          borderColor: border,
        },
        "& .MuiPaper-root, & .MuiChartsTooltip-paper, & .MuiChartsTooltip-table": {
          backgroundColor: `${surface} !important`,
          backgroundImage: "none !important",
          color: `${primary} !important`,
        },
        "& tr, & tbody": {
          backgroundColor: "transparent !important",
        },
      },
    },
    popper: {
      sx: {
        "& .MuiChartsTooltip-root, & .MuiChartsTooltip-paper, & .MuiPaper-root":
          {
            backgroundColor: `${surface} !important`,
            backgroundImage: "none !important",
            color: `${primary} !important`,
          },
      },
    },
  };
};

// ─── Distributional Breakdown Pie Chart ───────────────────────────────────────

const DIST_SLICES = [
  { code: "Hu", label: "Humanities (Hu)" },
  { code: "So", label: "Social Sciences (So)" },
  { code: "Sc", label: "Sciences (Sc)" },
  { code: "QR", label: "Quant. Reasoning (QR)" },
  { code: "WR", label: "Writing (WR)" },
  { code: "Language", label: "Language (L)" },
] as const;

function DistPieChart({ distMap }: { distMap: Record<string, Course[]> }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const tooltipSlotProps = makeChartTooltipSlotProps(isDark);

  // Count tags per category; group L1-L5 under "Language"
  const langCount = ["L1", "L2", "L3", "L4", "L5"].reduce(
    (sum, l) => sum + (distMap[l] || []).length,
    0,
  );

  const rawCounts: Record<string, number> = {
    Hu: (distMap["Hu"] || []).length,
    So: (distMap["So"] || []).length,
    Sc: (distMap["Sc"] || []).length,
    QR: (distMap["QR"] || []).length,
    WR: (distMap["WR"] || []).length,
    Language: langCount,
  };

  const pieData = DIST_SLICES
    .map((s, i) => ({
      id: i,
      value: rawCounts[s.code],
      label: s.label,
      color: DIST_PIE_COLORS[s.code],
    }))
    .filter((s) => s.value > 0);

  const totalTags = pieData.reduce((sum, s) => sum + s.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl neu-surface backdrop-blur-md"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">
            Distributional breakdown
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            All distributional tags across your courses
          </p>
        </div>
        {totalTags > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-md neu-inset text-gray-500 dark:text-gray-400">
            {totalTags} total tags
          </span>
        )}
      </div>

      {totalTags === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No distributional tags yet.
          </p>
          <p className="text-[11px] text-gray-400 dark:text-gray-600 mt-1">
            Tag courses in the My Courses tab to see a breakdown here.
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto overflow-y-hidden">
          <PieChart
            series={[
              {
                data: pieData,
                innerRadius: 45,
                outerRadius: 90,
                paddingAngle: 3,
                cornerRadius: 4,
                highlightScope: { fade: "global", highlight: "item" },
                faded: { innerRadius: 30, additionalRadius: -4, color: "gray" },
              },
            ]}
            width={340}
            height={220}
            margin={{ top: 8, right: 112, bottom: 8, left: 0 }}
            slotProps={{
              ...tooltipSlotProps,
              legend: {
                position: { vertical: "middle" as const, horizontal: "end" as const },
              },
            }}
            sx={{
              fontFamily: CHART_FONT,
              "& .MuiChartsLegend-root text, & .MuiChartsLegend-series text, & .MuiChartsLegend-label, & .MuiChartsLegend-label text":
                {
                  fontFamily: `${CHART_FONT} !important`,
                  fill: `${isDark ? "#D1D5DB" : "#4B5563"} !important`,
                },
            }}
          />
        </div>
      )}
    </motion.div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function DistStatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  infoTooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  infoTooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl neu-surface-sm backdrop-blur-md hover:-translate-y-0.5 transition-all relative"
    >
      {infoTooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 neu-surface-sm backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {infoTooltip}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-medium mt-0.5 ${color}`}>{value}</p>
    </motion.div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="p-4 rounded-xl neu-surface-sm">
      <div className="flex items-center justify-between mb-3">
        <Skeleton rounded="rounded-lg" className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton rounded="rounded-full" className="h-2 w-full mb-2" />
      <Skeleton className="h-3 w-24" />
    </div>
  );
}

function DistributionalsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} rounded="rounded-xl" className="h-20" />
        ))}
      </div>
      {/* View toggle */}
      <Skeleton rounded="rounded-xl" className="h-9 w-48" />
      {/* Requirement cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

// ─── Heat-map grid for distributionals ────────────────────────────────────────

const DIST_HEAT_ITEMS = [
  ...AREA_REQS.map((r) => ({ ...r, target: 2 })),
  ...SKILL_REQS.map((r) => ({ ...r, target: 2 })),
];

const DIST_STATUS_LABEL: Record<string, string> = {
  completed: "Met",
  inProgress: "In progress",
  partial: "Partial",
  notStarted: "Not started",
};

function DistHeatMap({
  getCount,
}: {
  getCount: (code: string) => number;
}) {
  return (
    <div className="p-4 rounded-xl neu-surface backdrop-blur-md">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {[
          { label: "Met", swatch: "bg-emerald-500" },
          { label: "Partial", swatch: "bg-amber-400" },
          { label: "Not started", swatch: "bg-red-300" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded ${item.swatch}`} aria-hidden />
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.label}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-5 gap-2">
        {DIST_HEAT_ITEMS.map((item) => {
          const count = getCount(item.code);
          const status = getReqStatus(count, 0, item.target);
          const ratio = getReqRatio(count, item.target);
          const cellClasses = getHeatCellClasses(status, ratio);

          return (
            <div key={item.code} className="relative group">
              <div
                className={`flex flex-col items-center justify-center aspect-square rounded-xl border p-2 ${cellClasses}`}
              >
                <span className="text-sm font-bold">{item.code}</span>
                <span className="text-[10px] opacity-80 mt-0.5">{Math.min(count, item.target)}/{item.target}</span>
              </div>
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none absolute z-20 bottom-full mb-1 left-1/2 -translate-x-1/2 neu-surface-sm backdrop-blur-sm rounded-lg text-gray-700 dark:text-gray-200 p-2 whitespace-nowrap">
                <p className="text-[11px] font-bold">{item.name}</p>
                <p className="text-[10px] opacity-75 mt-0.5">{DIST_STATUS_LABEL[status]} · {count}/{item.target} credits</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Individual Requirement Card ──────────────────────────────────────────────

function DistReqCard({
  req,
  count,
  courses: coursesForReq,
  target = 2,
  manual = false,
  allocation,
  onReassign,
}: {
  req: { code: string; name: string; color: string };
  count: number;
  courses: Course[];
  target?: number;
  manual?: boolean;
  allocation?: DistAllocation;
  onReassign?: (courseCode: string, reqCode: string) => void;
}) {
  const fulfilled = count >= target;
  const progress = Math.min(count / target, 1);
  const colors = CARD_COLORS[req.color] ?? CARD_COLORS.purple;

  // Use STATUS_CLASSES for card surface theming
  const status = getReqStatus(count, 0, target);
  const statusClasses = STATUS_CLASSES[status];

  // Pill from constants (matches the rest of the app)
  const pillStyle = getDistPillStyle(req.code);

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`p-4 rounded-xl border transition-all relative backdrop-blur-md shadow-neu ${statusClasses.card}`}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={`text-sm font-semibold px-2.5 py-1 rounded-lg border ${pillStyle}`}>
            {req.code}
          </span>
          <span className={`text-sm font-medium ${statusClasses.title}`}>{req.name}</span>
        </div>
        {fulfilled ? (
          <span className="text-emerald-500 dark:text-emerald-400">
            <FiCheck size={18} strokeWidth={3} />
          </span>
        ) : (
          <span className={`text-xs px-1.5 py-0.5 rounded-md ${statusClasses.badge}`}>
            {Math.min(count, target)}/{target}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 neu-inset rounded-full overflow-hidden mb-2">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            backgroundColor: fulfilled ? "#34d399" : colors.bar,
          }}
        />
      </div>

      {/* Ratio text */}
      <div className="flex justify-between items-center mb-0">
        <span className={`text-xs ${statusClasses.description}`}>
          {Math.min(count, target)} of {target} credits
        </span>
        {count > target && (
          <span className="text-xs text-gray-400 dark:text-gray-500">(+{count - target} extra)</span>
        )}
      </div>

      {/* Course list */}
      {coursesForReq.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-800/50 space-y-1.5">
          {coursesForReq.map((course) => {
            const options =
              allocation?.optionsByCourseKey[allocation.keyOf(course)] ?? [];
            const canReassign = manual && options.length > 1 && onReassign;
            return (
              <div
                key={course.id}
                className="flex items-center justify-between gap-2"
              >
                <span className="text-xs text-gray-700 dark:text-gray-300 font-medium">
                  {course.code}
                </span>
                {canReassign ? (
                  <select
                    value={req.code}
                    onChange={(e) => onReassign!(course.code, e.target.value)}
                    className="text-[11px] rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900/80 text-gray-700 dark:text-gray-200 px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    title="Count this course toward a different requirement"
                  >
                    {options.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs text-gray-400 dark:text-gray-500 truncate ml-2 max-w-[150px] text-right">
                    {getCourseNameFromCode(course.code)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

// ─── Language section ─────────────────────────────────────────────────────────

function LanguageSection({
  distMap,
}: {
  distMap: Record<string, Course[]>;
}) {
  const getCount = (code: string) => (distMap[code] || []).length;
  const getCoursesFor = (code: string): Course[] => distMap[code] || [];

  const taggedLevels = LANG_LEVELS.filter((l) => getCount(l) > 0);
  const placementLevel =
    taggedLevels.length > 0
      ? Math.min(...taggedLevels.map((l) => parseInt(l.slice(1))))
      : null;

  const getRequiredLevels = (placement: number): string[] => {
    switch (placement) {
      case 1: return ["L1", "L2", "L3"];
      case 2: return ["L2", "L3", "L4"];
      case 3: return ["L3", "L4"];
      case 4: return ["L4"];
      case 5: return ["L5"];
      default: return [];
    }
  };

  const requiredLevels = placementLevel ? getRequiredLevels(placementLevel) : [];
  const completedRequired = requiredLevels.filter((l) => getCount(l) > 0);
  const progress =
    requiredLevels.length > 0 ? completedRequired.length / requiredLevels.length : 0;
  const isComplete =
    requiredLevels.length > 0 &&
    completedRequired.length === requiredLevels.length;
  const nextNeeded = requiredLevels.find((l) => getCount(l) === 0);

  // Derive status for header card styling
  const langStatus = isComplete
    ? "completed"
    : placementLevel !== null && completedRequired.length > 0
    ? "partial"
    : "notStarted";
  const langStatusClasses = STATUS_CLASSES[langStatus];

  return (
    <div>
      <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
        Language
      </h3>

      <div className={`p-4 rounded-xl border transition-all backdrop-blur-md shadow-neu ${langStatusClasses.card}`}>
        {/* Placement + progress */}
        {placementLevel !== null && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Placed into{" "}
                <span className="text-teal-600 dark:text-teal-300 font-semibold">
                  L{placementLevel}
                </span>
              </span>
              {isComplete && (
                <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30">
                  Complete
                </span>
              )}
            </div>
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
              {Math.round(progress * 100)}%
            </span>
          </div>
        )}

        {placementLevel !== null && (
          <div className="w-full h-2 neu-inset rounded-full overflow-hidden mb-4">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{ backgroundColor: isComplete ? "#34d399" : "#2dd4bf" }}
            />
          </div>
        )}

        {/* L-level track */}
        <div className="relative py-2 mb-4">
          <div className="absolute top-[22px] left-[10%] right-[10%] h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full" />
          <div className="relative flex justify-between px-2">
            {LANG_LEVELS.map((level) => {
              const levelNum = parseInt(level.slice(1));
              const hasLevel = getCount(level) > 0;
              const coursesForLevel = getCoursesFor(level);
              const isRequired = requiredLevels.includes(level);
              const isNext = level === nextNeeded;
              const isNotNeeded = placementLevel !== null && !isRequired;

              let circleClass = "";
              let showCheck = false;
              let subLabel = "";

              if (hasLevel) {
                circleClass =
                  "bg-teal-500/20 border-teal-400 text-teal-600 dark:text-teal-300 shadow-[0_0_12px_rgba(45,212,191,0.15)]";
                showCheck = true;
              } else if (isNext) {
                circleClass =
                  "bg-amber-500/20 border-amber-400 text-amber-600 dark:text-amber-300 ring-2 ring-amber-400/30 ring-offset-2 ring-offset-white dark:ring-offset-gray-900";
                subLabel = "Next";
              } else if (isRequired) {
                circleClass =
                  "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600 text-gray-500 dark:text-gray-400";
                subLabel = "Needed";
              } else if (isNotNeeded) {
                circleClass =
                  "bg-white/50 dark:bg-gray-900/50 border-gray-300 dark:border-gray-800 text-gray-400 dark:text-gray-600";
                subLabel = levelNum < (placementLevel ?? 0) ? "Placed out" : "";
              } else {
                circleClass =
                  "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500";
              }

              return (
                <div key={level} className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 z-10 transition-all ${circleClass}`}
                  >
                    {showCheck ? <FiCheck size={16} strokeWidth={3} /> : level.slice(1)}
                  </div>
                  <span
                    className={`text-xs mt-1.5 font-medium ${
                      hasLevel
                        ? "text-teal-600 dark:text-teal-300"
                        : isNext
                        ? "text-amber-600 dark:text-amber-300"
                        : isRequired
                        ? "text-gray-500 dark:text-gray-400"
                        : "text-gray-400 dark:text-gray-600"
                    }`}
                  >
                    {level}
                  </span>
                  {coursesForLevel.length > 0 ? (
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 max-w-[70px] truncate text-center">
                      {coursesForLevel[0].code}
                    </span>
                  ) : subLabel ? (
                    <span
                      className={`text-[10px] mt-0.5 ${
                        isNext
                          ? "text-amber-500 dark:text-amber-400 font-medium"
                          : "text-gray-400 dark:text-gray-600"
                      }`}
                    >
                      {subLabel}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status message */}
        {placementLevel === null ? (
          <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 mb-3">
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Tag your first language course to track your progress. Your placement level will be inferred from the lowest L-level you tag.
            </p>
          </div>
        ) : !isComplete && nextNeeded ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 mb-3">
            <p className="text-xs text-amber-600 dark:text-amber-300">
              <strong>Next up:</strong> Complete an{" "}
              <span className="font-semibold">{nextNeeded}</span> course.
              {requiredLevels.length - completedRequired.length > 1 && (
                <> Then: {requiredLevels.filter((l) => getCount(l) === 0 && l !== nextNeeded).join(", ")}.</>
              )}
            </p>
          </div>
        ) : isComplete ? (
          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
            <p className="text-xs text-emerald-600 dark:text-emerald-300">
              Language requirement complete for your L{placementLevel} placement.
            </p>
          </div>
        ) : null}

        {/* Info note */}
        <div className="p-3 rounded-lg bg-gray-100/50 dark:bg-gray-800/30 border border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-2">
            <FiInfo className="text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" size={14} />
            <p className="text-xs text-gray-500 dark:text-gray-500 leading-relaxed">
              Requirements by placement:{" "}
              <span className="text-gray-600 dark:text-gray-400">L1 → L1–L3</span>{" "}
              |{" "}
              <span className="text-gray-600 dark:text-gray-400">L2 → L2–L4</span>{" "}
              |{" "}
              <span className="text-gray-600 dark:text-gray-400">L3 → L3–L4</span>{" "}
              |{" "}
              <span className="text-gray-600 dark:text-gray-400">L4/L5 → just that course</span>.
              Placement is inferred from your lowest tagged level. Verify with your dean or DUS.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-4">
        <FiGrid className="text-blue-400 dark:text-blue-300" size={28} />
      </div>
      <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-2">
        No distributionals tagged yet
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs leading-relaxed">
        Head to the <span className="font-semibold text-gray-700 dark:text-gray-200">My Courses</span> tab and click{" "}
        <span className="font-mono text-blue-500 dark:text-blue-300">+ dist</span> on your courses to start tracking requirements.
      </p>
    </motion.div>
  );
}

// ─── Allocation control ───────────────────────────────────────────────────────

function AllocationControl({
  auto,
  onToggle,
}: {
  auto: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <div className="p-3 rounded-xl neu-surface flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="flex items-start gap-2.5">
        <FiInfo
          className="text-purple-500 dark:text-purple-300 mt-0.5 flex-shrink-0"
          size={15}
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Some courses are tagged for more than one area or skill, but each
          course can only count toward <span className="font-medium text-gray-700 dark:text-gray-300">one</span>.
          {auto
            ? " Auto-allocate picks the split that satisfies the most requirements."
            : " Use the dropdowns below to choose where each course counts."}
        </p>
      </div>
      <div className="inline-flex shrink-0 rounded-lg neu-inset p-0.5">
        <button
          type="button"
          onClick={() => onToggle(true)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-all ${
            auto
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
              : "text-gray-400 dark:text-gray-500 border border-transparent hover:text-gray-600 dark:hover:text-gray-400"
          }`}
        >
          <FiZap size={11} />
          Auto
        </button>
        <button
          type="button"
          onClick={() => onToggle(false)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-md transition-all ${
            !auto
              ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
              : "text-gray-400 dark:text-gray-500 border border-transparent hover:text-gray-600 dark:hover:text-gray-400"
          }`}
        >
          <FiSliders size={11} />
          Manual
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

const DistributionalsView = ({ courses }: { courses: Course[] }) => {
  const { user } = useAuth();
  const [view, setView] = useState<"board" | "heatmap">("board");
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Load the user's saved allocation preferences once.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!active || !snap.exists()) return;
        const data = snap.data() as {
          distributionalAutoAllocate?: boolean;
          distributionalAllocations?: Record<string, string>;
        };
        if (typeof data.distributionalAutoAllocate === "boolean")
          setAutoAllocate(data.distributionalAutoAllocate);
        if (data.distributionalAllocations)
          setOverrides(data.distributionalAllocations);
      } catch {
        // non-fatal: fall back to auto allocation
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const persist = (
    nextAuto: boolean,
    nextOverrides: Record<string, string>,
  ) => {
    if (!user) return;
    setDoc(
      doc(db, "users", user.uid),
      {
        distributionalAutoAllocate: nextAuto,
        distributionalAllocations: nextOverrides,
      },
      { merge: true },
    ).catch(() => {
      // non-fatal: UI state is already updated optimistically
    });
  };

  const setAuto = (next: boolean) => {
    setAutoAllocate(next);
    persist(next, overrides);
  };

  const reassign = (courseCode: string, reqCode: string) => {
    const next = { ...overrides, [courseCode]: reqCode };
    setOverrides(next);
    persist(autoAllocate, next);
  };

  // Data still resolving: render a polished skeleton instead of blank space.
  if (!courses) {
    return <DistributionalsLoadingSkeleton />;
  }

  // Build raw distributional -> courses map (used for languages + the pie,
  // which intentionally show every tag, not the single-counted allocation).
  const distMap: Record<string, Course[]> = {};
  courses.forEach((course) => {
    if (course.skipped) return;
    (course.distributionals || []).forEach((d) => {
      if (!distMap[d]) distMap[d] = [];
      distMap[d].push(course);
    });
  });

  const getCount = (code: string) => (distMap[code] || []).length;
  const getCoursesFor = (code: string): Course[] => distMap[code] || [];

  // Single-allocation for the 5 area/skill requirements: each course counts once.
  const allocation = allocateDistributionals(courses, {
    auto: autoAllocate,
    overrides,
  });
  const allocCount = (code: string) =>
    (allocation.coursesByReq[code] || []).length;
  const allocCoursesFor = (code: string): Course[] =>
    allocation.coursesByReq[code] || [];

  // A course is reassignable only if it is eligible for more than one req.
  const hasMultiTagCourses = courses.some(
    (c) =>
      !c.skipped &&
      (allocation.optionsByCourseKey[allocation.keyOf(c)]?.length ?? 0) > 1,
  );

  const hasAnyDistributionals = courses.some(
    (c) => (c.distributionals || []).length > 0,
  );

  // Summary stats (based on the single-allocation, not raw tags)
  const metCount = [...AREA_REQS, ...SKILL_REQS].filter(
    (r) => allocCount(r.code) >= 2,
  ).length;
  const inProgressCount = [...AREA_REQS, ...SKILL_REQS].filter(
    (r) => allocCount(r.code) > 0 && allocCount(r.code) < 2,
  ).length;
  const remainingCount = [...AREA_REQS, ...SKILL_REQS].filter(
    (r) => allocCount(r.code) === 0,
  ).length;

  // Language progress for stat card
  const taggedLevels = LANG_LEVELS.filter((l) => getCount(l) > 0);
  const placementLevel =
    taggedLevels.length > 0
      ? Math.min(...taggedLevels.map((l) => parseInt(l.slice(1))))
      : null;
  const getRequiredLevels = (placement: number): string[] => {
    switch (placement) {
      case 1: return ["L1", "L2", "L3"];
      case 2: return ["L2", "L3", "L4"];
      case 3: return ["L3", "L4"];
      case 4: return ["L4"];
      case 5: return ["L5"];
      default: return [];
    }
  };
  const requiredLevels = placementLevel ? getRequiredLevels(placementLevel) : [];
  const completedRequired = requiredLevels.filter((l) => getCount(l) > 0);
  const langComplete = requiredLevels.length > 0 && completedRequired.length === requiredLevels.length;
  const langStatusText =
    placementLevel === null
      ? "Not started"
      : langComplete
      ? "Complete"
      : `${completedRequired.length}/${requiredLevels.length} levels`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
          Your distributional progress.
        </h2>
        <p className="text-sm lg:text-base text-gray-600 dark:text-gray-400 mt-1">
          Track your progress toward Yale's distributional requirements.
        </p>
      </div>

      {/* Summary stat cards (MajorStatCard pattern) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <DistStatCard
          label="Total Requirements Completed"
          value={`${metCount}/5`}
          color="text-emerald-600 dark:text-emerald-300"
          infoTooltip="Areas (Hu, So, Sc) and skills (QR, WR) where you've reached at least 2 credits."
        />
        <DistStatCard
          label="In Progress"
          value={inProgressCount}
          color="text-blue-600 dark:text-blue-300"
          infoTooltip="Requirements where you have 1 credit tagged but haven't hit the 2-credit target yet."
        />
        <DistStatCard
          label="Not Started"
          value={remainingCount}
          color={remainingCount === 0 ? "text-emerald-600 dark:text-emerald-300" : "text-red-500 dark:text-red-400"}
        />
        <DistStatCard
          label="Language"
          value={langStatusText}
          color={langComplete ? "text-emerald-600 dark:text-emerald-300" : "text-teal-600 dark:text-teal-300"}
          infoTooltip="Language-requirement progress based on your placement level."
        />
      </div>

      {/* Overall progress bar */}
      <div className="p-3 rounded-xl neu-surface">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Areas & Skills Overall
          </span>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {metCount}/5 requirements met
          </span>
        </div>
        <div className="relative w-full bg-gray-200 dark:bg-gray-800/70 rounded-full h-2 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(metCount / 5) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.75)]"
          />
        </div>
      </div>

      {/* Distributional breakdown pie chart */}
      <div data-tour="distributionals-breakdown">
        <DistPieChart distMap={distMap} />
      </div>

      {/* Empty state */}
      {!hasAnyDistributionals && <EmptyState />}

      {/* View switcher */}
      {hasAnyDistributionals && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            View:
          </span>
          <button
            type="button"
            onClick={() => setView("board")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              view === "board"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400"
            }`}
          >
            <FiList size={11} />
            Board
          </button>
          <button
            type="button"
            onClick={() => setView("heatmap")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg transition-all duration-200 ${
              view === "heatmap"
                ? "bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-600/40"
                : "bg-gray-100 dark:bg-gray-900/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-800/50 hover:text-gray-600 dark:hover:text-gray-400"
            }`}
          >
            <FiGrid size={11} />
            Heat map
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === "heatmap" && hasAnyDistributionals ? (
          <motion.div
            key="heatmap"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            <DistHeatMap getCount={allocCount} />
          </motion.div>
        ) : hasAnyDistributionals ? (
          <motion.div
            key="board"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* Allocation control */}
            {hasMultiTagCourses && (
              <AllocationControl
                auto={autoAllocate}
                onToggle={setAuto}
              />
            )}

            {/* Areas */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Areas
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {AREA_REQS.map((req) => (
                  <DistReqCard
                    key={req.code}
                    req={req}
                    count={allocCount(req.code)}
                    courses={allocCoursesFor(req.code)}
                    manual={!autoAllocate}
                    allocation={allocation}
                    onReassign={reassign}
                  />
                ))}
              </div>
            </div>

            {/* Skills */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Skills
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SKILL_REQS.map((req) => (
                  <DistReqCard
                    key={req.code}
                    req={req}
                    count={allocCount(req.code)}
                    courses={allocCoursesFor(req.code)}
                    manual={!autoAllocate}
                    allocation={allocation}
                    onReassign={reassign}
                  />
                ))}
              </div>
            </div>

            {/* Language */}
            <LanguageSection distMap={distMap} />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Info footer */}
      <div className="p-4 rounded-xl bg-gray-100/50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-800/50">
        <div className="flex items-start gap-3">
          <FiInfo className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
          <div className="text-sm text-gray-500 dark:text-gray-400 space-y-1">
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Areas</span> require 2
              credits each in Humanities &amp; Arts (Hu), Social Sciences (So), and Sciences (Sc).
            </p>
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Skills</span> require 2
              credits each in Quantitative Reasoning (QR) and Writing (WR).
            </p>
            <p>
              <span className="text-gray-700 dark:text-gray-300 font-medium">Single counting:</span>{" "}
              a course tagged for more than one area or skill only counts toward{" "}
              <span className="font-medium">one</span> of them.{" "}
              <span className="font-medium text-purple-600 dark:text-purple-300">Auto</span> picks the
              split that satisfies the most requirements; switch to{" "}
              <span className="font-medium text-purple-600 dark:text-purple-300">Manual</span> to choose
              each course's requirement yourself with the dropdowns on the cards.
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              This data is based on your manual tagging. Always verify with your dean or DUS.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DistributionalsView;
