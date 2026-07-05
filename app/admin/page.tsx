"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { ADMIN_EMAIL } from "@/lib/admin";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  Brain,
  GraduationCap,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  TrendingUp,
  Users,
} from "lucide-react";

type Entry = { label: string; value: number };
type UsersOverTimePoint = { month: string; count: number; cumulative: number };
type AdminStats = {
  generatedAt: string;
  overview: Record<string, number>;
  usersOverTime?: UsersOverTimePoint[];
  distributions: {
    courseStatuses: Entry[];
    graduationYears: Entry[];
    majors: Entry[];
    departmentsByCourses: Entry[];
    departmentsByCredits: Entry[];
    grades: Entry[];
    distributionals: Entry[];
  };
  users: {
    recent: {
      id: string;
      displayName: string;
      email: string | null;
      majors: string[];
      graduationYear: number | null;
      courseCount: number;
      updatedAt: string | null;
    }[];
    heaviestCourseLoads: {
      id: string;
      displayName: string;
      email: string | null;
      courseCount: number;
    }[];
  };
};

const formatNumber = (value: number | undefined) =>
  typeof value === "number" ? value.toLocaleString() : "0";

function StatTile({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-neu dark:border-gray-800/60 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
      <div className="mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
          {icon}
        </div>
      </div>
      <p className="font-louize text-2xl font-medium text-gray-950 dark:text-white">
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function BarList({
  title,
  data,
  valueSuffix = "",
}: {
  title: string;
  data: Entry[];
  valueSuffix?: string;
}) {
  const max = useMemo(
    () => Math.max(...data.map((entry) => entry.value), 1),
    [data],
  );

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-neu dark:border-gray-800/60 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
      <h2 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      <div className="space-y-3">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No data yet.</p>
        ) : (
          data.map((entry) => (
            <div key={entry.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                  {entry.label}
                </span>
                <span className="shrink-0 text-gray-500 dark:text-gray-400">
                  {formatNumber(entry.value)}
                  {valueSuffix}
                </span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700/70">
                <div
                  className="h-full rounded-full bg-violet-600 dark:bg-violet-500"
                  style={{ width: `${Math.max((entry.value / max) * 100, 4)}%` }}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

const formatMonthLabel = (month: string) => {
  const [year, m] = month.split("-");
  if (!year || !m) return month;
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
};

function UsersOverTimeChart({
  data,
  isDark,
}: {
  data: UsersOverTimePoint[];
  isDark: boolean;
}) {
  const axisColor = isDark ? "#9ca3af" : "#6b7280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const accent = "#7c3aed";

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-neu dark:border-gray-800/60 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-violet-500" />
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          User growth over time
        </h2>
      </div>
      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-gray-400">
          Not enough signup history yet.
        </p>
      ) : (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <defs>
                <linearGradient id="adminUsersArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={accent} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                minTickGap={16}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 12,
                  border: `1px solid ${gridColor}`,
                  background: isDark ? "#0a0a0a" : "#ffffff",
                  color: isDark ? "#f9fafb" : "#111827",
                  fontSize: 12,
                }}
                labelFormatter={(label) => formatMonthLabel(String(label))}
                formatter={(value: number, name: string) => [
                  formatNumber(value),
                  name === "cumulative" ? "Total users" : "New signups",
                ]}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={accent}
                strokeWidth={2}
                fill="url(#adminUsersArea)"
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default function AdminPage() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadStats = async () => {
    if (!user || !isAdmin) return;
    setLoadingStats(true);
    setError(null);
    try {
      const token = await user.getIdToken();
      const response = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Failed to load admin stats");
      setStats(body);
    } catch (err: any) {
      setError(err?.message || "Failed to load admin stats");
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    loadStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, isAdmin]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-700 dark:bg-black dark:text-gray-200">
        <Loader2 className="h-5 w-5 animate-spin" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-black">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-neu dark:border-gray-800 dark:bg-gray-950">
          <Lock className="mx-auto mb-3 h-6 w-6 text-gray-500" />
          <h1 className="font-louize text-xl font-medium text-gray-950 dark:text-white">
            Admin access
          </h1>
          <button
            onClick={signInWithGoogle}
            className="mt-5 w-full rounded-lg bg-gray-950 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 dark:bg-white dark:text-gray-950"
          >
            Sign in
          </button>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 dark:bg-black">
        <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-6 text-center shadow-neu dark:border-gray-800 dark:bg-gray-950">
          <ShieldCheck className="mx-auto mb-3 h-6 w-6 text-red-500" />
          <h1 className="font-louize text-xl font-medium text-gray-950 dark:text-white">
            Not authorized
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            This dashboard is only available to the creator account.
          </p>
          <Link
            href="/"
            className="mt-5 inline-flex rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.04]"
          >
            Back to app
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen scroll-smooth bg-gray-50 text-gray-900 dark:bg-black dark:text-white">
      <nav className="sticky top-0 z-40 border-b border-gray-200 bg-white/70 backdrop-blur-xl dark:border-gray-800/70 dark:bg-black/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-pink-200 bg-pink-50 px-2.5 py-1.5 text-xs font-semibold text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="font-louize text-sm tracking-tight">Admin</span>
            </div>
            <div className="hidden items-center gap-1 md:flex">
              {[
                { href: "#overview", label: "Overview" },
                { href: "#charts", label: "Charts" },
                { href: "#users", label: "Users" },
              ].map((anchor) => (
                <a
                  key={anchor.href}
                  href={anchor.href}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
                >
                  {anchor.label}
                </a>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            >
              App
            </Link>
            <button
              onClick={toggleTheme}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-950 dark:text-gray-300 dark:hover:bg-white/[0.04]"
              aria-label="Toggle theme"
            >
              {resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={loadStats}
              disabled={loadingStats}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-950 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-950"
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6">
          <h1 className="font-louize text-3xl font-medium tracking-tight text-gray-950 dark:text-white">
            Creator dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Product health, usage, courses, majors, and engagement.
          </p>
        </header>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {!stats ? (
          <div className="flex min-h-[50vh] items-center justify-center rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Users"
                value={formatNumber(stats.overview.totalUsers)}
                sub={`${formatNumber(stats.overview.profilesCreated)} of ${formatNumber(stats.overview.totalUsers)} have a profile`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatTile
                label="Courses"
                value={formatNumber(stats.overview.totalCourses)}
                sub={`${stats.overview.averageCoursesPerUser} avg per user`}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <StatTile
                label="Avg majors"
                value={stats.overview.averageMajorsPerUser}
                sub={`${formatNumber(stats.overview.totalMajorSlots)} total major selections`}
                icon={<GraduationCap className="h-4 w-4" />}
              />
              <StatTile
                label="Credits"
                value={stats.overview.totalCredits}
                sub={`${stats.overview.averageCreditsPerActiveUser} avg per active user`}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <StatTile
                label="Friends enabled"
                value={`${stats.overview.friendsEnabledRate}%`}
                sub={`${formatNumber(stats.overview.friendsEnabledUsers)} users, ${formatNumber(stats.overview.friendshipCount)} friendships`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatTile
                label="Profile complete"
                value={`${stats.overview.profileCompletionRate}%`}
                sub={`have major, grad year & bio (${formatNumber(stats.overview.usersWithBio)} with a bio)`}
                icon={<Sparkles className="h-4 w-4" />}
              />
              <StatTile
                label="Avg GPA"
                value={stats.overview.averageGpaAcrossGradedCourses}
                sub={`${formatNumber(stats.overview.gradedCourses)} graded courses`}
                icon={<GraduationCap className="h-4 w-4" />}
              />
              <StatTile
                label="Dan usage"
                value={formatNumber(stats.overview.conversationCount)}
                sub={`${stats.overview.averageMessagesPerConversation} messages per convo`}
                icon={<Brain className="h-4 w-4" />}
              />
            </div>

            <UsersOverTimeChart
              data={stats.usersOverTime ?? []}
              isDark={resolvedTheme === "dark"}
            />

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <BarList title="Top majors" data={stats.distributions.majors} />
              <BarList title="Class years" data={stats.distributions.graduationYears} />
              <BarList title="Departments by courses" data={stats.distributions.departmentsByCourses} />
              <BarList title="Departments by credits" data={stats.distributions.departmentsByCredits} />
              <BarList title="Course statuses" data={stats.distributions.courseStatuses} />
              <BarList title="Distributional tags" data={stats.distributions.distributionals} />
              <BarList title="Grades" data={stats.distributions.grades} />
              <BarList title="Heaviest course loads" data={stats.users.heaviestCourseLoads.map((u) => ({ label: u.displayName, value: u.courseCount }))} />
            </div>

            <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-neu dark:border-gray-800/60 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Recently updated users
                </h2>
                <p className="text-xs text-gray-400">
                  Generated {new Date(stats.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-gray-400">
                    <tr>
                      <th className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">User</th>
                      <th className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">Majors</th>
                      <th className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">Year</th>
                      <th className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">Courses</th>
                      <th className="border-b border-gray-100 py-2 dark:border-gray-800">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.users.recent.map((recentUser) => (
                      <tr key={recentUser.id} className="text-gray-700 dark:text-gray-300">
                        <td className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">
                          <div className="font-medium text-gray-950 dark:text-white">
                            {recentUser.displayName}
                          </div>
                          <div className="text-xs text-gray-400">{recentUser.email}</div>
                        </td>
                        <td className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">
                          {recentUser.majors.length ? recentUser.majors.join(", ") : "None"}
                        </td>
                        <td className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">
                          {recentUser.graduationYear || "-"}
                        </td>
                        <td className="border-b border-gray-100 py-2 pr-4 dark:border-gray-800">
                          {recentUser.courseCount}
                        </td>
                        <td className="border-b border-gray-100 py-2 dark:border-gray-800">
                          {recentUser.updatedAt
                            ? new Date(recentUser.updatedAt).toLocaleString()
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
