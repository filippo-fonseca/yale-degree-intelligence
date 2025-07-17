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
  RadarIcon,
  ChevronRight,
} from "lucide-react";

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

  // Best/worst courses
  const bestCourses = [...activeCourses]
    .sort((a, b) => gradePoints[b.grade!] - gradePoints[a.grade!])
    .slice(0, 3);

  const worstCourses = [...activeCourses]
    .sort((a, b) => gradePoints[a.grade!] - gradePoints[b.grade!])
    .slice(0, 3);

  // Progress to graduation (assuming 120 credits needed)
  const progressToGraduation = Math.min(
    100,
    (summary.totalCredits / 120) * 100
  );

  return (
    <div className={`space-y-8 font-louize text-gray-200`}>
      {/* Summary Cards */}
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
                  semesterData.reduce((acc, s) => acc + s.credits, 0) /
                  semesterData.length
                ).toFixed(1)
              : "0"
          }
          color="text-blue-300"
          icon={<Clock className="h-5 w-5" />}
          secondaryLabel={`Across ${semesterData.length} semesters`}
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <ChartBox
          title="Grade Distribution"
          icon={<BarChart2 className="h-5 w-5" />}
          description="Breakdown of grades received across all courses"
        >
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={gradeDistribution}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="grade"
                angle={-45}
                textAnchor="end"
                height={70}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              >
                <Label
                  value="Letter Grade"
                  position="insideBottom"
                  offset={-60}
                  fill="#9CA3AF"
                  fontSize={12}
                />
              </XAxis>
              <YAxis
                ticks={gradeTicks}
                domain={[0, maxGradeCount]}
                allowDecimals={false}
                tick={{ fill: "#9CA3AF" }}
              >
                <Label
                  value="Number of Courses"
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
                formatter={(value) => [`${value} courses`, "Count"]}
                labelFormatter={(label) => `Grade: ${label}`}
              />
              <Bar
                dataKey="count"
                fill={COLORS[4]}
                name="Courses"
                radius={[4, 4, 0, 0]}
              />
              <ReferenceLine
                y={0}
                stroke="#6B7280"
                strokeDasharray="3 3"
                opacity={0.5}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Semester GPA */}
        <ChartBox
          title="Semester Performance"
          icon={<BarChart2 className="h-5 w-5" />}
          description="GPA and credits for each completed semester"
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={sortedSemData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <defs>
                <linearGradient id="semGpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[0]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS[0]} stopOpacity={0} />
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
                ticks={gpaTicks}
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
                      `Semester GPA (${props.payload.courseCount} courses)`,
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
              <Brush
                dataKey="semester"
                height={30}
                stroke="#4B5563"
                travellerWidth={10}
                fill="#1F2937"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Cumulative GPA */}
        <ChartBox
          title="Academic Trajectory"
          icon={<BarChart2 className="h-5 w-5" />}
          description="Your cumulative GPA progression over time"
        >
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={cumulativeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <defs>
                <linearGradient id="cumGpaGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[2]} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={COLORS[2]} stopOpacity={0} />
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
                ticks={gpaTicks}
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
        </ChartBox>

        {/* Department Performance */}
        <ChartBox
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
                ticks={gpaTicks}
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
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Department Radar Chart */}
        {topDepartments.length > 2 && (
          <ChartBox
            title="Top Departments"
            icon={<RadarIcon className="h-5 w-5" />}
            description="Comparative performance across departments"
          >
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart
                outerRadius={150}
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
                  tick={{ fill: "#9CA3AF" }}
                />
                <Radar
                  name="GPA"
                  dataKey="GPA"
                  stroke={COLORS[3]}
                  fill={COLORS[3]}
                  fillOpacity={0.3}
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
        )}

        {/* Credits Distribution */}
        {departmentData.length > 0 && (
          <ChartBox
            title="Credit Allocation"
            icon={<PieChartIcon className="h-5 w-5" />}
            description="Distribution of credits across departments"
          >
            <ResponsiveContainer width="100%" height={400}>
              <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={2}
                  dataKey="credits"
                  nameKey="department"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {departmentData.map((_, idx) => (
                    <Cell
                      key={idx}
                      fill={COLORS[idx % COLORS.length]}
                      stroke="#111827"
                      strokeWidth={1}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1F2937",
                    borderColor: "#374151",
                    borderRadius: "0.5rem",
                    color: "#F3F4F6",
                  }}
                  formatter={(value, name, props) => [
                    `${value} credits (${props.payload.courseCount} courses)`,
                    props.payload.department,
                  ]}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ color: "#E5E7EB", fontSize: "12px" }}
                  formatter={(value, entry, index) => (
                    <span className="text-xs">
                      {value} ({departmentData[index].credits} cr)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartBox>
        )}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Courses */}
        <ChartBox
          title="Top Performing Courses"
          icon={<Award className="h-5 w-5" />}
          description="Your highest achieving courses"
        >
          <div className="space-y-3">
            {bestCourses.map((course, idx) => (
              <div
                key={course.code}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${getGPAColor(
                      gradePoints[course.grade!].toFixed(2)
                    )} bg-opacity-20`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{course.code}</h4>
                    <p className="text-sm text-gray-400">{course.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${getGPAColor(
                      gradePoints[course.grade!].toFixed(2)
                    )}`}
                  >
                    {course.grade} ({gradePoints[course.grade!].toFixed(1)})
                  </p>
                  <p className="text-xs text-gray-400">
                    {course.credits} credit{course.credits !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartBox>

        {/* Worst Courses */}
        <ChartBox
          title="Courses Needing Improvement"
          icon={<Award className="h-5 w-5" />}
          description="Courses with the most room for growth"
        >
          <div className="space-y-3">
            {worstCourses.map((course, idx) => (
              <div
                key={course.code}
                className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${getGPAColor(
                      gradePoints[course.grade!].toFixed(2)
                    )} bg-opacity-20`}
                  >
                    {idx + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{course.code}</h4>
                    <p className="text-sm text-gray-400">{course.code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-bold ${getGPAColor(
                      gradePoints[course.grade!].toFixed(2)
                    )}`}
                  >
                    {course.grade} ({gradePoints[course.grade!].toFixed(1)})
                  </p>
                  <p className="text-xs text-gray-400">
                    {course.credits} credit{course.credits !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ChartBox>
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
