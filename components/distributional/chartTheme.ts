// ─── Chart helpers ────────────────────────────────────────────────────────────

export const CHART_FONT =
  "var(--font-sf), ui-sans-serif, system-ui, -apple-system, sans-serif";

export const makeChartTooltipSlotProps = (isDark: boolean) => {
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
