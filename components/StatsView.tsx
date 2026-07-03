"use client";

import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  BarChart2,
  Star,
  Layers,
} from "lucide-react";
import PieChartWrapper from "./ui/PieChartWrapper";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import { axisClasses } from "@mui/x-charts";
import { useTheme } from "@/context/ThemeContext";
import { Skeleton } from "@/components/ui/Skeleton";
import { FiInfo } from "react-icons/fi";

// App palette aligned with emerald/blue/amber/red status colors
const DEPT_COLORS = [
  "#8B5CF6", // violet
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
  "#EF4444", // red
  "#84CC16", // lime
];

const seasonOrder: Record<string, number> = {
  Spring: 1,
  Summer: 2,
  Fall: 3,
  Winter: 4,
};

const CHART_FONT =
  "var(--font-sf), ui-sans-serif, system-ui, -apple-system, sans-serif";

// ──────────────────────────────────────────────
// Chart theme helpers
// ──────────────────────────────────────────────
const makeLineChartSx = (isDark: boolean) => {
  const axisText = isDark ? "#9CA3AF" : "#4B5563";
  const legendText = isDark ? "#D1D5DB" : "#374151";
  const gridLine = isDark ? "#374151" : "#E5E7EB";
  return {
    fontFamily: CHART_FONT,
    [`.${axisClasses.left} .${axisClasses.label}`]: {
      transform: "translate(-20px, 0)",
      fill: axisText,
    },
    [`.${axisClasses.bottom} .${axisClasses.label}`]: {
      transform: "translate(0, 60px)",
      fill: axisText,
    },
    [`.${axisClasses.root} line`]: {
      stroke: gridLine,
      opacity: isDark ? 0.3 : 0.8,
    },
    [`.${axisClasses.root} text`]: {
      fill: axisText,
      fontFamily: CHART_FONT,
    },
    // Series legend (e.g. "Cumulative GPA") is HTML, not SVG, and inherits
    // MUI's default light-theme text color, so it renders black in dark mode.
    // Force a theme-aware color on the legend root and its label spans.
    ".MuiChartsLegend-root, .MuiChartsLegend-series, .MuiChartsLegend-label, .MuiChartsLabel-root":
      {
        color: `${legendText} !important`,
        fontFamily: CHART_FONT,
      },
    backgroundColor: "transparent",
  };
};

const makeChartTooltipSlotProps = (isDark: boolean) => {
  const surface = isDark ? "#0f172a" : "rgba(255, 255, 255, 0.98)";
  const border = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)";
  const primary = isDark ? "#F3F4F6" : "#111827";
  const secondary = isDark ? "#D1D5DB" : "#4B5563";
  const shadow = isDark
    ? "0 12px 32px rgba(0, 0, 0, 0.55)"
    : "0 12px 32px rgba(0, 0, 0, 0.18)";
  const tooltipSx = {
    // Target the Paper element that MUI x-charts renders inside the Popper
    backgroundColor: `${surface} !important`,
    backgroundImage: "none !important",
    border: `1px solid ${border}`,
    borderRadius: "0.6rem",
    boxShadow: shadow,
    color: `${primary} !important`,
    fontFamily: CHART_FONT,
    overflow: "hidden",
    // Cover all text-bearing descendant elements
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
    "& caption": { borderColor: border },
    "& .MuiChartsTooltip-mark": { borderColor: border },
    "& .MuiPaper-root, & .MuiChartsTooltip-paper, & .MuiChartsTooltip-table": {
      backgroundColor: `${surface} !important`,
      backgroundImage: "none !important",
      color: `${primary} !important`,
    },
    // Ensure table rows/cells don't get their own background in dark mode
    "& tr, & tbody": {
      backgroundColor: "transparent !important",
    },
  };
  return {
    tooltip: { sx: tooltipSx },
    // Also target the popper paper directly via the `paper` slot when available
    popper: {
      sx: {
        "& .MuiChartsTooltip-root": {
          backgroundColor: `${surface} !important`,
          backgroundImage: "none !important",
          color: `${primary} !important`,
        },
        "& .MuiChartsTooltip-paper": {
          backgroundColor: `${surface} !important`,
          backgroundImage: "none !important",
          color: `${primary} !important`,
        },
      },
    },
  };
};

