"use client";

import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
} from "lucide-react";
import PieChartWrapper from "./ui/PieChartWrapper";
import { InfoCard } from "./ui/InfoCard";
import { LineChart } from "@mui/x-charts/LineChart";
import { axisClasses } from "@mui/x-charts";
import { useTheme } from "@/context/ThemeContext";

const COLORS = [
  "#8B5CF6", // purple
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
];

const seasonOrder: Record<string, number> = {
  Spring: 1,
  Summer: 2,
  Fall: 3,
  Winter: 4,
};

const CHART_FONT =
  "var(--font-sf), ui-sans-serif, system-ui, -apple-system, sans-serif";

// Shared styling so every MUI x-chart matches the active theme + app font.
const makeLineChartSx = (isDark: boolean) => {
  const axisText = isDark ? "#9CA3AF" : "#4B5563";
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
    backgroundColor: "transparent",
  };
};

// Tooltip styling. The `sx` lands directly on the tooltip Paper, so the
// surface props go at the root; the cell colors need `!important` to beat
// MUI's default theme text color.
const makeChartTooltipSlotProps = (isDark: boolean) => {
  const surface = isDark ? "rgba(17, 24, 39, 0.97)" : "rgba(255, 255, 255, 0.98)";
  const border = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.08)";
  const primary = isDark ? "#F3F4F6" : "#111827";
  const secondary = isDark ? "#D1D5DB" : "#4B5563";
  const shadow = isDark
    ? "0 12px 32px rgba(0, 0, 0, 0.55)"
    : "0 12px 32px rgba(0, 0, 0, 0.18)";
  return {
    tooltip: {
      sx: {
        backgroundColor: surface,
        backgroundImage: "none",
        border: `1px solid ${border}`,
        borderRadius: "0.6rem",
        boxShadow: shadow,
        color: primary,
        fontFamily: CHART_FONT,
        overflow: "hidden",
        "& caption, & th, & td, & .MuiChartsTooltip-cell, & .MuiChartsTooltip-valueCell, & .MuiChartsTooltip-axisValueCell, & .MuiTypography-root":
          {
            color: `${primary} !important`,
            fontFamily: CHART_FONT,
            fontSize: "0.78rem",
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
      },
    },
  };
};

