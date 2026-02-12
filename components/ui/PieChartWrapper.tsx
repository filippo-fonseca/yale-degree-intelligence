"use client";

import { Pie } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";

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
                    const total = context.dataset.data.reduce(
                      (a, b) => a + b,
                      0
                    );
                    const percentage = Math.round((value / total) * 100);
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
