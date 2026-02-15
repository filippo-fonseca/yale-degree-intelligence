"use client";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

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

  useEffect(() => {
    setIsMounted(true);
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
                  color: "#9CA3AF",
                  font: {
                    size: 11,
                  },
                  padding: 12,
                  usePointStyle: true,
                  pointStyle: "circle",
                },
              },
              tooltip: {
                backgroundColor: "rgba(17, 24, 39, 0.95)",
                titleColor: "#F3F4F6",
                bodyColor: "#D1D5DB",
                borderColor: "rgba(255, 255, 255, 0.1)",
                borderWidth: 1,
                cornerRadius: 8,
                padding: 10,
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
