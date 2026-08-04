"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useIsAdmin } from "@/lib/useIsAdmin";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpen,
  DownloadCloud,
  GraduationCap,
  Loader2,
  Lock,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Sun,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

// Cohesive slice palette shared with the in-app Academic stats view
// (components/StatsView.tsx DEPT_COLORS): violet/blue/emerald/amber/pink family.
const DONUT_COLORS = [
  "#8B5CF6", // violet
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
  "#EF4444", // red
  "#84CC16", // lime
];

type Entry = { label: string; value: number };
type UsersOverTimePoint = { weekStart: string; count: number; cumulative: number };
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
};

// Approximate total Yale undergraduate population, used to gauge what share of
// the student body the app reaches. Figure is a rough estimate, not exact.
const YALE_UNDERGRAD_POPULATION = 6600;

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
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 p-4 shadow-neu backdrop-blur-xl transition-colors hover:border-gray-300 dark:border-white/10 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 dark:hover:border-white/20">
      <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-violet-500/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-violet-500/20" />
      <div className="relative mb-3 flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-gray-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
          {icon}
        </div>
      </div>
      <p className="relative font-louize text-2xl font-medium text-gray-950 dark:text-white">
        {value}
      </p>
      {sub && <p className="relative mt-1 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
    </div>
  );
}

