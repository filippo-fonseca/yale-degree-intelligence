import { axisClasses } from "@mui/x-charts";

// App palette aligned with emerald/blue/amber/red status colors
export const DEPT_COLORS = [
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

export const seasonOrder: Record<string, number> = {
  Spring: 1,
  Summer: 2,
  Fall: 3,
  Winter: 4,
};

export const CHART_FONT =
  "var(--font-sf), ui-sans-serif, system-ui, -apple-system, sans-serif";

export const makeLineChartSx = (isDark: boolean) => {
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

export const makeChartTooltipSlotProps = (isDark: boolean) => {
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