export default function StatsView({ courses }: { courses: Course[] }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const lineChartSx = makeLineChartSx(isDark);
  const chartTooltipSlotProps = makeChartTooltipSlotProps(isDark);
  const axisTickColor = isDark ? "#9CA3AF" : "#4B5563";
  const pieBorderColor = isDark ? "#0B1120" : "#FFFFFF";

  const activeCourses = courses.filter(
    (c) =>
      !c.skipped &&
      c.status !== "in-progress" &&
      c.grade &&
      gradePoints[c.grade],
  );

  const summary = activeCourses.reduce(
    (acc, c) => {
      acc.totalCredits += c.credits || 0;
      acc.totalGradePoints += gradePoints[c.grade!] * (c.credits || 1);
      return acc;
    },
    { totalCredits: 0, totalGradePoints: 0 },
  );

  const overallGpa =
    summary.totalCredits > 0
      ? summary.totalGradePoints / summary.totalCredits
      : 0;

  // Grade distribution
  const allGrades = Object.keys(gradePoints);
  const gradeDistribution = allGrades.map((grade) => {
    const count = activeCourses.filter((c) => c.grade === grade).length;
    return { grade, count };
  });

  // Semester data
  const semesterGroups = activeCourses.reduce(
    (acc, c) => {
      const key = `${c.semester} ${c.year}`;
      if (!acc[key]) {
        acc[key] = { credits: 0, points: 0, courses: [] };
      }
      acc[key].credits += c.credits || 0;
      acc[key].points += gradePoints[c.grade!] * (c.credits || 1);
      acc[key].courses.push(c);
      return acc;
    },
    {} as Record<
      string,
      { credits: number; points: number; courses: Course[] }
    >,
  );

  const semesterData = Object.entries(semesterGroups)
    .map(([semester, { credits, points, courses }]) => ({
      semester,
      gpa: credits > 0 ? parseFloat((points / credits).toFixed(2)) : 0,
      credits,
      courseCount: courses.length,
    }))
    .filter((item) => item.gpa > 0);

  const sortedSemData = semesterData.sort((a, b) => {
    const [sa, ya] = a.semester.split(" ");
    const [sb, yb] = b.semester.split(" ");
    const na = +ya,
      nb = +yb;
    if (na !== nb) return na - nb;
    return (seasonOrder[sa] || 0) - (seasonOrder[sb] || 0);
  });

  // Cumulative GPA data
  let cumCreds = 0,
    cumPts = 0;
  const cumulativeData = sortedSemData.map((entry) => {
    const semCourses = activeCourses.filter(
      (c) => `${c.semester} ${c.year}` === entry.semester,
    );
    const sc = semCourses.reduce((s, c) => s + (c.credits || 0), 0);
    const sp = semCourses.reduce(
      (s, c) => s + gradePoints[c.grade!] * (c.credits || 1),
      0,
    );
    cumCreds += sc;
    cumPts += sp;
    return {
      semester: entry.semester,
      cumulativeGpa: parseFloat((cumPts / cumCreds).toFixed(2)),
      credits: cumCreds,
    };
  });

  // Department data
  const departmentData = Object.entries(
    activeCourses.reduce(
      (acc, c) => {
        const dept = c.code.split(" ")[0];
        if (!acc[dept]) acc[dept] = { creds: 0, pts: 0, count: 0 };
        acc[dept].creds += c.credits || 0;
        acc[dept].pts += gradePoints[c.grade!] * (c.credits || 1);
        acc[dept].count += 1;
        return acc;
      },
      {} as Record<string, { creds: number; pts: number; count: number }>,
    ),
  )
    .map(([dept, d]) => ({
      department: dept,
      gpa: d.creds > 0 ? parseFloat((d.pts / d.creds).toFixed(2)) : 0,
      credits: d.creds,
      courseCount: d.count,
    }))
    .filter((dept) => dept.gpa > 0)
    .sort((a, b) => b.credits - a.credits);

  // Progress to graduation (assuming 120 credits needed)
  const progressToGraduation = Math.min(100, (summary.totalCredits / 36) * 100);

  const filteredGradeDistribution = gradeDistribution.filter(
    (g) => g.count > 0,
  );

  const creditChartData = {
    labels: departmentData.map((d) => d.department),
    datasets: [
      {
        data: departmentData.map((d) => d.credits),
        backgroundColor: departmentData.map(
          (_, i) => COLORS[i % COLORS.length],
        ),
        borderColor: Array(departmentData.length).fill(pieBorderColor),
        borderWidth: 2,
      },
    ],
  };

  const gradePieData = {
    labels: filteredGradeDistribution.map((g) => g.grade),
    datasets: [
      {
        data: filteredGradeDistribution.map((g) => g.count),
        backgroundColor: filteredGradeDistribution.map(
          (_, i) => COLORS[i % COLORS.length],
        ),
        borderColor: Array(filteredGradeDistribution.length).fill(pieBorderColor),
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className={`space-y-4 font-louize text-gray-800 dark:text-gray-200`}>
      {/* Summary Cards */}
      <InfoCard>
        We're actively working on new stats. Have any suggestions?{" "}
        <a
          href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
          className="text-pink-600 dark:text-white font-medium hover:underline hover:scale-110 inline-block transition-transform duration-200"
        >
          Let us know.
        </a>
      </InfoCard>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        <StatCard
          label="Cumulative GPA"
          value={overallGpa.toFixed(2)}
          color={getGPAColor(overallGpa.toFixed(2))}
          icon={<GraduationCap className="h-5 w-5" />}
          change={
            cumulativeData.length > 1
              ? cumulativeData[cumulativeData.length - 1].cumulativeGpa -
                cumulativeData[cumulativeData.length - 2].cumulativeGpa
              : 0
          }
          changeText="since last semester"
        />
        <StatCard
          label="Total Credits"
          value={summary.totalCredits}
          color={getCreditsColor(summary.totalCredits)}
          icon={<BookOpen className="h-5 w-5" />}
          secondaryLabel={`${progressToGraduation.toFixed(0)}% to graduation min`}
        />
        <StatCard
          label="Courses Completed"
          value={activeCourses.length}
          color="text-purple-300"
          icon={<Award className="h-5 w-5" />}
          secondaryLabel={`${gradeDistribution.reduce(
            (acc, g) => acc + g.count,
            0,
          )} grades recorded`}
        />
        <StatCard
          label="Average Credits/Semester"
          value={
            semesterData.length
              ? (
                  semesterData
                    .filter((elem) => !elem.semester.includes("Summer"))
                    .reduce((acc, s) => acc + s.credits, 0) /
                  semesterData.filter(
                    (elem) => !elem.semester.includes("Summer"),
                  ).length
                ).toFixed(1)
              : "0"
          }
          color="text-blue-300"
          icon={<Clock className="h-5 w-5" />}
          secondaryLabel={`Across your ${
            semesterData.filter((elem) => !elem.semester.includes("Summer"))
              .length
          } completed semesters`}
        />
      </motion.div>

      {/* Charts Grid (2 × 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Cumulative GPA Chart */}
        <ChartBox
          title="Cumulative GPA Progression"
          icon={<GraduationCap className="h-4 w-4" />}
          description="The overall progression of your cumulative GPA over time."
        >
          <div className="h-[230px] w-full">
            <LineChart
              xAxis={[
                {
                  scaleType: "point",
                  data: cumulativeData.map((item) => item.semester),
                  tickLabelStyle: {
                    angle: 45,
                    textAnchor: "start",
                    fontSize: 11,
                    fill: axisTickColor,
                  },
                },
              ]}
              yAxis={[
                {
                  label: "GPA",
                  min: Math.floor(
                    Math.min(
                      ...cumulativeData.map((item) => item.cumulativeGpa),
                    ),
                  ),
                  max: 4,
                  tickInterval: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
                },
              ]}
              series={[
                {
                  data: cumulativeData.map((item) => item.cumulativeGpa),
                  showMark: true,
                  color: "#8B5CF6", // purple
                  curve: "natural",
                  area: true,
                },
              ]}
              grid={{ vertical: true, horizontal: true }}
              margin={{ left: 55, right: 20, top: 16, bottom: 70 }}
              sx={lineChartSx}
              slotProps={chartTooltipSlotProps}
            />
          </div>
        </ChartBox>

        {/* Semester GPA Chart */}
        <ChartBox
          title="Semester GPA Performance"
          icon={<BookOpen className="h-4 w-4" />}
          description="Your GPA for each individual semester (in isolation)."
        >
          <div className="h-[230px] w-full">
            <LineChart
              xAxis={[
                {
                  scaleType: "point",
                  data: sortedSemData.map((item) => item.semester),
                  tickLabelStyle: {
                    angle: 45,
                    textAnchor: "start",
                    fontSize: 11,
                    fill: axisTickColor,
                  },
                },
              ]}
              yAxis={[
                {
                  label: "GPA",
                  min: Math.floor(
                    Math.min(...sortedSemData.map((item) => item.gpa)),
                  ),
                  max: 4,
                  tickInterval: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4],
                },
              ]}
              series={[
                {
                  data: sortedSemData.map((item) => item.gpa),
                  showMark: true,
                  color: "#3B82F6", // blue
                  area: true,
                },
              ]}
              grid={{ vertical: true, horizontal: true }}
              margin={{ left: 55, right: 20, top: 16, bottom: 70 }}
              sx={lineChartSx}
              slotProps={chartTooltipSlotProps}
            />
          </div>
        </ChartBox>

        {/* Credit Distribution Pie */}
        {departmentData.length > 0 && (
          <ChartBox
            title="Credit Distribution"
            icon={<PieChartIcon className="h-4 w-4" />}
            description="How your credits are spread across departments."
          >
            <div className="h-[230px] w-full">
              <PieChartWrapper data={creditChartData} showLegend={true} />
            </div>
          </ChartBox>
        )}

        {/* Grade Distribution Pie */}
        {filteredGradeDistribution.length > 0 && (
          <ChartBox
            title="Grade Distribution"
            icon={<RadarIcon className="h-4 w-4" />}
            description="A breakdown of the grades you've earned so far."
          >
            <div className="h-[230px] w-full">
              <PieChartWrapper data={gradePieData} showLegend={true} />
            </div>
          </ChartBox>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color = "text-white",
  icon,
  change = 0,
  changeText = null,
  secondaryLabel,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  change?: number;
  changeText?: string | null;
  secondaryLabel?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-neu-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-600 dark:text-gray-400">{label}</p>
        {icon && <div className={`${color} opacity-80`}>{icon}</div>}
      </div>
      <div className="flex items-end justify-between mt-1">
        <p className={`text-2xl font-medium ${color}`}>{value}</p>
      </div>
      {secondaryLabel && (
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
          {secondaryLabel}
        </p>
      )}
      {change !== 0 && (
        <p
          className={`text-xs mt-1 ${
            change > 0
              ? "text-emerald-400"
              : change > -0.05
                ? "text-gray-600 dark:text-gray-400"
                : "text-red-400"
          }`}
        >
          {change > 0 ? "+" : ""}
          {change.toFixed(2)}{" "}
          <span className="text-gray-600 dark:text-gray-400">{changeText}</span>
        </p>
      )}
    </motion.div>
  );
}

function ChartBox({
  title,
  children,
  icon,
  description,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  description?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 shadow-neu-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-medium text-base text-gray-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="text-[11px] leading-snug text-gray-600 dark:text-gray-400 mt-0.5">
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-1.5 rounded-full bg-gray-200/50 dark:bg-gray-800/50 text-blue-500 dark:text-blue-300">
            {icon}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function getGPAColor(gpa: string) {
  const numericGPA = parseFloat(gpa);
  if (numericGPA >= 3.7) return "text-emerald-400";
  if (numericGPA >= 3.3) return "text-blue-400";
  if (numericGPA >= 2.9) return "text-emerald-400";
  return "text-red-400";
}

function getCreditsColor(credits: number) {
  if (credits >= 32) return "text-emerald-400";
  if (credits >= 24) return "text-blue-400";
  if (credits >= 16) return "text-amber-400";
  return "text-red-400";
}