function BarList({
  title,
  subtitle,
  data,
  valueSuffix = "",
}: {
  title: string;
  subtitle?: string;
  data: Entry[];
  valueSuffix?: string;
}) {
  const max = useMemo(
    () => Math.max(...data.map((entry) => entry.value), 1),
    [data],
  );

  return (
    <section className="relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 p-4 shadow-neu backdrop-blur-xl dark:border-white/10 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/20" />
      <div className="relative mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {subtitle && (
          <span className="shrink-0 text-[11px] font-medium text-gray-400">
            {subtitle}
          </span>
        )}
      </div>
      <div className="relative space-y-3">
        {data.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">No data yet.</p>
        ) : (
          data.map((entry) => (
            <div key={entry.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-medium text-gray-700 dark:text-gray-300">
                    {entry.label}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-gray-500 dark:text-gray-400">
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

// Collapse a long-tailed distribution into the top-N slices plus a rolled-up
// "Other" bucket, so a donut with many small categories stays legible.
function rollUpLongTail(data: Entry[], topN = 7): Entry[] {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  if (sorted.length <= topN + 1) return sorted;
  const head = sorted.slice(0, topN);
  const tail = sorted.slice(topN);
  const otherValue = tail.reduce((sum, e) => sum + e.value, 0);
  if (otherValue <= 0) return head;
  return [...head, { label: `Other (${tail.length})`, value: otherValue }];
}

// Donut (ring) chart with a bold center total and a side legend listing each
// category with a colored dot, label, and its percentage. Glassy card styling
// consistent with the rest of the dashboard; works in light and dark mode.
function DonutCard({
  title,
  data,
  centerLabel,
  valueSuffix = "",
  topN = 7,
}: {
  title: string;
  data: Entry[];
  centerLabel: string;
  valueSuffix?: string;
  topN?: number;
}) {
  const slices = useMemo(() => rollUpLongTail(data, topN), [data, topN]);
  const total = useMemo(
    () => slices.reduce((sum, e) => sum + e.value, 0),
    [slices],
  );
  const isEmpty = slices.length === 0 || total === 0;

  return (
    <section className="relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 p-4 shadow-neu backdrop-blur-xl dark:border-white/10 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
      {/* Faint accent glow — premium glassy cue */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-500/10 blur-3xl dark:bg-violet-500/20" />
      <h2 className="relative mb-4 text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      {isEmpty ? (
        <p className="py-10 text-center text-sm text-gray-400">No data yet.</p>
      ) : (
        <div className="relative flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          {/* Donut with center total */}
          <div className="relative h-[180px] w-[180px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={82}
                  paddingAngle={2}
                  cornerRadius={4}
                  stroke="none"
                >
                  {slices.map((entry, i) => (
                    <Cell
                      key={entry.label}
                      fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-louize text-2xl font-medium leading-none text-gray-950 dark:text-white">
                {formatNumber(total)}
              </span>
              <span className="mt-1 text-[10px] uppercase tracking-wider text-gray-400">
                {centerLabel}
              </span>
            </div>
          </div>
          {/* Side legend: dot + label + right-aligned percentage */}
          <ul className="w-full min-w-0 flex-1 space-y-1.5">
            {slices.map((entry, i) => {
              const pct = total > 0 ? (entry.value / total) * 100 : 0;
              return (
                <li
                  key={entry.label}
                  className="flex items-center gap-2 text-xs"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                  />
                  <span className="min-w-0 flex-1 truncate font-medium text-gray-700 dark:text-gray-300">
                    {entry.label}
                  </span>
                  <span className="shrink-0 tabular-nums text-gray-400 dark:text-gray-500">
                    {formatNumber(entry.value)}
                    {valueSuffix}
                  </span>
                  <span className="w-12 shrink-0 text-right font-semibold tabular-nums text-gray-600 dark:text-gray-300">
                    {pct.toFixed(1)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

// Short "Mar 3" axis label for a week-start ISO date ("YYYY-MM-DD", UTC).
const formatWeekLabel = (weekStart: string) => {
  const [y, m, d] = weekStart.split("-").map(Number);
  if (!y || !m || !d) return weekStart;
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
};

// Longer "Week of Mar 3, 2025" label for the tooltip header.
const formatWeekTooltip = (weekStart: string) => {
  const [y, m, d] = weekStart.split("-").map(Number);
  if (!y || !m || !d) return weekStart;
  const date = new Date(Date.UTC(y, m - 1, d));
  return `Week of ${date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;
};

// Compact "18.6K" style formatter for large totals on the Y-axis + tooltip.
const formatCompact = (value: number) => {
  if (!Number.isFinite(value)) return "0";
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    // One decimal only when it adds signal (e.g. 18.6K, but 24K not 24.0K).
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}K`;
  }
  return value.toLocaleString();
};

// Styled, dark-mode-aware tooltip callout showing the week + cumulative total.
function UsersOverTimeTooltip({
  active,
  payload,
  label,
  isDark,
}: {
  active?: boolean;
  payload?: { dataKey?: string | number; value?: number }[];
  label?: string | number;
  isDark: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;
  const cumulative =
    payload.find((p) => p.dataKey === "cumulative")?.value ?? 0;
  return (
    <div
      className="rounded-xl border px-3 py-2 text-xs shadow-lg"
      style={{
        border: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
        background: isDark ? "#0a0a0a" : "#ffffff",
        color: isDark ? "#f9fafb" : "#111827",
      }}
    >
      <p className="mb-0.5 text-[11px] text-gray-400">{formatWeekTooltip(String(label))}</p>
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#10b981" }} />
        {formatNumber(cumulative)}
      </p>
    </div>
  );
}

function UsersOverTimeChart({
  data,
  isDark,
}: {
  data: UsersOverTimePoint[];
  isDark: boolean;
}) {
  const axisColor = isDark ? "#9ca3af" : "#6b7280";
  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const accentColor = "#10b981"; // emerald — running total glow

  // Keep X labels legible when there are many weeks: aim for ~10 ticks.
  const xInterval = data.length > 12 ? Math.ceil(data.length / 10) - 1 : 0;

  // Headline = current cumulative total. Delta = growth over the last ~4 weeks
  // (or the previous point when history is short), as a signed percentage.
  const latest = data.length > 0 ? data[data.length - 1].cumulative : 0;
  const lookback = Math.min(4, data.length - 1);
  const prior =
    lookback > 0 ? data[data.length - 1 - lookback].cumulative : latest;
  const deltaPct =
    prior > 0 ? ((latest - prior) / prior) * 100 : latest > 0 ? 100 : 0;
  const hasDelta = data.length >= 2;
  const deltaUp = deltaPct >= 0;

  return (
    <section className="relative overflow-hidden rounded-xl border border-gray-200 bg-white/80 p-4 shadow-neu backdrop-blur-xl dark:border-white/10 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-500/20" />
      <div className="relative mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-500" />
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
            User growth
          </h2>
          <span className="ml-auto text-[11px] font-medium text-gray-400">
            Weekly
          </span>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <p className="text-3xl font-bold leading-none tracking-tight text-gray-900 dark:text-white">
            {formatNumber(latest)}
          </p>
          {hasDelta ? (
            <span
              className={`mb-0.5 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                deltaUp
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-500/10 text-red-600 dark:text-red-400"
              }`}
            >
              {deltaUp ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {Math.abs(deltaPct).toFixed(1)}%
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          Total users{lookback > 0 ? ` · vs ${lookback}w ago` : ""}
        </p>
      </div>
      {data.length < 2 ? (
        <p className="py-16 text-center text-sm text-gray-400">
          Not enough signup history yet.
        </p>
      ) : (
        <div className="relative h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -4 }}>
              <defs>
                <linearGradient id="adminUsersArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={accentColor} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={accentColor} stopOpacity={0} />
                </linearGradient>
                <filter id="adminUsersGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <CartesianGrid stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="weekStart"
                tickFormatter={formatWeekLabel}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridColor }}
                interval={xInterval}
                minTickGap={24}
              />
              <YAxis
                allowDecimals={false}
                width={44}
                tickFormatter={formatCompact}
                tick={{ fill: axisColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                cursor={{ stroke: accentColor, strokeWidth: 1, strokeOpacity: 0.4 }}
                content={<UsersOverTimeTooltip isDark={isDark} />}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                name="cumulative"
                stroke={accentColor}
                strokeWidth={2.5}
                fill="url(#adminUsersArea)"
                style={{ filter: "url(#adminUsersGlow)" }}
                dot={{ r: 2, fill: accentColor, strokeWidth: 0 }}
                activeDot={{
                  r: 5,
                  fill: accentColor,
                  stroke: isDark ? "#0a0a0a" : "#ffffff",
                  strokeWidth: 2,
                }}
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

  // Asked of the server, so the operator list never reaches the bundle.
  const { isAdmin, ready: adminReady } = useIsAdmin(user);

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
          <div className="space-y-12">
            <section id="overview" className="scroll-mt-20 space-y-4">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-louize text-lg font-medium text-gray-950 dark:text-white">
                  Overview
                </h2>
                <p className="text-xs text-gray-400">
                  Generated {new Date(stats.generatedAt).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatTile
                label="Users"
                value={formatNumber(stats.overview.totalUsers)}
                sub={`${formatNumber(stats.overview.profilesCreated)} of ${formatNumber(stats.overview.totalUsers)} have a profile`}
                icon={<Users className="h-4 w-4" />}
              />
              <StatTile
                label="Yale coverage"
                value={`${Math.min(
                  (stats.overview.totalUsers / YALE_UNDERGRAD_POPULATION) * 100,
                  100,
                ).toFixed(1)}%`}
                sub={`${formatNumber(stats.overview.totalUsers)} of ~6,600 undergrads`}
                icon={<Target className="h-4 w-4" />}
              />
              <StatTile
                label="Courses"
                value={formatNumber(stats.overview.totalCourses)}
                sub={`${stats.overview.averageCoursesPerUser} avg per user`}
                icon={<BookOpen className="h-4 w-4" />}
              />
              <StatTile
                label="Imported courses"
                value={`${stats.overview.importedCoursesRate}%`}
                sub={`${formatNumber(stats.overview.usersWithCourses)} of ${formatNumber(stats.overview.profilesCreated)} have courses`}
                icon={<DownloadCloud className="h-4 w-4" />}
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
              </div>
            </section>

            <section id="charts" className="scroll-mt-20 space-y-4">
              <h2 className="font-louize text-lg font-medium text-gray-950 dark:text-white">
                Charts
              </h2>
              <UsersOverTimeChart
                data={stats.usersOverTime ?? []}
                isDark={resolvedTheme === "dark"}
              />
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <DonutCard title="Top majors" data={stats.distributions.majors} centerLabel="selections" />
                <DonutCard title="Class years" data={stats.distributions.graduationYears} centerLabel="students" />
                <DonutCard title="Course statuses" data={stats.distributions.courseStatuses} centerLabel="courses" />
                <DonutCard title="Distributional tags" data={stats.distributions.distributionals} centerLabel="courses" />
                <DonutCard title="Grades" data={stats.distributions.grades} centerLabel="grades" />
                <BarList
                  title="Departments by courses"
                  subtitle={stats.distributions.departmentsByCourses.length > 12 ? "Top 12" : undefined}
                  data={stats.distributions.departmentsByCourses.slice(0, 12)}
                />
                <BarList
                  title="Departments by credits"
                  subtitle={stats.distributions.departmentsByCredits.length > 12 ? "Top 12" : undefined}
                  data={stats.distributions.departmentsByCredits.slice(0, 12)}
                  valueSuffix=" cr"
                />
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
