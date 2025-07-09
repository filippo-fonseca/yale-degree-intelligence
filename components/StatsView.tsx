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
} from "recharts";

const COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EC4899",
  "#6366F1",
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

  const gradeDistribution = Object.entries(
    activeCourses.reduce((acc, c) => {
      acc[c.grade!] = (acc[c.grade!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([grade, count]) => ({ grade, count }));

  const maxGradeCount = Math.max(...gradeDistribution.map((g) => g.count), 5);
  const gradeTicks = getAxisTicks(
    0,
    maxGradeCount,
    Math.ceil(maxGradeCount / 5)
  );

  const semesterGroups = activeCourses.reduce((acc, c) => {
    const key = `${c.semester} ${c.year}`;
    if (!acc[key]) {
      acc[key] = { credits: 0, points: 0 };
    }
    acc[key].credits += c.credits || 0;
    acc[key].points += gradePoints[c.grade!] * (c.credits || 1);
    return acc;
  }, {} as Record<string, { credits: number; points: number }>);

  const semesterData = Object.entries(semesterGroups)
    .map(([semester, { credits, points }]) => ({
      semester,
      gpa: credits > 0 ? parseFloat((points / credits).toFixed(2)) : 0,
      credits,
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
    };
  });

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
    fullMark: 4,
  }));

  const gpaRange = {
    min: Math.min(0, ...departmentData.map((d) => d.gpa)),
    max: Math.max(4, ...departmentData.map((d) => d.gpa)),
  };
  const gpaTicks = getAxisTicks(0, 4, 0.5);

  return (
    <div className={`space-y-8 font-louize`}>
      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <StatCard
          label="Cumulative GPA"
          value={overallGpa.toFixed(2)}
          color={getGPAColor(overallGpa.toFixed(2))}
          icon="GPA"
        />
        <StatCard
          label="Total Credits"
          value={summary.totalCredits}
          color={getCreditsColor(summary.totalCredits)}
          icon="CR"
        />
        <StatCard
          label="Courses Completed"
          value={activeCourses.length}
          color="text-purple-300"
          icon="✓"
        />
      </motion.div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <ChartBox title="Grade Distribution">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={gradeDistribution}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="grade"
                label={{
                  value: "Grade",
                  position: "insideBottom",
                  offset: -40,
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                label={{
                  value: "Number of Courses",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                }}
                ticks={gradeTicks}
                domain={[0, maxGradeCount]}
                allowDecimals={false}
                tick={{ fill: "#9CA3AF" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#1F2937",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(4px)",
                }}
              />
              <Bar
                dataKey="count"
                fill={COLORS[4]}
                name="Courses"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Semester GPA */}
        <ChartBox title="Semester Performance">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={sortedSemData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="semester"
                label={{
                  value: "Semester",
                  position: "insideBottom",
                  offset: -40,
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                domain={[0, 4]}
                ticks={gpaTicks}
                label={{
                  value: "GPA",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#1F2937",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(4px)",
                }}
                formatter={(value) => [value, "GPA"]}
                labelFormatter={(label) => `Semester: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                name="Semester GPA"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Cumulative GPA */}
        <ChartBox title="Academic Trajectory">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={cumulativeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="semester"
                label={{
                  value: "Semester",
                  position: "insideBottom",
                  offset: -40,
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                domain={[0, 4]}
                ticks={gpaTicks}
                label={{
                  value: "GPA",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#1F2937",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(4px)",
                }}
                formatter={(value) => [value, "GPA"]}
                labelFormatter={(label) => `Semester: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="cumulativeGpa"
                name="Cumulative GPA"
                stroke={COLORS[2]}
                fill={COLORS[2]}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Department Performance */}
        <ChartBox title="Department Analysis">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={departmentData.slice(0, 8)}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#374151"
                opacity={0.3}
              />
              <XAxis
                dataKey="department"
                label={{
                  value: "Department",
                  position: "insideBottom",
                  offset: -40,
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF", fontSize: 12 }}
              />
              <YAxis
                domain={[gpaRange.min, gpaRange.max]}
                ticks={gpaTicks}
                label={{
                  value: "GPA",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#9CA3AF",
                }}
                tick={{ fill: "#9CA3AF" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#111827",
                  borderColor: "#1F2937",
                  borderRadius: "0.5rem",
                  backdropFilter: "blur(4px)",
                }}
                formatter={(value) => [value, "GPA"]}
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
          <ChartBox title="Top Departments">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart outerRadius={150} data={radarData}>
                <PolarGrid gridType="circle" stroke="#374151" opacity={0.3} />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#9CA3AF" }} />
                <PolarRadiusAxis angle={30} domain={[0, 4]} />
                <Radar
                  name="GPA"
                  dataKey="GPA"
                  stroke={COLORS[3]}
                  fill={COLORS[3]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Legend
                  wrapperStyle={{ color: "#E5E7EB", paddingTop: "20px" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    borderColor: "#1F2937",
                    borderRadius: "0.5rem",
                    backdropFilter: "blur(4px)",
                  }}
                  formatter={(value) => [value, "GPA"]}
                  labelFormatter={(label) => `Department: ${label}`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartBox>
        )}

        {/* Credits Distribution */}
        {departmentData.length > 0 && (
          <ChartBox title="Credit Allocation">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
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
                    backgroundColor: "#111827",
                    borderColor: "#1F2937",
                    borderRadius: "0.5rem",
                    backdropFilter: "blur(4px)",
                  }}
                  formatter={(value, name, props) => [
                    `${value} credits`,
                    props.payload.department,
                  ]}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  wrapperStyle={{ color: "#E5E7EB" }}
                  formatter={(value, entry, index) => (
                    <span className="text-xs">
                      {value} ({departmentData[index].credits} credits)
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
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
}: {
  label: string;
  value: string | number;
  color?: string;
  icon?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-6 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800 hover:border-gray-700 transition-all"
    >
      <p className="text-sm text-gray-400">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <p className={`text-3xl font-medium ${color}`}>{value}</p>
        {icon && <span className={`text-lg ${color} opacity-60`}>{icon}</span>}
      </div>
    </motion.div>
  );
}

function ChartBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 rounded-xl bg-gray-900/50 backdrop-blur-sm border border-gray-800"
    >
      <h3 className="font-medium mb-4 text-center text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

function getGPAColor(gpa: string) {
  const numericGPA = parseFloat(gpa);
  if (numericGPA >= 3.7) return "text-emerald-300";
  if (numericGPA >= 3.3) return "text-blue-300";
  if (numericGPA >= 2.7) return "text-amber-300";
  return "text-red-300";
}

function getCreditsColor(credits: number) {
  if (credits >= 32) return "text-emerald-300";
  if (credits >= 24) return "text-blue-300";
  if (credits >= 16) return "text-amber-300";
  return "text-red-300";
}
