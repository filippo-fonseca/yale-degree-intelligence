"use client";

import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  BarChart2,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
} from "lucide-react";
import PieChartWrapper from "./ui/PieChartWrapper";
import { InfoCard } from "./ui/InfoCard";
import { LineChart } from "@mui/x-charts/LineChart";
import { axisClasses } from "@mui/x-charts";

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

export default function StatsView({ courses }: { courses: Course[] }) {
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

  const gradeChartData = {
    labels: filteredGradeDistribution.map((g) => g.grade),
    datasets: [
      {
        data: filteredGradeDistribution.map((g) => g.count),
        backgroundColor: COLORS.slice(0, filteredGradeDistribution.length),
        borderColor: "#1F2937",
        borderWidth: 1,
      },
    ],
  };

  const creditChartData = {
    labels: departmentData.map((d) => d.department),
    datasets: [
      {
        data: departmentData.map((d) => d.credits),
        backgroundColor: COLORS,
        borderColor: "#1F2937",
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className={`space-y-8 font-louize text-gray-800 dark:text-gray-200`}>
      {/* Summary Cards */}
      <InfoCard>
        We're actively working on new stats. Have any suggestions?{" "}
        <a
          href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
          className="text-white hover:underline hover:scale-110 transition-transform duration-200"
        >
          Let us know.
        </a>
      </InfoCard>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
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

      {/* GPA Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cumulative GPA Chart */}
        <ChartBox
          title="Cumulative GPA Progression"
          icon={<GraduationCap className="h-5 w-5" />}
          description="The overall progression of your cumulative GPA over time."
        >
          <div className="h-[400px] w-full">
            <LineChart
              xAxis={[
                {
                  scaleType: "point",
                  data: cumulativeData.map((item) => item.semester),
                  tickLabelStyle: {
                    angle: 45,
                    textAnchor: "start",
                    fontSize: 12,
                    fill: "#9CA3AF",
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
              margin={{ left: 70, right: 30, top: 30, bottom: 100 }}
              sx={{
                [`.${axisClasses.left} .${axisClasses.label}`]: {
                  transform: "translate(-20px, 0)",
                  fill: "#9CA3AF",
                },
                [`.${axisClasses.bottom} .${axisClasses.label}`]: {
                  transform: "translate(0, 60px)",
                  fill: "#9CA3AF",
                },
                [`.${axisClasses.root} line`]: {
                  stroke: "#374151",
                  opacity: 0.3,
                },
                [`.${axisClasses.root} text`]: {
                  fill: "#9CA3AF",
                },
                backgroundColor: "transparent",
              }}
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "#1F2937",
                    borderColor: "#374151",
                    color: "#F3F4F6",
                    borderRadius: "0.5rem",
                  },
                },
              }}
            />
          </div>
        </ChartBox>

        {/* Semester GPA Chart */}
        <ChartBox
          title="Semester GPA Performance"
          icon={<BookOpen className="h-5 w-5" />}
          description="Your GPA for each individual semester (in isolation)."
        >
          <div className="h-[400px] w-full">
            <LineChart
              xAxis={[
                {
                  scaleType: "point",
                  data: sortedSemData.map((item) => item.semester),
                  tickLabelStyle: {
                    angle: 45,
                    textAnchor: "start",
                    fontSize: 12,
                    fill: "#9CA3AF",
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
              margin={{ left: 70, right: 30, top: 30, bottom: 100 }}
              sx={{
                [`.${axisClasses.left} .${axisClasses.label}`]: {
                  transform: "translate(-20px, 0)",
                  fill: "#9CA3AF",
                },
                [`.${axisClasses.bottom} .${axisClasses.label}`]: {
                  transform: "translate(0, 60px)",
                  fill: "#9CA3AF",
                },
                [`.${axisClasses.root} line`]: {
                  stroke: "#374151",
                  opacity: 0.3,
                },
                [`.${axisClasses.root} text`]: {
                  fill: "#9CA3AF",
                },
                backgroundColor: "transparent",
              }}
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "#1F2937",
                    borderColor: "#374151",
                    color: "#F3F4F6",
                    borderRadius: "0.5rem",
                  },
                },
              }}
            />
          </div>
        </ChartBox>
      </div>

      {/* Additional Charts Grid - Temporarily disabled
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartBox
          title="Grade Distribution"
          icon={<PieChartIcon className="h-5 w-5" />}
          description="A breakdown of your grades across all courses."
        >
          <PieChartWrapper
            data={{
              labels: filteredGradeDistribution.map((g) => g.grade),
              datasets: [
                {
                  data: filteredGradeDistribution.map((g) => g.count),
                  backgroundColor: COLORS.slice(
                    0,
                    filteredGradeDistribution.length,
                  ),
                  borderColor: Array(filteredGradeDistribution.length).fill(
                    "#1F2937",
                  ),
                  borderWidth: 1,
                },
              ],
            }}
            showLegend={true}
          />
        </ChartBox>

        {departmentData.length > 0 && (
          <ChartBox
            title="Credit Allocation"
            icon={<PieChartIcon className="h-5 w-5" />}
            description="A fun way to visualize your degree of class variedness at Yale!"
          >
            <PieChartWrapper
              data={{
                ...creditChartData,
                datasets: creditChartData.datasets.map((ds) => ({
                  ...ds,
                  borderColor: Array(ds.data.length).fill(ds.borderColor),
                })),
              }}
              showLegend={true}
            />
          </ChartBox>
        )}
      </div>
      */}
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
      className="p-6 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all shadow-sm dark:shadow-none"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">{label}</p>
        {icon && <div className={`${color} opacity-80`}>{icon}</div>}
      </div>
      <div className="flex items-end justify-between mt-2">
        <p className={`text-3xl font-medium ${color}`}>{value}</p>
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
      className="p-6 rounded-xl bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-sm border border-gray-200 dark:border-gray-800 shadow-sm dark:shadow-none"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-lg text-gray-900 dark:text-white">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-full bg-gray-200/50 dark:bg-gray-800/50 text-blue-500 dark:text-blue-300">
            {icon}
          </div>
        )}
      </div>
      {children}
    </motion.div>
  );
}

function AreaChartIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M7 12v5h12V8l-5 5-4-4Z" />
    </svg>
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
