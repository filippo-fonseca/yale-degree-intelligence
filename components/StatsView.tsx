// src/components/StatsView.tsx
"use client";

import { Course } from "@/lib/types";
import { gradePoints } from "@/lib/constants";
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
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
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
  // Filter out skipped and in-progress courses, and only include graded courses
  const activeCourses = courses.filter(
    (c) =>
      !c.skipped &&
      c.status !== "in-progress" &&
      c.grade &&
      gradePoints[c.grade]
  );

  // Summary stats
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

  // Grade distribution
  const gradeDistribution = Object.entries(
    activeCourses.reduce((acc, c) => {
      acc[c.grade!] = (acc[c.grade!] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([grade, count]) => ({ grade, count }));

  // Calculate max count for grade distribution Y-axis
  const maxGradeCount = Math.max(...gradeDistribution.map((g) => g.count), 5);
  const gradeTicks = getAxisTicks(
    0,
    maxGradeCount,
    Math.ceil(maxGradeCount / 5)
  );

  // Semester GPA
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

  // Sort chronologically
  const sortedSemData = semesterData.sort((a, b) => {
    const [sa, ya] = a.semester.split(" ");
    const [sb, yb] = b.semester.split(" ");
    const na = +ya,
      nb = +yb;
    if (na !== nb) return na - nb;
    return (seasonOrder[sa] || 0) - (seasonOrder[sb] || 0);
  });

  // Cumulative GPA
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

  // Department performance
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

  // Prepare data for radar chart (top 6 departments by credits)
  const topDepartments = [...departmentData].slice(0, 6);
  const radarData = topDepartments.map((dept) => ({
    subject: dept.department,
    GPA: dept.gpa,
    fullMark: 4,
  }));

  // Calculate axis ranges dynamically
  const gpaRange = {
    min: Math.min(0, ...departmentData.map((d) => d.gpa)),
    max: Math.max(4, ...departmentData.map((d) => d.gpa)),
  };
  const gpaTicks = getAxisTicks(0, 4, 0.5);

  return (
    <div className="space-y-8">
      {/* summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="GPA" value={overallGpa.toFixed(2)} />
        <StatCard label="Total Credits" value={summary.totalCredits} />
        <StatCard label="Courses Completed" value={activeCourses.length} />
      </div>

      {/* charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution */}
        <ChartBox title="Grade Distribution">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={gradeDistribution}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="grade"
                label={{
                  value: "Grade",
                  position: "insideBottom",
                  offset: -40,
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                label={{
                  value: "Number of Courses",
                  angle: -90,
                  position: "insideLeft",
                }}
                ticks={gradeTicks}
                domain={[0, maxGradeCount]}
                allowDecimals={false}
              />
              <Tooltip />
              <Bar
                dataKey="count"
                fill={COLORS[4]}
                name="Courses"
                label={{ position: "top" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Semester GPA */}
        <ChartBox title="Semester GPA">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={sortedSemData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="semester"
                label={{
                  value: "Semester",
                  position: "insideBottom",
                  offset: -40,
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 4]}
                ticks={gpaTicks}
                label={{ value: "GPA", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                formatter={(value) => [value, "GPA"]}
                labelFormatter={(label) => `Semester: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="gpa"
                name="Semester GPA"
                stroke={COLORS[0]}
                fill={COLORS[0]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Cumulative GPA */}
        <ChartBox title="Cumulative GPA">
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart
              data={cumulativeData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="semester"
                label={{
                  value: "Semester",
                  position: "insideBottom",
                  offset: -40,
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 4]}
                ticks={gpaTicks}
                label={{ value: "GPA", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                formatter={(value) => [value, "GPA"]}
                labelFormatter={(label) => `Semester: ${label}`}
              />
              <Area
                type="monotone"
                dataKey="cumulativeGpa"
                name="Cumulative GPA"
                stroke={COLORS[2]}
                fill={COLORS[2]}
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Department Performance Bar */}
        <ChartBox title="Department Performance (GPA)">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={departmentData}
              margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="department"
                label={{
                  value: "Department",
                  position: "insideBottom",
                  offset: -40,
                }}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[gpaRange.min, gpaRange.max]}
                ticks={gpaTicks}
                label={{ value: "GPA", angle: -90, position: "insideLeft" }}
              />
              <Tooltip
                formatter={(value) => [value, "GPA"]}
                labelFormatter={(label) => `Department: ${label}`}
              />
              <Bar
                dataKey="gpa"
                fill={COLORS[1]}
                name="GPA"
                label={{ position: "top" }}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>

        {/* Department Radar Chart */}
        {topDepartments.length > 2 && (
          <ChartBox title="Top Departments (Radar)">
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart outerRadius={150} data={radarData}>
                <PolarGrid gridType="circle" />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 4]} />
                <Radar
                  name="GPA"
                  dataKey="GPA"
                  stroke={COLORS[3]}
                  fill={COLORS[3]}
                  fillOpacity={0.6}
                />
                <Legend />
                <Tooltip
                  formatter={(value) => [value, "GPA"]}
                  labelFormatter={(label) => `Department: ${label}`}
                />
              </RadarChart>
            </ResponsiveContainer>
          </ChartBox>
        )}

        {/* Credits Distribution */}
        {departmentData.length > 0 && (
          <ChartBox title="Credits by Department">
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={departmentData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  innerRadius={60}
                  paddingAngle={5}
                  dataKey="credits"
                  nameKey="department"
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {departmentData.map((_, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name, props) => [
                    `${value} credits`,
                    props.payload.department,
                  ]}
                />
                <Legend
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                  formatter={(value, entry, index) => (
                    <span className="text-sm">
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

// Reusable components
function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-4 bg-white rounded-lg border shadow-sm text-center">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-medium">{value}</p>
    </div>
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
    <div className="bg-white p-4 rounded-lg border shadow-sm">
      <h3 className="font-medium mb-4 text-center">{title}</h3>
      {children}
    </div>
  );
}
