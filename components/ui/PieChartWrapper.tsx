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
  showLegend?: boolean; // Add this prop
}

export default function PieChartWrapper({
  data,
  title,
  showLegend = true, // Default to true
}: PieChartWrapperProps) {
  return (
    <div className="w-full h-full p-4">
      <h3 className="text-lg font-medium mb-4 text-center">{title}</h3>
      <div className="h-[300px]">
        <Pie
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                display: showLegend, // Control visibility here
                position: "right",
                labels: {
                  color: "#E5E7EB",
                  font: {
                    size: 12,
                  },
                },
              },
              tooltip: {
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
