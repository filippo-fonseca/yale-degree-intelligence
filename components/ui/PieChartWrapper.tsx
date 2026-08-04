"use client";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";
import { useTheme } from "@/context/ThemeContext";

ChartJS.register(ArcElement, Tooltip, Legend);

const CHART_FONT =
  "var(--font-sf), ui-sans-serif, system-ui, -apple-system, sans-serif";

interface PieChartWrapperProps {
  data: {
    labels: string[];
    datasets: {
      data: number[];
      backgroundColor: string[];
      borderColor?: string[];
      borderWidth?: number;
    }[];
  };
  title?: string;
  showLegend?: boolean;
}

export default function PieChartWrapper({
  data,
  title,
  showLegend = true,
}: PieChartWrapperProps) {
  const [isMounted, setIsMounted] = useState(false);
  /**
   * Read the theme off the <html> class rather than from context.
   *
   * Chart.js paints the legend into a canvas, so its color is baked in at draw
   * time and cannot inherit anything from CSS. That makes it the one place a
   * disagreement between context state and the class actually on the document
   * shows up as unreadable text, which is what happened here: dark page, legend
   * drawn in the light-mode gray. Reading the class is the same source of truth
   * the rest of the page paints from, so the two cannot diverge, and the
   * observer keeps it correct when the theme toggle flips the class.
   */
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    const root = document.documentElement;
    const sync = () => setIsDark(root.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Check for valid data
  const hasValidData =
    data?.labels?.length > 0 &&
    data?.datasets?.[0]?.data?.length > 0 &&
    data.datasets[0].data.some((v) => v > 0);

  if (!isMounted) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-500 text-sm">Loading chart...</div>
      </div>
    );
  }

  if (!hasValidData) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-gray-500 text-sm">No data available</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      {title && (
        <h3 className="text-lg font-medium mb-2 text-center">{title}</h3>
      )}
      <div className="flex-1 min-h-0">
        <Pie
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            layout: {
              padding: {
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              },
            },
            plugins: {
              legend: {
                display: showLegend,
                position: "bottom",
                labels: {
                  color: isDark ? "#9CA3AF" : "#4B5563",
                  font: {
                    size: 11,
                    family: CHART_FONT,
                  },
                  padding: 10,
                  usePointStyle: true,
                  pointStyle: "circle",
                },
              },
              tooltip: {
                backgroundColor: isDark
                  ? "rgba(17, 24, 39, 0.97)"
                  : "rgba(255, 255, 255, 0.98)",
                titleColor: isDark ? "#F3F4F6" : "#111827",
                bodyColor: isDark ? "#E5E7EB" : "#374151",
                borderColor: isDark
                  ? "rgba(255, 255, 255, 0.12)"
                  : "rgba(0, 0, 0, 0.08)",
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
                titleFont: {
                  family: CHART_FONT,
                  size: 12,
                  weight: "bold",
                },
                bodyFont: {
                  family: CHART_FONT,
                  size: 12,
                },
                callbacks: {
                  label: (context) => {
                    const label = context.label || "";
                    const value = context.raw as number;
                    const dataArr = context.dataset?.data;
                    if (!dataArr || !Array.isArray(dataArr)) {
                      return `${label}: ${value}`;
                    }
                    const total = dataArr.reduce(
                      (a: number, b: unknown) => a + (typeof b === "number" ? b : 0),
                      0
                    );
                    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                    return `${label}: ${value} (${percentage}%)`;
                  },
                },
              },
            },
          }}
        />
      </div>
    </div>
  );
}
