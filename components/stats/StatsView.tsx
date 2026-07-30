"use client";

import { Course } from "@/lib/types";
import { motion } from "framer-motion";
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
import { useTheme } from "@/context/ThemeContext";
import { makeLineChartSx, makeChartTooltipSlotProps } from "./chartTheme";
import {
  StatCard,
  StatCardSkeleton,
  ChartCardSkeleton,
  EmptyState,
  gpaColor,
  creditsColor,
} from "./StatsPrimitives";
import { useStatsDerivedData } from "./useStatsDerivedData";
import { StatsChartsGrid } from "./StatsChartsGrid";

export default function StatsView({ courses }: { courses: Course[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const lineChartSx = makeLineChartSx(isDark);
  const chartTooltipSlotProps = makeChartTooltipSlotProps(isDark);
  const axisTickColor = isDark ? "#9CA3AF" : "#4B5563";
  const pieBorderColor = isDark ? "#0B1120" : "#FFFFFF";

  const data = useStatsDerivedData(courses, pieBorderColor);

  if (data.activeCourses.length === 0) {
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
    return <EmptyState inProgressCount={data.inProgressCount} />;
  }

  const {
    inProgressCount,
    overallGpa,
    summary,
    gradeDistribution,
    filteredGradeDistribution,
    sortedSemData,
    departmentData,
    progressToGraduation,
    bestSem,
    avgCreditsPerSem,
    gpaDelta,
    nonSummerSems,
  } = data;

  return (
    <div className="space-y-4 font-louize text-gray-800 dark:text-gray-200">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center -mt-1">
        {inProgressCount > 0 && (
          <>
            {inProgressCount} in progress
            <span className="mx-1.5">·</span>
          </>
        )}
        Only you can see your grades.
      </p>

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
          value={data.activeCourses.length}
          color="text-violet-600 dark:text-violet-300"
          icon={<Award className="h-3.5 w-3.5" />}
          sub={`${gradeDistribution.reduce((a, g) => a + g.count, 0)} grades recorded`}
        />
        {bestSem ? (
          <StatCard
            label="Best Semester"
            value={`${bestSem.gpa.toFixed(2)} GPA`}
            color="text-amber-600 dark:text-amber-300"
            icon={<Star className="h-3.5 w-3.5" />}
            sub={bestSem.semester}
          />
        ) : (
          <StatCard
            label="Avg Credits / Semester"
            value={avgCreditsPerSem > 0 ? avgCreditsPerSem.toFixed(1) : "-"}
            color="text-blue-600 dark:text-blue-300"
            icon={<Clock className="h-3.5 w-3.5" />}
            sub={`Across ${nonSummerSems.length} completed semesters`}
          />
        )}
      </motion.div>

      {bestSem && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.05 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3"
        >
          <StatCard
            label="Avg Credits / Semester"
            value={avgCreditsPerSem > 0 ? avgCreditsPerSem.toFixed(1) : "-"}
            color="text-blue-600 dark:text-blue-300"
            icon={<Clock className="h-3.5 w-3.5" />}
            sub={`Across ${nonSummerSems.length} semesters`}
          />
          <StatCard
            label="Departments Explored"
            value={departmentData.length}
            color="text-teal-600 dark:text-teal-300"
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
                : "-"
            }
            color="text-emerald-600 dark:text-emerald-300"
            icon={<BarChart2 className="h-3.5 w-3.5" />}
            sub="Most frequent grade"
          />
          <StatCard
            label="Semesters Completed"
            value={nonSummerSems.length}
            color="text-pink-600 dark:text-pink-300"
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

      <StatsChartsGrid
        data={data}
        isDark={isDark}
        lineChartSx={lineChartSx}
        chartTooltipSlotProps={chartTooltipSlotProps}
        axisTickColor={axisTickColor}
      />
    </div>
  );
}
