"use client";

import { motion } from "framer-motion";
import { PieChart } from "@mui/x-charts/PieChart";
import { CHART_FONT, makeChartTooltipSlotProps } from "./chartTheme";

/**
 * Animated donut pie chart for credit distribution by department.
 * Styled to match the DistPieChart on the distributionals page.
 */
export function DeptCreditPieChart({
  data,
  tooltipSlotProps,
}: {
  data: { id: number; value: number; label: string; color: string }[];
  isDark: boolean;
  tooltipSlotProps: ReturnType<typeof makeChartTooltipSlotProps>;
}) {
  const totalCredits = data.reduce((sum, d) => sum + d.value, 0);

  // Fixed square for the donut so it stays a perfect circle, is fully
  // contained in the 220px-tall card, and can be exactly centered under the
  // total label. The legend is rendered as flowing HTML beside it so it never
  // clips (MUI's in-SVG legend is disabled).
  const DONUT = 180; // px, 2 * outerRadius

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex h-full w-full items-center justify-center gap-3"
    >
      {/* Donut + centered total label */}
      <div
        className="relative shrink-0"
        style={{ width: DONUT, height: DONUT }}
      >
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center">
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
              outerRadius: DONUT / 2,
              paddingAngle: 3,
              cornerRadius: 4,
              highlightScope: { fade: "global", highlight: "item" },
              faded: { innerRadius: 30, additionalRadius: -4, color: "gray" },
            },
          ]}
          width={DONUT}
          height={DONUT}
          hideLegend
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          slotProps={tooltipSlotProps}
          sx={{ fontFamily: CHART_FONT }}
        />
      </div>

      {/* Custom HTML legend — flows/wraps, never clips */}
      <ul className="flex min-w-0 flex-col gap-1.5">
        {data.map((d) => (
          <li key={d.id} className="flex items-center gap-1.5 text-[11px]">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: d.color }}
            />
            <span className="truncate text-gray-600 dark:text-gray-300">
              {d.label}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
