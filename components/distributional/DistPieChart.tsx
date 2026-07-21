"use client";

import { Course } from "@/lib/types";
import { motion } from "framer-motion";
import { PieChart } from "@mui/x-charts/PieChart";
import { useTheme } from "@/context/ThemeContext";
import { CHART_FONT, makeChartTooltipSlotProps } from "./chartTheme";
import { DIST_PIE_COLORS, DIST_SLICES } from "./constants";

// ─── Distributional Breakdown Pie Chart ───────────────────────────────────────

export function DistPieChart({ distMap }: { distMap: Record<string, Course[]> }) {
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
      className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu"
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
          <span className="text-xs px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700/50">
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
            Tag courses in the My courses tab to see a breakdown here.
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
