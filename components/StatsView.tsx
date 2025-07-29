"use client";

import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
import { motion } from "framer-motion";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Label,
  ReferenceLine,
  Brush,
} from "recharts";
import {
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  BarChart2,
  PieChart as PieChartIcon,
  Radar as RadarIcon,
  ChevronRight,
} from "lucide-react";
import PieChartWrapper from "./ui/PieChartWrapper";
import { InfoCard } from "./ui/InfoCard";

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

const getAxisTicks = (min: number, max: number, step: number) => {
  const ticks = [];
  for (let i = min; i <= max; i += step) {
    ticks.push(i);
  }
  return ticks;
};

export default function StatsView({ courses }: { courses: Course[] }) {
  const activeCourses = courses.filter(
    (c) =>
      !c.skipped &&
      c.status !== "in-progress" &&
      c.grade &&
      gradePoints[c.grade]
  );

  const summary = activeCourses.reduce(
    (acc, c) => {
      acc.totalCredits += c.credits || 0;
      acc.totalGradePoints += gradePoints[c.grade!] * (c.credits || 1);
      return acc;
    },
    { totalCredits: 0, totalGradePoints: 0 }
  );

  const overallGpa =
    summary.totalCredits > 0
      ? summary.totalGradePoints / summary.totalCredits
      : 0;

  // Grade distribution with all possible grades for completeness
  const allGrades = Object.keys(gradePoints);
  const gradeDistribution = allGrades.map((grade) => {
    const count = activeCourses.filter((c) => c.grade === grade).length;
    return { grade, count };
  });

  const maxGradeCount = Math.max(...gradeDistribution.map((g) => g.count), 5);
  const gradeTicks = getAxisTicks(
    0,
    maxGradeCount,
    Math.ceil(maxGradeCount / 5)
  );

  // Semester data
  const semesterGroups = activeCourses.reduce((acc, c) => {
    const key = `${c.semester} ${c.year}`;
    if (!acc[key]) {
      acc[key] = { credits: 0, points: 0, courses: [] };
    }
    acc[key].credits += c.credits || 0;
    acc[key].points += gradePoints[c.grade!] * (c.credits || 1);
    acc[key].courses.push(c);
    return acc;
  }, {} as Record<string, { credits: number; points: number; courses: Course[] }>);

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
      (c) => `${c.semester} ${c.year}` === entry.semester
    );
    const sc = semCourses.reduce((s, c) => s + (c.credits || 0), 0);
    const sp = semCourses.reduce(
      (s, c) => s + gradePoints[c.grade!] * (c.credits || 1),
      0
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
    activeCourses.reduce((acc, c) => {
      const dept = c.code.split(" ")[0];
      if (!acc[dept]) acc[dept] = { creds: 0, pts: 0, count: 0 };
      acc[dept].creds += c.credits || 0;
      acc[dept].pts += gradePoints[c.grade!] * (c.credits || 1);
      acc[dept].count += 1;
      return acc;
    }, {} as Record<string, { creds: number; pts: number; count: number }>)
  )
    .map(([dept, d]) => ({
      department: dept,
      gpa: d.creds > 0 ? parseFloat((d.pts / d.creds).toFixed(2)) : 0,
      credits: d.creds,
      courseCount: d.count,
    }))
    .filter((dept) => dept.gpa > 0)
    .sort((a, b) => b.credits - a.credits);

  const topDepartments = [...departmentData].slice(0, 6);
  const radarData = topDepartments.map((dept) => ({
    subject: dept.department,
    GPA: dept.gpa,
    Courses: dept.courseCount,
    fullMark: 4,
  }));

  const gpaTicks = getAxisTicks(0, 4, 0.5);
  const creditTicks = getAxisTicks(
    0,
    Math.max(...departmentData.map((d) => d.credits)),
    3
  );

  // Best/worst courses
  const bestCourses = [...activeCourses]
    .sort((a, b) => gradePoints[b.grade!] - gradePoints[a.grade!])
    .slice(0, 3);

  const worstCourses = [...activeCourses]
    .sort((a, b) => gradePoints[a.grade!] - gradePoints[b.grade!])
    .slice(0, 3);

  // Progress to graduation (assuming 120 credits needed)
  const progressToGraduation = Math.min(100, (summary.totalCredits / 36) * 100);

  const gradeChartData = {
    labels: gradeDistribution.map((g) => g.grade),
    datasets: [
      {
        data: gradeDistribution.map((g) => g.count),
        backgroundColor: COLORS,
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
    <div className={`space-y-8 font-louize text-gray-200`}>
      {/* Summary Cards */}
      <InfoCard>
        We're working on more statistics and insights. Stay tuned; this includes
        a cumulative GPA chart.
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
        />
        <StatCard
          label="Total Credits"
          value={summary.totalCredits}
          color={getCreditsColor(summary.totalCredits)}
          icon={<BookOpen className="h-5 w-5" />}
          secondaryLabel={`${progressToGraduation.toFixed(0)}% to graduation`}
        />
        <StatCard
          label="Courses Completed"
          value={activeCourses.length}
          color="text-purple-300"
          icon={<Award className="h-5 w-5" />}
          secondaryLabel={`${gradeDistribution.reduce(
            (acc, g) => acc + g.count,
            0
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
                    (elem) => !elem.semester.includes("Summer")
                  ).length
                ).toFixed(1)
              : "0"
          }
          color="text-blue-300"
          icon={<Clock className="h-5 w-5" />}
          secondaryLabel={`Across ${
            semesterData.filter((elem) => !elem.semester.includes("Summer"))
              .length
          } semesters`}
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution - Now a Pie Chart */}
        <ChartBox
          title="Grade Distribution"
          icon={<PieChartIcon className="h-5 w-5" />}
          description="A breakdown of how many grades of each type you've received."
        >
          <PieChartWrapper
            data={{
              ...gradeChartData,
              datasets: gradeChartData.datasets.map((ds) => ({
                ...ds,
                borderColor: Array(ds.data.length).fill(ds.borderColor),
              })),
            }}
            showLegend={false}
          />
        </ChartBox>

        {/* Cumulative GPA - Area Chart */}
        {/* <ChartBox
          title="Cumulative Academic Trajectory"
          icon={<AreaChartIcon className="h-5 w-5" />}
          description="The progression of your cumulative GPA over time."
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={cumulativeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <defs>
                <linearGradient id="cumGpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="semester"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              >
                <Label
                  value="Semester"
                  position="insideBottom"
                  offset={-60}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </XAxis>
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 3.5, 4]}
                tick={{ fill: "#9CA3AF" }}
              >
                <Label
                  value="Cumulative GPA"
                  angle={-90}
                  position="insideLeft"
                  offset={15}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </YAxis>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  borderColor: "#374151",
                  borderRadius: "0.5rem",
                  color: "#F3F4F6",
                }}
                formatter={(value, name, props) => {
                  if (name === "Cumulative GPA") {
                    return [value, `Total Credits: ${props.payload.credits}`];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `Semester: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="cumulativeGpa"
                name="Cumulative GPA"
                stroke={COLORS[2]}
                fill="url(#cumGpaGradient)"
                strokeWidth={2}
              />
              <ReferenceLine
                y={3.0}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <ReferenceLine
                y={3.5}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <ReferenceLine
                y={4.0}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <ReferenceLine
                y={overallGpa}
                stroke="#F59E0B"
                strokeDasharray="3 3"
                label={{
                  value: `Current: ${overallGpa.toFixed(2)}`,
                  position: "right",
                  fill: "#F59E0B",
                  fontSize: 12,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox> */}

        {/* Semester GPA - Area Chart */}
        {/* <ChartBox
          title="Individual Performance by Semester"
          icon={<AreaChartIcon className="h-5 w-5" />}
          description="GPA and credits for each completed semester (includes summer)."
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={sortedSemData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <defs>
                <linearGradient id="semGpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0.2} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="semester"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              >
                <Label
                  value="Semester"
                  position="insideBottom"
                  offset={-60}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </XAxis>
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 3.5, 4]}
                tick={{ fill: "#9CA3AF" }}
              >
                <Label
                  value="GPA"
                  angle={-90}
                  position="insideLeft"
                  offset={15}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </YAxis>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  borderColor: "#374151",
                  borderRadius: "0.5rem",
                  color: "#F3F4F6",
                }}
                formatter={(value, name, props) => {
                  if (name === "GPA") {
                    return [
                      value,
                      `Semester GPA (${props.payload.courseCount} ${
                        props.payload.courseCount > 1 ? "courses" : "course"
                      }, ${props.payload.credits} ${
                        props.payload.credits > 1 ? "credits" : "credit"
                      })`,
                    ];
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => `Semester: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                name="GPA"
                stroke={COLORS[0]}
                fill="url(#semGpaGradient)"
                strokeWidth={2}
              />
              <ReferenceLine
                y={3.0}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <ReferenceLine
                y={3.5}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <ReferenceLine
                y={4.0}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox> */}

        {/* Department Performance - Fixed Bar Chart */}
        {/* <ChartBox
          title="Department Analysis"
          icon={<BarChart2 className="h-5 w-5" />}
          description="GPA performance by academic department"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={departmentData.slice(0, 8)}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="department"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              >
                <Label
                  value="Department"
                  position="insideBottom"
                  offset={-60}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </XAxis>
              <YAxis
                domain={[0, 4]}
                ticks={[0, 1, 2, 3, 3.5, 4]}
                tick={{ fill: "#9CA3AF" }}
              >
                <Label
                  value="GPA"
                  angle={-90}
                  position="insideLeft"
                  offset={15}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </YAxis>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1F2937",
                  borderColor: "#374151",
                  borderRadius: "0.5rem",
                  color: "#F3F4F6",
                }}
                formatter={(value, name, props) => [
                  value,
                  `GPA (${props.payload.courseCount} courses, ${props.payload.credits} credits)`,
                ]}
                labelFormatter={(label) => `Department: ${label}`}
              />
              <Bar
                dataKey="gpa"
                fill={COLORS[1]}
                name="GPA"
                radius={[4, 4, 0, 0]}
              />
              <ReferenceLine
                y={3.0}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
              <ReferenceLine
                y={3.5}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox> */}

        {/* Department Radar Chart - Fixed */}
        {/* {topDepartments.length > 2 && (
          <ChartBox
            title="Top Departments"
            icon={<RadarIcon className="h-5 w-5" />}
            description="Comparative performance across departments"
          >
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart
                outerRadius={120}
                data={radarData}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <PolarGrid gridType="circle" stroke="#374151" opacity={0.3} />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: "#9CA3AF", fontSize: 12 }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 4]}
                  tickCount={5}
                  tick={{ fill: "#9CA3AF" }}
                />
                <Radar
                  name="GPA"
                  dataKey="GPA"
                  stroke={COLORS[3]}
                  fill={COLORS[3]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#F3F4F6",
                  }}
                  formatter={(value, name, props) => [
                    value,
                    `GPA (${props.payload.Courses} courses)`,
                  ]}
                  labelFormatter={(label) => `Department: ${label}`}
                />
                <Legend
                  wrapperStyle={{
                    color: "#E5E7EB",
                    paddingTop: "20px",
                    fontSize: "12px",
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartBox>
        )} */}

        {/* Credits Distribution - Pie Chart */}
        {departmentData.length > 0 && (
          <ChartBox
            title="Credit Allocation"
            icon={<PieChartIcon className="h-5 w-5" />}
            description="Distribution of your course credits across Yale College departments."
          >
            <PieChartWrapper
              data={{
                ...creditChartData,
                datasets: creditChartData.datasets.map((ds) => ({
                  ...ds,
                  borderColor: Array(ds.data.length).fill(ds.borderColor),
                })),
              }}
            />
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
  secondaryLabel,
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: React.ReactNode;
  change?: number;
  secondaryLabel?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-6 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-400">{label}</p>
        {icon && <div className={`${color} opacity-80`}>{icon}</div>}
      </div>
      <div className="flex items-end justify-between mt-2">
        <p className={`text-3xl font-medium ${color}`}>{value}</p>
        {change !== 0 && (
          <p
            className={`text-sm ${
              change > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {change > 0 ? "+" : ""}
            {change.toFixed(2)}
          </p>
        )}
      </div>
      {secondaryLabel && (
        <p className="text-xs text-gray-400 mt-1">{secondaryLabel}</p>
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
      className="p-6 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-medium text-lg text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
            {title}
          </h3>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        {icon && (
          <div className="p-2 rounded-full bg-gray-800/50 text-blue-300">
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
  if (numericGPA >= 2.7) return "text-amber-400";
  return "text-red-400";
}

function getCreditsColor(credits: number) {
  if (credits >= 32) return "text-emerald-400";
  if (credits >= 24) return "text-blue-400";
  if (credits >= 16) return "text-amber-400";
  return "text-red-400";
}