// ──────────────────────────────────────────────
// Sub-components
// ──────────────────────────────────────────────

/** Matches the MajorStatCard pattern exactly. */
function StatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  icon,
  sub,
  delta,
  deltaText,
  tooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  sub?: string;
  delta?: number;
  deltaText?: string;
  tooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 hover:border-gray-300 dark:hover:border-gray-700/60 transition-all relative shadow-neu"
    >
      {tooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-gray-800/50 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {tooltip}
          </div>
        </div>
      )}
      <div className="flex items-center gap-1.5 mb-0.5">
        {icon && (
          <span className={`${color} opacity-70`}>{icon}</span>
        )}
        <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      </div>
      <p className={`text-lg font-medium ${color}`}>{value}</p>
      {sub && (
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
          {sub}
        </p>
      )}
      {delta !== undefined && delta !== 0 && deltaText && (
        <p
          className={`text-[11px] mt-0.5 ${
            delta > 0
              ? "text-emerald-500 dark:text-emerald-400"
              : delta > -0.05
              ? "text-gray-400 dark:text-gray-500"
              : "text-red-500 dark:text-red-400"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta.toFixed(2)}{" "}
          <span className="text-gray-400 dark:text-gray-500">{deltaText}</span>
        </p>
      )}
    </motion.div>
  );
}

/** Chart container matching the My Major surface style. */
function ChartCard({
  title,
  description,
  icon,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu ${className}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-sm text-gray-900 dark:text-white leading-snug">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 shrink-0 ml-2">
            {icon}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

/** Skeleton shimmer for a single stat card. */
function StatCardSkeleton() {
  return (
    <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu">
      <Skeleton className="h-3 w-24 mb-2" rounded="rounded" />
      <Skeleton className="h-6 w-16 mb-1.5" rounded="rounded" />
      <Skeleton className="h-2.5 w-20" rounded="rounded" />
    </div>
  );
}

/** Skeleton shimmer for a chart card. */
function ChartCardSkeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu ${className}`}
    >
      <Skeleton className="h-4 w-40 mb-1" rounded="rounded" />
      <Skeleton className="h-2.5 w-56 mb-4" rounded="rounded" />
      <Skeleton className="h-[200px] w-full" />
    </div>
  );
}

/** Empty state when no graded courses exist. */
function EmptyState() {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0 }}
        className="flex flex-col items-center justify-center py-20 text-center gap-4"
      >
        <div className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-blue-500/10 border border-violet-200 dark:border-violet-800/30">
          <GraduationCap className="h-10 w-10 text-violet-400 dark:text-violet-300" />
        </div>
        <div>
          <p className="text-base font-medium text-gray-800 dark:text-gray-200">
            No graded courses yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
            Once you've added courses with grades, your academic stats will
            appear here.
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Animated donut pie chart for credit distribution by department.
 * Styled to match the DistPieChart on the distributionals page.
 */
function DeptCreditPieChart({
  data,
  isDark,
  tooltipSlotProps,
}: {
  data: { id: number; value: number; label: string; color: string }[];
  isDark: boolean;
  tooltipSlotProps: ReturnType<typeof makeChartTooltipSlotProps>;
}) {
  const totalCredits = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative h-full w-full overflow-hidden"
    >
      {/* Centered total label — anchored over the donut region (left of the legend) */}
      <div className="pointer-events-none absolute inset-y-0 left-0 right-[112px] z-10 flex flex-col items-center justify-center">
        <span className="text-xl font-semibold text-gray-900 dark:text-white leading-none">
          {totalCredits}
        </span>
        <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
          credits
        </span>
      </div>
      <PieChart
        series={[
          {
            data,
            innerRadius: 45,
            outerRadius: 90,
            paddingAngle: 3,
            cornerRadius: 4,
            highlightScope: { fade: "global", highlight: "item" },
            faded: { innerRadius: 30, additionalRadius: -4, color: "gray" },
          },
        ]}
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
    </motion.div>
  );
}

