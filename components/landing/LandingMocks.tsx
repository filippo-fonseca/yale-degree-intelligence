"use client";

import {
  FiBarChart2,
  FiBookOpen,
  FiCalendar,
  FiLayers,
  FiUsers,
} from "react-icons/fi";

export function RequirementPill({
  label,
  credits,
  status,
}: {
  label: string;
  credits?: number;
  status: "complete" | "in-progress" | "not-taken";
}) {
  const styles = {
    complete:
      "bg-emerald-100 border-emerald-300 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-700 dark:text-emerald-300",
    "in-progress":
      "bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-300",
    "not-taken":
      "bg-red-100 border-red-300 text-red-700 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300",
  } as const;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-sf text-[10px] font-medium ${styles[status]}`}
    >
      {label}
      {credits != null && (
        <span className="opacity-70">{credits.toFixed(1)}</span>
      )}
    </span>
  );
}

export function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full border border-black/[0.05] bg-gray-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:border-white/[0.05] dark:bg-gray-900/80">
      <div
        className="h-full rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"
        style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
      />
    </div>
  );
}

function MiniSidebar() {
  // Labels match the authenticated app sidebar.
  const items = [
    { icon: FiBookOpen, label: "My courses", active: false },
    { icon: FiLayers, label: "My major", active: true },
    { icon: FiCalendar, label: "Simulator", active: false },
    { icon: FiBarChart2, label: "Academic stats", active: false },
    { icon: FiUsers, label: "Friends", active: false },
  ];

  return (
    <div className="hidden w-[4.5rem] shrink-0 flex-col items-center gap-1.5 rounded-2xl border border-black/[0.06] bg-white/80 py-3 shadow-neu-sm backdrop-blur-xl sm:flex dark:border-white/[0.08] dark:bg-gradient-to-b dark:from-gray-900/70 dark:to-gray-950/70">
      {items.map(({ icon: Icon, label, active }) => (
        <div
          key={label}
          title={label}
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${
            active
              ? "bg-pink-500/15 text-pink-600 ring-1 ring-pink-500/20 dark:text-pink-300"
              : "text-gray-400 dark:text-gray-500"
          }`}
        >
          <Icon size={14} />
        </div>
      ))}
    </div>
  );
}

export function HeroAppMock() {
  return (
    <div className="flex gap-3 bg-gradient-to-br from-blue-50/40 via-white to-purple-50/30 p-3 sm:p-4 dark:from-blue-950/15 dark:via-transparent dark:to-purple-950/15">
      <MiniSidebar />
      <div className="min-w-0 flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-sf text-[10px] font-medium uppercase tracking-[0.12em] text-gray-400">
              Computer Science · B.S.
            </p>
            <p className="mt-0.5 font-louize text-base font-medium text-gray-900 dark:text-white sm:text-lg">
              Major progress
            </p>
          </div>
          <span className="shrink-0 rounded-md border border-black/[0.06] bg-white px-2 py-0.5 font-sf text-[10px] text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-400">
            5 / 12
          </span>
        </div>

        <div className="space-y-2.5 rounded-xl border border-gray-200 bg-white p-3 shadow-neu dark:border-gray-800/50 dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60">
          <div className="space-y-1">
            <div className="flex justify-between font-sf text-[11px] text-gray-500">
              <span>Completed</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                42%
              </span>
            </div>
            <ProgressBar percent={42} />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between font-sf text-[11px] text-gray-500">
              <span>+ in progress</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                67%
              </span>
            </div>
            <ProgressBar percent={67} />
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 shadow-neu-sm dark:border-emerald-800/40 dark:bg-emerald-950/25">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-medium text-xs text-emerald-800 dark:text-emerald-200">
                Introductory Sequence
              </p>
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 font-sf text-[9px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                2/2
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              <RequirementPill label="CPSC 2010" credits={1} status="complete" />
              <RequirementPill label="CPSC 2020" credits={1} status="complete" />
            </div>
          </div>
          <div className="rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 shadow-neu-sm dark:border-blue-800/40 dark:bg-blue-950/25">
            <div className="mb-1.5 flex items-center justify-between">
              <p className="font-medium text-xs text-blue-800 dark:text-blue-200">
                Core Systems
              </p>
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 font-sf text-[9px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                1/3
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              <RequirementPill label="CPSC 2230" credits={1} status="complete" />
              <RequirementPill
                label="CPSC 3230"
                credits={1}
                status="in-progress"
              />
              <RequirementPill label="CPSC 3650" credits={1} status="not-taken" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SimulatorMock() {
  const cols = [
    {
      sem: "Fall 2025",
      courses: [
        { code: "CPSC 323", cr: 1 },
        { code: "EENG 200", cr: 1 },
        { code: "WR 120", cr: 1 },
      ],
    },
    {
      sem: "Spring 2026",
      courses: [
        { code: "CPSC 365", cr: 1 },
        { code: "MATH 222", cr: 1 },
      ],
    },
    {
      sem: "Fall 2026",
      courses: [{ code: "CPSC 490", cr: 1 }],
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-3 sm:p-4">
      {cols.map((col) => (
        <div
          key={col.sem}
          className="rounded-xl border border-gray-200 bg-white p-2 shadow-neu-sm dark:border-gray-800/50 dark:bg-gray-900/50"
        >
          <p className="mb-2 border-b border-gray-100 pb-1.5 font-sf text-[10px] font-medium text-gray-600 dark:border-gray-800 dark:text-gray-300">
            {col.sem}
          </p>
          <div className="space-y-1.5">
            {col.courses.map((c) => (
              <div
                key={c.code}
                className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50/80 px-2 py-1.5 dark:border-gray-800 dark:bg-gray-950/40"
              >
                <span className="font-sf text-[10px] font-medium text-gray-800 dark:text-gray-200">
                  {c.code}
                </span>
                <span className="font-sf text-[9px] text-gray-400">
                  {c.cr.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export const STATS_MOCK = {
  gpa: "3.88",
  credits: "18.5",
  courses: "16",
  avg: "4.7",
};

export const FRIENDS_MOCK = [
  {
    name: "Sarah C.",
    meta: "CPSC & MATH · Class of ’26",
    detail: "12 shared courses",
    initials: "SC",
    gradient: "from-pink-500 to-purple-600",
  },
  {
    name: "Alex R.",
    meta: "ECON & S&DS · Class of ’27",
    detail: "8 shared courses",
    initials: "AR",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    name: "Jordan K.",
    meta: "MCDB · Class of ’25",
    detail: "5 shared courses",
    initials: "JK",
    gradient: "from-emerald-500 to-teal-600",
  },
];
