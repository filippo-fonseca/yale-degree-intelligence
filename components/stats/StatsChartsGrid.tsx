"use client";

import {
  GraduationCap,
  BookOpen,
  Award,
  TrendingUp,
  BarChart2,
} from "lucide-react";
import { LineChart } from "@mui/x-charts/LineChart";
import { BarChart } from "@mui/x-charts/BarChart";
import { safeGpaChartYMin } from "@/lib/utils/academicStats";
import PieChartWrapper from "../ui/PieChartWrapper";
import { ChartCard } from "./StatsPrimitives";
import { DeptCreditPieChart } from "./DeptCreditPieChart";
import { makeChartTooltipSlotProps } from "./chartTheme";
import type { StatsDerivedData } from "./useStatsDerivedData";

interface StatsChartsGridProps {
  data: StatsDerivedData;
  isDark: boolean;
  lineChartSx: ReturnType<typeof import("./chartTheme").makeLineChartSx>;
  chartTooltipSlotProps: ReturnType<typeof makeChartTooltipSlotProps>;
  axisTickColor: string;
}

export function StatsChartsGrid({
  data,
  isDark,
  lineChartSx,
  chartTooltipSlotProps,
  axisTickColor,
}: StatsChartsGridProps) {
  const {
    cumulativeData,
    sortedSemData,
    departmentData,
    filteredGradeDistribution,
    creditPieData,
    gradePieData,
    cumulativeGpas,
    semesterGpas,
    canRenderCumulativeChart,
    canRenderSemesterChart,
  } = data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-tour="stats-charts">
      <ChartCard
        title="Cumulative GPA Progression"
        description="How your overall GPA has trended across semesters."
        icon={<GraduationCap className="h-3.5 w-3.5" />}
      >
        {!canRenderCumulativeChart ? (
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
                  min: safeGpaChartYMin(cumulativeGpas),
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

      <ChartCard
        title="Per-Semester GPA"
        description="Your GPA for each individual semester in isolation."
        icon={<BookOpen className="h-3.5 w-3.5" />}
      >
        {!canRenderSemesterChart ? (
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
                  min: safeGpaChartYMin(semesterGpas),
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
  );
}