// ──────────────────────────────────────────────
// GPA color (numeric)
// ──────────────────────────────────────────────
function gpaColor(gpa: number): string {
  if (gpa >= 3.7) return "text-emerald-600 dark:text-emerald-400";
  if (gpa >= 3.3) return "text-blue-600 dark:text-blue-400";
  if (gpa >= 2.7) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function creditsColor(credits: number): string {
  if (credits >= 32) return "text-emerald-600 dark:text-emerald-400";
  if (credits >= 24) return "text-blue-600 dark:text-blue-400";
  if (credits >= 16) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

// ──────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────
export default function StatsView({ courses }: { courses: Course[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const lineChartSx = makeLineChartSx(isDark);
  const chartTooltipSlotProps = makeChartTooltipSlotProps(isDark);
  const axisTickColor = isDark ? "#9CA3AF" : "#4B5563";
  const pieBorderColor = isDark ? "#0B1120" : "#FFFFFF";

  // ── Derived data (all math kept exactly as before) ──────────────────────

  const activeCourses = courses.filter(
    (c) =>
      !c.skipped &&
      c.status !== "in-progress" &&
      c.grade &&
      gradePoints[c.grade],
  );

  const summary = activeCourses.reduce(
    (acc, c) => {
      acc.totalCredits += c.credits || 0;
      acc.totalGradePoints += gradePoints[c.grade!] * (c.credits || 1);
      return acc;
    },
    { totalCredits: 0, totalGradePoints: 0 },
  );

  const overallGpa =
    summary.totalCredits > 0
      ? summary.totalGradePoints / summary.totalCredits
      : 0;

  // Grade distribution
  const allGrades = Object.keys(gradePoints);
  const gradeDistribution = allGrades.map((grade) => {
    const count = activeCourses.filter((c) => c.grade === grade).length;
    return { grade, count };
  });
  const filteredGradeDistribution = gradeDistribution.filter((g) => g.count > 0);

  // Semester groups
  const semesterGroups = activeCourses.reduce(
    (acc, c) => {
      const key = `${c.semester} ${c.year}`;
      if (!acc[key]) acc[key] = { credits: 0, points: 0, courses: [] };
      acc[key].credits += c.credits || 0;
      acc[key].points += gradePoints[c.grade!] * (c.credits || 1);
      acc[key].courses.push(c);
      return acc;
    },
    {} as Record<string, { credits: number; points: number; courses: Course[] }>,
  );

  const semesterData = Object.entries(semesterGroups)
    .map(([semester, { credits, points, courses }]) => ({
      semester,
      gpa: credits > 0 ? parseFloat((points / credits).toFixed(2)) : 0,
      credits,
      courseCount: courses.length,
    }))
    .filter((item) => item.gpa > 0);

  const sortedSemData = semesterData.sort((a, b) => {
    const [sa, ya] = a.semester.split(" ");
    const [sb, yb] = b.semester.split(" ");
    const na = +ya, nb = +yb;
    if (na !== nb) return na - nb;
    return (seasonOrder[sa] || 0) - (seasonOrder[sb] || 0);
  });

  // Cumulative GPA
  let cumCreds = 0, cumPts = 0;
  const cumulativeData = sortedSemData.map((entry) => {
    const semCourses = activeCourses.filter(
      (c) => `${c.semester} ${c.year}` === entry.semester,
    );
    const sc = semCourses.reduce((s, c) => s + (c.credits || 0), 0);
    const sp = semCourses.reduce(
      (s, c) => s + gradePoints[c.grade!] * (c.credits || 1),
      0,
    );
    cumCreds += sc;
    cumPts += sp;
    return {
      semester: entry.semester,
      cumulativeGpa: parseFloat((cumPts / cumCreds).toFixed(2)),
      credits: cumCreds,
    };
  });

  // Department breakdown
  const departmentData = Object.entries(
    activeCourses.reduce(
      (acc, c) => {
        const dept = c.code.split(" ")[0];
        if (!acc[dept]) acc[dept] = { creds: 0, pts: 0, count: 0 };
        acc[dept].creds += c.credits || 0;
        acc[dept].pts += gradePoints[c.grade!] * (c.credits || 1);
        acc[dept].count += 1;
        return acc;
      },
      {} as Record<string, { creds: number; pts: number; count: number }>,
    ),
  )
    .map(([dept, d]) => ({
      department: dept,
      gpa: d.creds > 0 ? parseFloat((d.pts / d.creds).toFixed(2)) : 0,
      credits: d.creds,
      courseCount: d.count,
    }))
    .filter((dept) => dept.gpa > 0)
    .sort((a, b) => b.credits - a.credits);

  // Progress to graduation (36-credit Yale minimum)
  const progressToGraduation = Math.min(100, (summary.totalCredits / 36) * 100);

  // Best semester GPA
  const nonSummerSems = sortedSemData.filter(
    (s) => !s.semester.includes("Summer"),
  );
  const bestSem =
    nonSummerSems.length > 0
      ? nonSummerSems.reduce((best, s) => (s.gpa > best.gpa ? s : best))
      : null;

  // Average credits per (non-summer) semester
  const avgCreditsPerSem =
    nonSummerSems.length > 0
      ? nonSummerSems.reduce((acc, s) => acc + s.credits, 0) /
        nonSummerSems.length
      : 0;

  // GPA delta vs last semester
  const gpaDelta =
    cumulativeData.length > 1
      ? cumulativeData[cumulativeData.length - 1].cumulativeGpa -
        cumulativeData[cumulativeData.length - 2].cumulativeGpa
      : 0;

  // Pie data — MUI x-charts shape for the animated donut.
  const creditPieData = departmentData.map((d, i) => ({
    id: i,
    value: d.credits,
    label: d.department,
    color: DEPT_COLORS[i % DEPT_COLORS.length],
  }));

  const gradePieData = {
    labels: filteredGradeDistribution.map((g) => g.grade),
    datasets: [
      {
        data: filteredGradeDistribution.map((g) => g.count),
        backgroundColor: filteredGradeDistribution.map((_, i) => DEPT_COLORS[i % DEPT_COLORS.length]),
        borderColor: Array(filteredGradeDistribution.length).fill(pieBorderColor),
        borderWidth: 2,
      },
    ],
  };

  // ── Early states ────────────────────────────────────────────────────────

  if (activeCourses.length === 0) {
    // No courses prop yet means data is still loading: show skeletons.
    // A populated-but-ungraded course list means there is nothing to chart yet.
    if (courses.length === 0) {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <StatCardSkeleton key={i} />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
            <ChartCardSkeleton />
          </div>
        </div>
      );
    }
    return <EmptyState />;
  }

  // ── Full view ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 font-louize text-gray-800 dark:text-gray-200">

      {/* ── Stat Cards ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          label="Cumulative GPA"
          value={overallGpa.toFixed(2)}
          color={gpaColor(overallGpa)}
          icon={<GraduationCap className="h-3.5 w-3.5" />}
          delta={gpaDelta}
          deltaText="since last semester"
          tooltip="Weighted GPA across all graded, completed courses."
        />
        <StatCard
          label="Total Credits"
          value={summary.totalCredits}
          color={creditsColor(summary.totalCredits)}
          icon={<BookOpen className="h-3.5 w-3.5" />}
          sub={`${progressToGraduation.toFixed(0)}% to graduation min`}
          tooltip="Counts only completed, non-skipped courses with a recorded grade."
        />
        <StatCard
          label="Courses Completed"
          value={activeCourses.length}
          color="text-violet-600 dark:text-violet-300"
          icon={<Award className="h-3.5 w-3.5" />}
          sub={`${gradeDistribution.reduce((a, g) => a + g.count, 0)} grades recorded`}
        />
        {bestSem ? (
          <StatCard
            label="Best Semester"
            value={`${bestSem.gpa.toFixed(2)} GPA`}
            color="text-amber-600 dark:text-amber-400"
            icon={<Star className="h-3.5 w-3.5" />}
            sub={bestSem.semester}
          />
        ) : (
          <StatCard
            label="Avg Credits / Semester"
            value={avgCreditsPerSem > 0 ? avgCreditsPerSem.toFixed(1) : "—"}
            color="text-blue-600 dark:text-blue-400"
            icon={<Clock className="h-3.5 w-3.5" />}
            sub={`Across ${nonSummerSems.length} completed semesters`}
          />
        )}
      </motion.div>

      {/* Secondary stats row */}
      {bestSem && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatCard
            label="Avg Credits / Semester"
            value={avgCreditsPerSem > 0 ? avgCreditsPerSem.toFixed(1) : "—"}
            color="text-blue-600 dark:text-blue-400"
            icon={<Clock className="h-3.5 w-3.5" />}
            sub={`Across ${nonSummerSems.length} semesters`}
          />
          <StatCard
            label="Departments Explored"
            value={departmentData.length}
            color="text-teal-600 dark:text-teal-400"
            icon={<Layers className="h-3.5 w-3.5" />}
            sub="Unique subject areas"
          />
          <StatCard
            label="Highest Grade Count"
            value={
              filteredGradeDistribution.length > 0
                ? (() => {
                    const top = filteredGradeDistribution.reduce((a, b) =>
                      b.count > a.count ? b : a,
                    );
                    return `${top.grade} (${top.count}×)`;
                  })()
                : "—"
            }
            color="text-emerald-600 dark:text-emerald-400"
            icon={<BarChart2 className="h-3.5 w-3.5" />}
            sub="Most frequent grade"
          />
          <StatCard
            label="Semesters Completed"
            value={nonSummerSems.length}
            color="text-pink-600 dark:text-pink-400"
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            sub={
              sortedSemData.length - nonSummerSems.length > 0
                ? `plus ${sortedSemData.length - nonSummerSems.length} ${
                    sortedSemData.length - nonSummerSems.length === 1
                      ? "summer"
                      : "summers"
                  }`
                : undefined
            }
          />
        </motion.div>
      )}

      {/* ── Charts ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-tour="stats-charts">

        {/* Cumulative GPA Trend */}
        <ChartCard
          title="Cumulative GPA Progression"
          description="How your overall GPA has trended across semesters."
          icon={<GraduationCap className="h-3.5 w-3.5" />}
        >
          {cumulativeData.length < 2 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              Need at least two semesters of data.
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <LineChart
                xAxis={[
                  {
                    scaleType: "point",
                    data: cumulativeData.map((d) => d.semester),
                    tickLabelStyle: {
                      angle: 40,
                      textAnchor: "start",
                      fontSize: 10,
                      fill: axisTickColor,
                    },
                  },
                ]}
                yAxis={[
                  {
                    label: "GPA",
                    min: Math.max(
                      0,
                      Math.floor(
                        Math.min(...cumulativeData.map((d) => d.cumulativeGpa)) * 2,
                      ) / 2,
                    ),
                    max: 4,
                    tickInterval: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
                  },
                ]}
                series={[
                  {
                    data: cumulativeData.map((d) => d.cumulativeGpa),
                    showMark: true,
                    color: "#8B5CF6",
                    curve: "natural",
                    area: true,
                    label: "Cumulative GPA",
                  },
                ]}
                grid={{ vertical: false, horizontal: true }}
                margin={{ left: 50, right: 16, top: 12, bottom: 64 }}
                sx={lineChartSx}
                slotProps={chartTooltipSlotProps}
              />
            </div>
          )}
        </ChartCard>

        {/* Per-Semester GPA */}
        <ChartCard
          title="Per-Semester GPA"
          description="Your GPA for each individual semester in isolation."
          icon={<BookOpen className="h-3.5 w-3.5" />}
        >
          {sortedSemData.length === 0 ? (
            <div className="h-[220px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-500">
              No semester data yet.
            </div>
          ) : (
            <div className="h-[220px] w-full">
              <LineChart
                xAxis={[
                  {
                    scaleType: "point",
                    data: sortedSemData.map((d) => d.semester),
                    tickLabelStyle: {
                      angle: 40,
                      textAnchor: "start",
                      fontSize: 10,
                      fill: axisTickColor,
                    },
                  },
                ]}
                yAxis={[
                  {
                    label: "GPA",
                    min: Math.max(
                      0,
                      Math.floor(
                        Math.min(...sortedSemData.map((d) => d.gpa)) * 2,
                      ) / 2,
                    ),
                    max: 4,
                    tickInterval: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
                  },
                ]}
                series={[
                  {
                    data: sortedSemData.map((d) => d.gpa),
                    showMark: true,
                    color: "#3B82F6",
                    area: true,
                    label: "Semester GPA",
                  },
                ]}
                grid={{ vertical: false, horizontal: true }}
                margin={{ left: 50, right: 16, top: 12, bottom: 64 }}
                sx={lineChartSx}
                slotProps={chartTooltipSlotProps}
              />
            </div>
          )}
        </ChartCard>

        {/* Department GPA Bar Chart (replaces simple pie for richer data) */}
        {departmentData.length > 0 && (
          <ChartCard
            title="GPA by Department"
            description="Your weighted GPA in each subject area you've taken."
            icon={<BarChart2 className="h-3.5 w-3.5" />}
          >
            <div className="h-[220px] w-full">
              <BarChart
                xAxis={[
                  {
                    scaleType: "band",
                    data: departmentData.map((d) => d.department),
                    tickLabelStyle: {
                      fontSize: 10,
                      fill: axisTickColor,
                      angle: departmentData.length > 6 ? 35 : 0,
                      textAnchor: departmentData.length > 6 ? "start" : "middle",
                    },
                  },
                ]}
                yAxis={[
                  {
                    label: "GPA",
                    min: 0,
                    max: 4,
                    tickInterval: [0, 1, 2, 3, 4],
                  },
                ]}
                series={[
                  {
                    data: departmentData.map((d) => d.gpa),
                    color: "#10B981",
                    label: "GPA",
                  },
                ]}
                grid={{ horizontal: true }}
                margin={{
                  left: 50,
                  right: 16,
                  top: 12,
                  bottom: departmentData.length > 6 ? 72 : 40,
                }}
                sx={lineChartSx}
                slotProps={chartTooltipSlotProps}
              />
            </div>
          </ChartCard>
        )}

        {/* Credit Distribution Pie */}
        {departmentData.length > 0 && (
          <ChartCard
            title="Credit Distribution by Department"
            description="How your credits are spread across subject areas."
            icon={<TrendingUp className="h-3.5 w-3.5" />}
          >
            <div className="h-[220px] w-full">
              <DeptCreditPieChart
                data={creditPieData}
                isDark={isDark}
                tooltipSlotProps={chartTooltipSlotProps}
              />
            </div>
          </ChartCard>
        )}

        {/* Grade Distribution Pie */}
        {filteredGradeDistribution.length > 0 && (
          <ChartCard
            title="Grade Distribution"
            description="A breakdown of every grade you've earned."
            icon={<Award className="h-3.5 w-3.5" />}
            className="lg:col-span-2"
          >
            <div className="h-[220px] w-full">
              <PieChartWrapper data={gradePieData} showLegend />
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}
