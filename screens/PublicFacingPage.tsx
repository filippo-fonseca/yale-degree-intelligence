"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import {
  FiUsers,
  FiPlayCircle,
  FiUserPlus,
  FiCheck,
  FiX,
  FiUser,
  FiMoon,
  FiSun,
} from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import toast from "react-hot-toast";
import { GraduationCap, BookOpen, Award, Clock } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { UserAvatar } from "@/components/ui/UserAvatar";

function CountUp({
  to,
  inView,
  decimals = 0,
  duration = 0.8,
}: {
  to: number;
  inView: boolean;
  decimals?: number;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const sp = useSpring(mv, { stiffness: 480, damping: 35, duration });
  const rounded = useTransform(sp, (v) => v.toFixed(decimals));
  useEffect(() => {
    if (inView) mv.set(to);
  }, [inView, to, mv]);
  return <motion.span>{rounded as any}</motion.span>;
}

const statsMock = {
  gpa: 3.88,
  totalCredits: 18.5,
  coursesCompleted: 16,
  avgCreditsPerSem: 4.7,
  progressToGradPct: 78, // optional subtitle for Total Credits
};

// avoid SSR issues with charts
const LineChart = dynamic(
  () => import("@mui/x-charts/LineChart").then((m) => m.LineChart),
  { ssr: false },
);
const PieChartWrapper = dynamic(
  () => import("@/components/ui/PieChartWrapper"),
  { ssr: false },
);

// --- Stats demo data (public page) ---
const statsDemo = {
  semesters: ["Fall 23", "Spring 24", "Fall 24", "Spring 25"],
  cumulativeGpa: [3.79, 3.71, 3.8, 3.88], // smooth upward trend
  gradeDistribution: [
    { label: "A", count: 9.5 },
    { label: "A-", count: 3 },
    { label: "B+", count: 4 },
    { label: "B", count: 1 },
    { label: "B-", count: 1 },
  ],
};

// The app's own DEPT_COLORS (StatsView.tsx:26). The grade pie must not invent
// a palette of its own.
const DEPT_COLORS = [
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

/**
 * The app's requirement status tokens, lifted verbatim from
 * MajorProgressView/requirementStatus.ts so the mock cards are the same cards.
 */
const STATUS_CLASSES = {
  completed: {
    card: "bg-emerald-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-emerald-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-emerald-200 dark:border-emerald-800/25",
    title: "text-emerald-700 dark:text-emerald-300",
    badge:
      "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/30",
    description: "text-emerald-600 dark:text-emerald-300/70",
    accent: "text-emerald-600 dark:text-emerald-300",
  },
  inProgress: {
    card: "bg-blue-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-gray-900/50 dark:to-gray-950/50 border-blue-200 dark:border-blue-800/30",
    title: "text-blue-600 dark:text-blue-300",
    badge:
      "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-300 dark:border-blue-700/30",
    description: "text-blue-500 dark:text-blue-300/70",
    accent: "text-blue-600 dark:text-blue-300",
  },
  partial: {
    card: "bg-amber-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-amber-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-amber-200 dark:border-amber-800/30",
    title: "text-amber-700 dark:text-amber-300",
    badge:
      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700/30",
    description: "text-amber-600 dark:text-amber-300/70",
    accent: "text-amber-600 dark:text-amber-300",
  },
  notStarted: {
    card: "bg-red-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-red-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-red-200 dark:border-red-800/25",
    title: "text-red-600 dark:text-red-300",
    badge:
      "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700/30",
    description: "text-red-500 dark:text-red-300/70",
    accent: "text-red-600 dark:text-red-300",
  },
} as const;

type DemoStatus = keyof typeof STATUS_CLASSES;

/** getHeatCellClasses, same source file, for the requirement heat map. */
const HEAT_CELL: Record<DemoStatus, string> = {
  completed:
    "bg-emerald-500/90 dark:bg-emerald-500/80 border-emerald-600/40 text-white",
  inProgress:
    "bg-blue-500/80 dark:bg-blue-500/70 border-blue-600/40 text-white",
  partial:
    "bg-amber-400/90 dark:bg-amber-500/70 border-amber-600/40 text-amber-950 dark:text-white",
  notStarted:
    "bg-red-200/80 dark:bg-red-900/40 border-red-400/40 text-red-900 dark:text-red-200",
};

/** optionPillClasses, RequirementCard.tsx. */
const OPTION_PILL = {
  complete:
    "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700",
  "in-progress":
    "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700",
  "not-taken":
    "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700",
} as const;

/** The app's card idiom, StatsView.tsx:178. */
const APP_CARD_P3 =
  "p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 transition-all relative shadow-neu";
const APP_CARD_P4 =
  "p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-gray-800/50 shadow-neu";

/**
 * The app's major progress bar (MajorProgressView/index.tsx:620): one track,
 * two stacked fills, completed painted over in-progress. Not two rainbow bars.
 */
function MajorProgressBar({
  completedPct,
  withInProgressPct,
}: {
  completedPct: number;
  withInProgressPct: number;
}) {
  return (
    <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-3 overflow-hidden shadow-[inset_0_1px_2px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${withInProgressPct}%` }}
        viewport={mockViewport}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute inset-y-0 left-0 rounded-full bg-purple-400 dark:bg-purple-500/70"
      />
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${completedPct}%` }}
        viewport={mockViewport}
        transition={{ duration: 1, ease: "easeOut" }}
        className="absolute inset-y-0 left-0 rounded-full bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.6)]"
      />
    </div>
  );
}

export default function AboutPage() {
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

  // The chart tokens StatsView derives from the theme. Same values, so the
  // mock charts read as the app's charts in both themes.
  const isDark = resolvedTheme === "dark";
  const axisTickColor = isDark ? "#9CA3AF" : "#4B5563";
  const gridLineColor = isDark ? "#374151" : "#E5E7EB";
  const pieBorderColor = isDark ? "#0B1120" : "#FFFFFF";

  // §11: no interstitial. Every "Log in with CAS" opens the CAS popup straight
  // from here. The id tracks which button was pressed so only that one shows a
  // pending state. The yale.edu allowlist stays where it is, inside
  // signInWithGoogle; this layer only reports failures.
  const { signInWithGoogle } = useAuth();
  const [authPendingId, setAuthPendingId] = useState<string | null>(null);
  const startLogin = async (id: string) => {
    if (authPendingId) return;
    setAuthPendingId(id);
    try {
      await signInWithGoogle();
    } catch {
      toast.error("Could not sign you in. Please try again.");
    } finally {
      setAuthPendingId(null);
    }
  };

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowVideoModal(false);
    };
    if (showVideoModal) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [showVideoModal]);

  // These drive the entrance motion only. Spec §0: content is never hidden by
  // default, so the charts and counters below mount and settle on their own
  // rather than waiting on an intersection that never fires in a static
  // full-page capture. A viewport look-ahead is not enough here, because the
  // stats mock sits several screens below the fold.
  const lookAhead = { once: true, amount: 0.35 } as const;
  const lineRef = useRef<HTMLDivElement | null>(null);
  const lineInView = useInView(lineRef, lookAhead);
  const pieRef = useRef<HTMLDivElement | null>(null);
  const pieInView = useInView(pieRef, lookAhead);
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const cardsInView = useInView(cardsRef, lookAhead);

  // Flips shortly after mount so nothing depends on a scroll that may never
  // happen. Entrances still fire on intersection for anyone who does scroll.
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSettled(true), 300);
    return () => clearTimeout(t);
  }, []);
  const cardsShown = cardsInView || settled;
  const lineShown = lineInView || settled;
  const pieShown = pieInView || settled;

  // --- mock for public preview ---
  const demoTotals = { completed: 5, inProgress: 3, total: 12 };

  const demoStrictPct = Math.round(
    (demoTotals.completed / demoTotals.total) * 100,
  );
  const demoWithIPPct = Math.round(
    ((demoTotals.completed + demoTotals.inProgress) / demoTotals.total) * 100,
  );

  // The requirements board, grouped by status the way the app groups it.
  type DemoPill = {
    code: string;
    cr: number;
    status: "complete" | "in-progress" | "not-taken";
  };
  type DemoReq = {
    name: string;
    badge: string;
    desc: string;
    pills: DemoPill[];
  };
  const demoColumns: Array<{
    label: string;
    status: DemoStatus;
    meta: string;
    reqs: DemoReq[];
  }> = [
    {
      label: "Completed",
      status: "completed",
      meta: "1 req · 2 cr",
      reqs: [
        {
          name: "Introductory Sequence",
          badge: "\u2713",
          desc: "Two foundational courses.",
          pills: [
            { code: "CPSC 201", cr: 1, status: "complete" },
            { code: "CPSC 202", cr: 1, status: "complete" },
          ],
        },
      ],
    },
    {
      label: "In progress",
      status: "inProgress",
      meta: "1 req · 3 cr",
      reqs: [
        {
          name: "Core Systems",
          badge: "1/3",
          desc: "Three systems-level courses.",
          pills: [
            { code: "CPSC 223", cr: 1, status: "complete" },
            { code: "CPSC 323", cr: 1, status: "in-progress" },
            { code: "CPSC 365", cr: 1, status: "not-taken" },
          ],
        },
      ],
    },
    {
      label: "Not started",
      status: "notStarted",
      meta: "1 req · 2 cr",
      reqs: [
        {
          name: "Mathematics",
          badge: "0/2",
          desc: "Two math electives.",
          pills: [
            { code: "MATH 222", cr: 1, status: "not-taken" },
            { code: "MATH 241", cr: 1, status: "not-taken" },
          ],
        },
      ],
    },
  ];

  // The heat map grid: one cell per requirement, labelled as the app labels it.
  const demoHeat: Array<{ name: string; ratio: string; status: DemoStatus }> = [
    { name: "Intro Seq", ratio: "2/2", status: "completed" },
    { name: "Core Systems", ratio: "1/3", status: "inProgress" },
    { name: "Algorithms", ratio: "1/1", status: "completed" },
    { name: "Math", ratio: "0/2", status: "notStarted" },
    { name: "Senior Proj", ratio: "0/1", status: "notStarted" },
    { name: "Electives", ratio: "2/3", status: "partial" },
    { name: "Systems Lab", ratio: "1/1", status: "completed" },
    { name: "Theory", ratio: "1/2", status: "partial" },
    { name: "Ethics", ratio: "1/1", status: "completed" },
    { name: "Statistics", ratio: "0/1", status: "notStarted" },
    { name: "Capstone", ratio: "0/1", status: "notStarted" },
    { name: "Seminar", ratio: "1/1", status: "inProgress" },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0b] font-louize overflow-x-hidden">
      {/* §1 YDN banner, above the nav and dismissible for good */}
      <YdnBanner />

      {/* Nav */}
      <nav className="sticky top-0 z-50 h-14 backdrop-blur-xl bg-white/70 dark:bg-[#0a0a0b]/70 border-b border-black/[0.05] dark:border-white/[0.06]">
        <div className="max-w-7xl mx-auto h-full px-4 lg:px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon width={22} height={22} />
            <span className="text-sm font-medium text-gray-900 dark:text-white hidden sm:inline">
              DegreeIntelligence
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <Link
              href="/changelog"
              className="hidden sm:inline text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Changelog
            </Link>
            <Link
              href="/mission"
              className="hidden sm:inline text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            >
              Mission
            </Link>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-full p-2 text-gray-500 transition-colors hover:bg-black/[0.04] hover:text-gray-900 dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              {resolvedTheme === "dark" ? (
                <FiSun size={14} />
              ) : (
                <FiMoon size={14} />
              )}
            </button>
            <MonoCTA
              onClick={() => startLogin("nav")}
              pending={authPendingId === "nav"}
            >
              <span className="sm:hidden">Log in</span>
              <span className="hidden sm:inline">Log in with CAS</span>
              <span aria-hidden>→</span>
            </MonoCTA>
          </div>
        </div>
      </nav>

      {/* §2 Hero */}
      {/* isolate: the dot grid and tiles sit on negative z, so the band needs its
          own stacking context or they paint behind the canvas background. */}
      <section className="relative isolate pt-24 md:pt-32 pb-16 md:pb-24">
        {/* Hero dot grid, faded out by ~55% of the hero band's height */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.055)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_55%)]"
        />

        {/* §3 Floating course tiles. Framed around the headline, md+ only.
            The inner max-w-5xl track matches the headline block's envelope, so
            the tiles orbit the type instead of hugging the viewport edges. */}
        <div className="pointer-events-none absolute inset-0 -z-[1]">
          <div className="relative mx-auto h-full max-w-5xl px-4 lg:px-6">
            <FloatingTile
              className="top-[11%] left-[1%] lg:left-[3%]"
              rotate={-6}
              delay={0}
            >
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                CPSC 323
              </span>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                A-
              </span>
            </FloatingTile>

            <FloatingTile
              className="top-[14%] right-[1%] lg:right-[4%]"
              rotate={5}
              delay={1.5}
            >
              <span className="text-xs text-gray-500 dark:text-gray-400">
                GPA
              </span>
              <span className="font-mono text-xs font-medium text-gray-900 dark:text-white">
                3.87
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                ↑
              </span>
            </FloatingTile>

            <FloatingTile
              className="bottom-[13%] left-[2%] lg:left-[5%] !flex-col !items-start !gap-1.5"
              rotate={4}
              delay={3}
            >
              <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                Core 7/9
              </span>
              <span className="block h-1 w-20 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                <span className="block h-full w-[78%] rounded-full bg-gradient-to-r from-pink-500 to-purple-600" />
              </span>
            </FloatingTile>

            <FloatingTile
              className="bottom-[10%] right-[2%] lg:right-[5%]"
              rotate={-4}
              delay={4.5}
            >
              <span className="font-mono text-xs text-gray-900 dark:text-white">
                ECON 121
              </span>
              <span className="rounded-full bg-black/[0.05] px-2 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
                Hum
              </span>
            </FloatingTile>

            {/* A tiny GPA sparkline, the stats view in miniature */}
            <FloatingTile
              className="top-[42%] right-[0%] lg:right-[1%] !flex-col !items-start !gap-1.5"
              rotate={-5}
              delay={2.2}
            >
              <span className="font-mono text-[10px] text-gray-500 dark:text-gray-400">
                GPA trend
              </span>
              <svg
                width="64"
                height="18"
                viewBox="0 0 64 18"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 14L13 11L25 13L37 7L49 8L63 2"
                  stroke="url(#tileSpark)"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <defs>
                  <linearGradient id="tileSpark" x1="0" y1="0" x2="64" y2="0">
                    <stop stopColor="#ec4899" />
                    <stop offset="1" stopColor="#9333ea" />
                  </linearGradient>
                </defs>
              </svg>
            </FloatingTile>

            {/* Distributionals, using the app's own chip colors */}
            <FloatingTile
              className="top-[47%] left-[0%] lg:left-[1%]"
              rotate={5}
              delay={5.2}
            >
              <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2 py-0.5 text-[10px] font-medium text-purple-700 dark:text-purple-300">
                Hu ✓
              </span>
              <span className="rounded-full border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 text-[10px] font-medium text-sky-700 dark:text-sky-300">
                So ✓
              </span>
              <span className="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-300">
                QR 1/2
              </span>
            </FloatingTile>

            {/* A friend, the one social note in the orbit */}
            <FloatingTile
              className="top-[5%] right-[17%] lg:right-[21%]"
              rotate={6}
              delay={3.7}
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-[9px] font-medium text-white">
                SC
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                2 mutual courses
              </span>
            </FloatingTile>
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 lg:px-6 text-center">
          {/* 1. The one hero pill */}
          <div className="flex justify-center">
            {/* The banner owns the YDN mention, so the pill is just the release. */}
            <Link
              href="/changelog"
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-1 text-xs font-medium font-sf text-gray-900 dark:text-white transition-opacity hover:opacity-70"
            >
              ✦ v3 is out now
            </Link>
          </div>

          {/* 2. Headline */}
          <h1 className="mt-8 font-medium text-balance text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95] tracking-[-0.02em] text-gray-900 dark:text-white">
            The control plane
            <br />
            <span className="text-gray-400 dark:text-gray-500">
              for your Yale degree.
            </span>
          </h1>

          {/* 3. Subhead */}
          <p className="mt-6 mx-auto max-w-[60ch] font-sf text-base md:text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            Plan semesters, track requirements, simulate outcomes, and see
            exactly how your degree is going. Built by Yalies, for Yalies.
          </p>

          {/* 4. CTA row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-sf">
            <BrandCTA
              onClick={() => startLogin("hero")}
              pending={authPendingId === "hero"}
            >
              Log in with CAS
            </BrandCTA>
            <GhostCTA onClick={() => setShowVideoModal(true)}>
              Watch the launch film
            </GhostCTA>
          </div>

          {/* 5. Mono microcopy */}
          <p className="mt-5 font-mono text-xs tracking-tight text-gray-400 dark:text-gray-500">
            Free forever · No install · 1 in 6 Yale undergrads already on board
          </p>
        </div>
      </section>

      {/* §4 The product window: the launch film */}
      <section className="relative isolate px-4 lg:px-6">
        {/* The page's one glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 flex items-start justify-center"
        >
          <div className="h-[28rem] w-[52rem] max-w-full rounded-full bg-gradient-to-r from-pink-500/15 to-purple-600/15 blur-[120px]" />
        </div>

        <motion.div
          {...reveal}
          className="relative mx-auto max-w-6xl [mask-image:linear-gradient(to_bottom,black_85%,transparent)]"
        >
          <div className="overflow-hidden rounded-2xl border border-black/[0.08] dark:border-white/[0.09] bg-white dark:bg-[#101013] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.35)]">
            {/* Title bar */}
            <div className="relative flex items-center gap-1.5 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
              <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
              <span className="pointer-events-none absolute inset-x-0 text-center font-mono text-[10px] text-gray-400 dark:text-gray-500">
                v3-launch-film.mp4
              </span>
            </div>

            {/* Film, edge to edge under the title bar */}
            <div className="aspect-video">
              <iframe
                src="https://www.youtube.com/embed/5H1kjMWQfgs?si=F9mSXs1G_Wy1Fkx-"
                title="DegreeIntelligence v3 launch film"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className="h-full w-full border-0"
              />
            </div>
          </div>
        </motion.div>
      </section>

      {/* §5 Statement band */}
      <section className="px-4 py-28 lg:px-6">
        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <h2 className="font-medium text-balance text-4xl md:text-5xl leading-[1.02] tracking-[-0.015em] text-gray-900 dark:text-white">
            Used by 1 in 6 Yale undergrads.
            <br />
            <span className="text-gray-400 dark:text-gray-500">
              Some of them even like it.
            </span>
          </h2>
          <p className="mt-6 font-mono text-xs tracking-tight text-gray-400 dark:text-gray-500">
            ~1,200 students · every residential college · zero ads, zero fees
          </p>
        </motion.div>
      </section>

      {/* Blueprint band: open canvas, no panel */}
      <section className="px-4 py-24 lg:px-6">
        <motion.div {...reveal} className="mx-auto max-w-5xl">
          <div className="text-center">
            <Kicker>The blueprint</Kicker>
            <h2 className="mt-4 text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-gray-900 dark:text-white md:text-5xl">
              Our blueprint,
              <br />
              <span className="text-gray-400 dark:text-gray-500">
                broken down.
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-[60ch] font-sf text-base leading-relaxed text-gray-500 dark:text-gray-400 md:text-lg">
              How we turned frustration into an elegant way to plan and see a
              Yale degree.
            </p>
          </div>

          <div className="mt-16 grid gap-12 font-sf sm:grid-cols-3 sm:gap-10">
            {[
              {
                title: "The problem",
                body: "Requirements scattered across PDFs and websites, tracked by hand in fragile spreadsheets, with no single view of progress. Double majors made it worse.",
              },
              {
                title: "Our solution",
                body: "One unified requirements database, real-time progress and visualization, course recommendations that know your major, and an interface that stays out of the way.",
              },
              {
                title: "The impact",
                body: "Hours back on planning, far fewer tracking errors, room left for the fun classes, and academic insight that is no longer gatekept.",
              },
            ].map((item) => (
              <div key={item.title}>
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* §6.1 Simulator */}
      <FeatureSection
        id="simulator"
        kicker="Simulator"
        line1="Simulator: drag, drop,"
        line2="done."
        body={
          <>
            Build a semester-by-semester plan by dragging courses from your
            major, or search every course at Yale. Save plans, load them later,
            and see how fun classes and distributionals fit without breaking
            anything.
          </>
        }
        checks={[
          <CheckRow key="a">Search the full catalog and your major</CheckRow>,
          <CheckRow key="b">Save and duplicate plans instantly</CheckRow>,
          <CheckRow key="c">Share with friends or mentors</CheckRow>,
          <CheckRow key="d">See where friends slotted courses</CheckRow>,
        ]}
        actions={
          <>
            <MonoCTA
              onClick={() => startLogin("simulator")}
              pending={authPendingId === "simulator"}
            >
              Try the simulator
            </MonoCTA>
            <GhostCTA onClick={() => setShowVideoModal(true)}>
              Watch the launch film
            </GhostCTA>
          </>
        }
        mock={
          <MockWindow filename="simulator-demo.gif">
            {/* Not lazy: this mock is the section's whole payload, and a lazy
                image never fetches in a static full-page capture. */}
            <img
              src="/demo/simulator.gif"
              alt="Simulator demo"
              className="aspect-video w-full object-cover"
              width={860}
              height={704}
            />
          </MockWindow>
        }
      />

      {/* §6.2 Stats preview */}
      <FeatureSection
        id="stats"
        kicker="Stats"
        line1="Contextual stats that"
        line2="actually help."
        mockSide="left"
        body={
          <>
            See your progress and trajectory in context, so you know where to
            improve instead of reading grades in isolation. This is only a
            preview of what is inside.
          </>
        }
        checks={[
          <CheckRow key="a">
            Cumulative GPA, tracked semester by semester
          </CheckRow>,
          <CheckRow key="b">
            Credits and pace against your graduation target
          </CheckRow>,
          <CheckRow key="c">Your grade distribution at a glance</CheckRow>,
        ]}
        actions={
          <MonoCTA
            onClick={() => startLogin("stats")}
            pending={authPendingId === "stats"}
          >
            See my full stats
          </MonoCTA>
        }
        mock={
          <MockWindow filename="stats.tsx">
            <div className="p-4 space-y-4">
              {/* StatsView's stat card grid */}
              <div ref={cardsRef} className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "Cumulative GPA",
                    to: statsMock.gpa,
                    decimals: 2,
                    color: "text-emerald-600 dark:text-emerald-400",
                    icon: <GraduationCap className="h-3.5 w-3.5" />,
                    sub: "Across all completed courses",
                    delta: "+0.12",
                  },
                  {
                    label: "Total Credits",
                    to: statsMock.totalCredits,
                    decimals: 1,
                    color: "text-amber-600 dark:text-amber-400",
                    icon: <BookOpen className="h-3.5 w-3.5" />,
                    sub: `${statsMock.progressToGradPct}% of the way to graduation`,
                  },
                  {
                    label: "Courses Completed",
                    to: statsMock.coursesCompleted,
                    decimals: 0,
                    color: "text-violet-600 dark:text-violet-300",
                    icon: <Award className="h-3.5 w-3.5" />,
                    sub: "5 more in progress right now",
                  },
                  {
                    label: "Avg Credits / Semester",
                    to: statsMock.avgCreditsPerSem,
                    decimals: 1,
                    color: "text-blue-600 dark:text-blue-400",
                    icon: <Clock className="h-3.5 w-3.5" />,
                    sub: "Across 6 semesters",
                  },
                ].map((s, i) => (
                  <motion.div
                    key={s.label}
                    initial={{ opacity: 0, y: 16 }}
                    animate={cardsShown ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: i * 0.05 }}
                    className={APP_CARD_P3}
                  >
                    <div className="mb-0.5 flex items-center gap-1.5">
                      <span className={`${s.color} opacity-70`}>{s.icon}</span>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {s.label}
                      </p>
                    </div>
                    <p className={`text-lg font-medium ${s.color}`}>
                      <CountUp
                        to={s.to}
                        inView={cardsShown}
                        decimals={s.decimals}
                      />
                    </p>
                    <p className="mt-0.5 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                      {s.sub}
                    </p>
                    {s.delta ? (
                      <p className="mt-0.5 text-[11px] text-emerald-500 dark:text-emerald-400">
                        {s.delta}{" "}
                        <span className="text-gray-400 dark:text-gray-500">
                          since last semester
                        </span>
                      </p>
                    ) : null}
                  </motion.div>
                ))}
              </div>

              {/* StatsView's ChartCard, twice */}
              <div className="grid grid-cols-1 gap-4">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={mockViewport}
                  transition={{ duration: 0.6 }}
                  className={APP_CARD_P4}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium leading-snug text-gray-900 dark:text-white">
                        Cumulative GPA
                      </h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                        Watch your GPA evolve semester by semester.
                      </p>
                    </div>
                    <div className="ml-2 shrink-0 rounded-lg bg-gray-100 p-1.5 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M3 20L9 12l4 3 8-9"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  </div>
                  <div ref={lineRef} className="h-[220px] w-full">
                    {lineShown && (
                      <LineChart
                        key="cum-line-mounted"
                        height={220}
                        xAxis={[
                          {
                            scaleType: "point",
                            data: statsDemo.semesters,
                            tickLabelStyle: {
                              angle: 40,
                              textAnchor: "start",
                              fontSize: 10,
                              fill: axisTickColor,
                            },
                          },
                        ]}
                        yAxis={[
                          {
                            label: "GPA",
                            min: 3,
                            max: 4,
                            tickInterval: [3, 3.25, 3.5, 3.75, 4],
                          },
                        ]}
                        series={[
                          {
                            data: statsDemo.cumulativeGpa,
                            showMark: true,
                            color: "#8B5CF6",
                            curve: "natural",
                            area: true,
                            label: "Cumulative GPA",
                          },
                        ]}
                        grid={{ vertical: false, horizontal: true }}
                        margin={{ left: 50, right: 16, top: 12, bottom: 64 }}
                        sx={{
                          backgroundColor: "transparent",
                          "& .MuiChartsAxis-tickLabel": { fill: axisTickColor },
                          "& .MuiChartsAxis-label": { fill: axisTickColor },
                          "& .MuiChartsAxis-line, & .MuiChartsAxis-tick": {
                            stroke: gridLineColor,
                          },
                          "& .MuiChartsGrid-line": {
                            stroke: gridLineColor,
                            opacity: isDark ? 0.3 : 0.8,
                          },
                        }}
                      />
                    )}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={mockViewport}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className={APP_CARD_P4}
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="text-sm font-medium leading-snug text-gray-900 dark:text-white">
                        Grade Distribution
                      </h3>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-400 dark:text-gray-500">
                        Your mix of A's, A-'s, B+'s, and beyond.
                      </p>
                    </div>
                    <div className="ml-2 shrink-0 rounded-lg bg-gray-100 p-1.5 text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M11 2a10 10 0 1 0 10 10h-10V2Z"
                          stroke="currentColor"
                          strokeWidth="2"
                        />
                      </svg>
                    </div>
                  </div>
                  <div ref={pieRef} className="h-[220px] w-full">
                    {pieShown && (
                      <PieChartWrapper
                        key="pie-mounted"
                        data={{
                          labels: statsDemo.gradeDistribution.map(
                            (g) => g.label,
                          ),
                          datasets: [
                            {
                              data: statsDemo.gradeDistribution.map(
                                (g) => g.count,
                              ),
                              backgroundColor: statsDemo.gradeDistribution.map(
                                (_, i) => DEPT_COLORS[i % DEPT_COLORS.length],
                              ),
                              borderColor: Array(
                                statsDemo.gradeDistribution.length,
                              ).fill(pieBorderColor),
                              borderWidth: 2,
                            },
                          ],
                        }}
                        showLegend={true}
                      />
                    )}
                  </div>
                </motion.div>
              </div>
            </div>
          </MockWindow>
        }
      />

      {/* §6.3 Major progress */}
      <FeatureSection
        id="major-progress"
        kicker="Major progress"
        line1="Your major progress,"
        line2="visualized."
        body={
          <>
            Track the whole journey at a glance: a clean progress bar, then a
            full grid of requirements showing the courses you have taken and
            what to take next.
          </>
        }
        checks={[
          <CheckRow key="a">
            Progress with and without in-progress credit
          </CheckRow>,
          <CheckRow key="b">
            Every requirement, with the courses that satisfy it
          </CheckRow>,
          <CheckRow key="c">
            A heat map of what is done and what is left
          </CheckRow>,
        ]}
        actions={
          <MonoCTA
            onClick={() => startLogin("major")}
            pending={authPendingId === "major"}
          >
            See my major progress
          </MonoCTA>
        }
        mock={
          <MockWindow filename="major-progress.tsx">
            <div className="p-4 space-y-4">
              {/* MajorProgressView's header row */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                    Computer Science
                  </h3>
                  <p className="text-sm text-gray-500">
                    B.S. · {demoTotals.total} credits required
                  </p>
                </div>
                <p className="shrink-0 text-2xl font-medium text-gray-900 dark:text-white">
                  {demoStrictPct}%
                </p>
              </div>

              {/* One track, two stacked fills, exactly as the app draws it */}
              <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 shadow-neu">
                <MajorProgressBar
                  completedPct={demoStrictPct}
                  withInProgressPct={demoWithIPPct}
                />
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    Show:
                  </span>
                  <span className="rounded-lg border border-purple-600/40 bg-purple-500/15 px-2.5 py-1 text-[11px] text-purple-600 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:text-purple-300">
                    Completed only
                  </span>
                  <span className="rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1 text-[11px] text-gray-400 dark:border-gray-800/50 dark:bg-gray-900/50 dark:text-gray-500">
                    Including in progress
                  </span>
                </div>
              </div>

              {/* MajorStatCard row */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: "Completed",
                    value: `${demoTotals.completed} cr`,
                    color: "text-emerald-600 dark:text-emerald-400",
                  },
                  {
                    label: "In progress",
                    value: `${demoTotals.inProgress} cr`,
                    color: "text-blue-600 dark:text-blue-400",
                  },
                  {
                    label: "Remaining",
                    value: `${demoTotals.total - demoTotals.completed - demoTotals.inProgress} cr`,
                    color: "text-gray-900 dark:text-white",
                  },
                ].map((s) => (
                  <div key={s.label} className={APP_CARD_P3}>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {s.label}
                    </p>
                    <p className={`mt-0.5 text-lg font-medium ${s.color}`}>
                      {s.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* The requirements board: one column per status, as in the app */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {demoColumns.map((col, ci) => {
                  const sc = STATUS_CLASSES[col.status];
                  return (
                    <motion.div
                      key={col.label}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={mockViewport}
                      transition={{ duration: 0.45, delay: ci * 0.08 }}
                      className="flex flex-col rounded-xl border border-gray-200 bg-white/40 dark:border-gray-800/50 dark:bg-gray-900/20"
                    >
                      <div className="flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white/80 px-3 py-2.5 backdrop-blur-md dark:border-gray-800/50 dark:bg-gray-900/70">
                        <h4 className={`text-sm font-medium ${sc.accent}`}>
                          {col.label}
                        </h4>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400">
                          {col.meta}
                        </span>
                      </div>
                      <div className="space-y-3 p-3">
                        {col.reqs.map((req) => (
                          <div
                            key={req.name}
                            className={`relative rounded-xl border p-3 shadow-neu-sm backdrop-blur-md transition-all ${sc.card}`}
                          >
                            <div className="mb-1.5 flex items-start justify-between gap-2">
                              <h5 className={`text-sm font-medium ${sc.title}`}>
                                {req.name}
                              </h5>
                              <span
                                className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] ${sc.badge}`}
                              >
                                {req.badge}
                              </span>
                            </div>
                            <p className={`mb-2 text-[11px] ${sc.description}`}>
                              {req.desc}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {req.pills.map((opt) => (
                                <div
                                  key={opt.code}
                                  className={`relative flex items-center rounded-full px-2 py-0.5 text-xs ${OPTION_PILL[opt.status]}`}
                                >
                                  {opt.code}
                                  <span className="ml-1 text-[0.65rem]">
                                    ({opt.cr}cr
                                    {opt.status === "in-progress"
                                      ? ", in progress"
                                      : opt.status === "complete"
                                        ? ", complete"
                                        : ""}
                                    )
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* The heat map, cell classes and legend from the app */}
              <div>
                <h4 className="mb-2.5 text-sm font-medium text-gray-900 dark:text-white">
                  Requirement heat map
                </h4>
                <div className="mb-3 flex flex-wrap items-center gap-3">
                  {[
                    { label: "Met", dot: "bg-emerald-500" },
                    { label: "In progress", dot: "bg-blue-500" },
                    { label: "Partial", dot: "bg-amber-400" },
                    { label: "Not started", dot: "bg-red-300" },
                  ].map((l) => (
                    <div key={l.label} className="flex items-center gap-1.5">
                      <span
                        className={`h-3 w-3 rounded ${l.dot}`}
                        aria-hidden
                      />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {l.label}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-6 gap-2">
                  {demoHeat.map((cell, i) => (
                    <motion.div
                      key={cell.name}
                      initial={{ opacity: 0, scale: 0.6 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={mockViewport}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      className={`flex aspect-square w-full flex-col justify-between rounded-lg border p-1.5 text-left ${HEAT_CELL[cell.status]}`}
                    >
                      <span className="line-clamp-2 text-[9px] font-medium leading-tight">
                        {cell.name}
                      </span>
                      <span className="mt-1 text-[8px] opacity-80">
                        {cell.ratio}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </MockWindow>
        }
      />

      {/* §6.4 Friends */}
      <FeatureSection
        kicker="Friends"
        line1="Friends and connections,"
        line2="not a leaderboard."
        mockSide="left"
        body={
          <>
            Add friends and mutually see each other's academic journeys. Learn
            from the upperclassmen who already walked your path.
          </>
        }
        checks={[
          <CheckRow key="a">
            Course codes, semesters, and credits are shared
          </CheckRow>,
          <CheckRow key="b">Major and graduation year are shared</CheckRow>,
          <CheckRow key="c">Grades and GPA are never shared</CheckRow>,
        ]}
        actions={
          <MonoCTA
            onClick={() => startLogin("friends")}
            pending={authPendingId === "friends"}
          >
            Enable friends
          </MonoCTA>
        }
        mock={
          <MockWindow filename="friends.tsx">
            <div className="p-4">
              {/* FriendsTab's header row */}
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  Friends
                </h3>
                <span className="flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-pink-600 to-pink-700 px-3 py-1.5 text-xs font-medium text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)]">
                  <FiUserPlus size={12} /> Add Friend
                </span>
              </div>

              <h4 className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-pink-500 dark:text-pink-400">
                <FiUsers size={12} />
                Your Friends
                <span className="ml-1 rounded-full border border-gray-200 bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.06] dark:text-gray-400">
                  3
                </span>
              </h4>

              <div className="space-y-2">
                {[
                  {
                    name: "Sarah Chen",
                    major: "CPSC, MATH",
                    year: "2026",
                  },
                  {
                    name: "Alex Rivera",
                    major: "ECON, S&DS",
                    year: "2027",
                  },
                  { name: "Jordan Kim", major: "MCDB", year: "2025" },
                ].map((friend, i) => (
                  <motion.div
                    key={friend.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={mockViewport}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    className="relative flex items-center justify-between rounded-xl border border-gray-200 bg-white p-3 shadow-neu backdrop-blur-md transition-all dark:border-white/[0.06] dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <UserAvatar displayName={friend.name} size={38} />
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                          {friend.name}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                          <span className="text-pink-500 dark:text-pink-400">
                            {friend.major}
                          </span>
                          <span className="text-gray-300 dark:text-gray-700">
                            ·
                          </span>
                          <span>Class of {friend.year}</span>
                        </div>
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-[11px] font-medium text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300">
                      <FiUser size={12} /> Profile
                    </span>
                  </motion.div>
                ))}
              </div>

              {/* What gets shared, in the app's muted note idiom */}
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-100 p-3 dark:border-white/[0.08] dark:bg-white/[0.04]">
                <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  What gets shared
                </h5>
                <ul className="space-y-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <li className="flex items-center gap-2">
                    <FiCheck
                      className="shrink-0 text-emerald-500 dark:text-emerald-400"
                      size={12}
                    />{" "}
                    Course codes, semesters, and credits
                  </li>
                  <li className="flex items-center gap-2">
                    <FiCheck
                      className="shrink-0 text-emerald-500 dark:text-emerald-400"
                      size={12}
                    />{" "}
                    Major and graduation year
                  </li>
                  <li className="flex items-center gap-2">
                    <FiX
                      className="shrink-0 text-red-500 dark:text-red-400"
                      size={12}
                    />{" "}
                    Grades and GPA are never shared
                  </li>
                </ul>
              </div>
            </div>
          </MockWindow>
        }
      />

      {/* §8 Mission + team, one band */}
      <section id="team" className="scroll-mt-20 px-4 py-28 lg:px-6">
        <motion.div {...reveal} className="mx-auto max-w-3xl text-center">
          <Kicker>Mission</Kicker>
          <h2 className="mt-4 text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-gray-900 dark:text-white md:text-5xl">
            Built at Yale, because
            <br />
            <span className="text-gray-400 dark:text-gray-500">
              we needed it.
            </span>
          </h2>

          <div className="mt-8 space-y-5 font-sf text-base leading-relaxed text-gray-500 dark:text-gray-400 md:text-lg">
            <p>
              Trying to plan our own majors, we kept hitting the same wall.
              Yale's requirements are complex, scattered across PDFs and half a
              dozen poorly organized websites, and nearly impossible to track by
              hand. Planning a double major turned that into a second job.
            </p>
            <p>
              So we built the tool we wish we had: the tedious parts automated,
              every major and concentration requirement in one place, and no
              fragile spreadsheet formulas to maintain. Rather than keep it to
              ourselves, we cleaned it up and published it. We sincerely hope it
              helps.
            </p>
          </div>

          {/* Team, a single row, no cards */}
          <div className="mt-16 flex flex-wrap items-start justify-center gap-x-14 gap-y-10 font-sf">
            {[
              {
                name: "Filippo Fonseca",
                line: "Founder · MechE (ABET) & EECS '28",
                photoRoute: "/team/filippo.jpeg",
              },
              {
                name: "Emir Ahmed",
                line: "Development · EECS '28",
                photoRoute: "/team/emir.JPG",
              },
            ].map((person) => (
              <div
                key={person.name}
                className="flex max-w-[15rem] flex-col items-center"
              >
                <img
                  src={person.photoRoute}
                  alt={person.name}
                  className="h-14 w-14 rounded-full object-cover ring-1 ring-black/[0.08] dark:ring-white/[0.12]"
                />
                <p className="mt-3 text-sm font-medium text-gray-900 dark:text-white">
                  {person.name}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {person.line}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-14 font-mono text-xs tracking-tight text-gray-400 dark:text-gray-500">
            want to contribute?{" "}
            <a
              href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
              className="underline underline-offset-4 transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              → email us
            </a>
          </p>
        </motion.div>
      </section>

      {/* §9 Closing statement */}
      <section className="px-4 py-32 lg:px-6">
        <motion.div {...reveal} className="mx-auto max-w-4xl text-center">
          {/* Hero scale minus one step (spec §9). Any larger and line 1 wraps,
              which turns the two-tone break into three ragged lines. */}
          <h2 className="text-balance text-4xl font-medium leading-[1.02] tracking-[-0.02em] text-gray-900 dark:text-white md:text-5xl lg:text-6xl">
            Your degree deserves better
            <br />
            <span className="text-gray-400 dark:text-gray-500">
              than a spreadsheet.
            </span>
          </h2>
          <div className="mt-10 flex justify-center font-sf">
            <BrandCTA
              onClick={() => startLogin("closing")}
              pending={authPendingId === "closing"}
            >
              Log in with CAS
            </BrandCTA>
          </div>
          <p className="mt-5 font-mono text-xs tracking-tight text-gray-400 dark:text-gray-500">
            free · instant · yale sso
          </p>
        </motion.div>
      </section>

      {/* §10 Footer */}
      <footer className="border-t border-black/[0.05] px-4 py-10 dark:border-white/[0.06] lg:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 font-sf md:flex-row md:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              DegreeIntelligence
            </span>
            <span className="rounded-full border border-black/[0.08] px-2 py-0.5 font-mono text-[10px] text-gray-400 dark:border-white/[0.1] dark:text-gray-500">
              v3.0
            </span>
          </div>

          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
            <Link
              href="/mission"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Mission
            </Link>
            <Link
              href="/changelog"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Changelog
            </Link>
            <Link
              href="/terms"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/contact"
              className="transition-colors hover:text-gray-900 dark:hover:text-white"
            >
              Contact
            </Link>
          </nav>

          <p className="text-center font-mono text-xs tracking-tight text-gray-400 dark:text-gray-500">
            © {new Date().getFullYear()} DegreeIntelligence · not affiliated
            with Yale University
          </p>
        </div>
      </footer>

      {/* Video Modal */}
      <AnimatePresence>
        {showVideoModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowVideoModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="rounded-2xl bg-white/90 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.1] shadow-[0_8px_64px_rgba(0,0,0,0.6),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/[0.04] dark:ring-white/[0.05] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <FiPlayCircle className="text-purple-400" size={16} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      v3 Launch Video
                    </span>
                  </div>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    aria-label="Close video"
                    className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                  >
                    <FiX size={16} />
                  </button>
                </div>

                {/* Video embed */}
                <div className="aspect-video bg-black/50">
                  <iframe
                    src="https://www.youtube.com/embed/5H1kjMWQfgs"
                    title="DegreeIntelligence v3 Launch"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.1] text-gray-500 dark:text-gray-400 text-[10px]">
                      ESC
                    </kbd>{" "}
                    or click outside to close
                  </p>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] hover:from-black/[0.08] dark:hover:from-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * The one entrance treatment (spec §0): opacity 0.001 -> 1, y 10 -> 0, once.
 *
 * The viewport look-ahead matters. Without it a band that starts below the fold
 * stays at opacity 0.001 in a static full-page capture, because the observer
 * never fires when nothing scrolls. Content is never hidden by default, so the
 * entrance has to resolve on its own.
 *
 * The look-ahead is deliberately taller than the page rather than the single
 * extra screen unit 4 needed: once §6 through §10 landed, the page runs about
 * eight viewports, and every section past the first screen stayed invisible in
 * the capture. rootMargin percentages resolve against the viewport, so 1000%
 * covers the whole document.
 */
/**
 * The entrance viewport for motion inside the mocks. Same look-ahead reason as
 * `reveal`: these elements sit deep in the page, and a mock that fades in only
 * on scroll is a mock that is blank in a static capture.
 */
const mockViewport = {
  once: true,
  amount: 0.2,
  margin: "0px 0px 1000% 0px",
} as const;

const reveal = {
  initial: { opacity: 0.001, y: 10 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2, margin: "0px 0px 1000% 0px" },
  transition: { duration: 0.6 },
} as const;

const YDN_BANNER_KEY = "di-ydn-banner-dismissed";
const YDN_ARTICLE_URL =
  "https://yaledailynews.com/blog/2025/09/23/new-student-run-platform-aims-to-simplify-degree-planning/";

/**
 * §1: the slim band above the nav. It defaults to visible and only hides once
 * the effect has read localStorage, so the server render and the first client
 * render agree. Dismissal is permanent.
 */
function YdnBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(YDN_BANNER_KEY) === "1")
        setDismissed(true);
    } catch {
      // Private mode or a blocked store: keep the banner, it is not critical.
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(YDN_BANNER_KEY, "1");
    } catch {
      // Nothing to do; the banner still collapses for this session.
    }
  };

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={false}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="overflow-hidden bg-gray-900 text-white dark:bg-white/[0.06]"
        >
          <div className="relative mx-auto flex h-9 max-w-7xl items-center justify-center px-10 font-sf text-xs font-medium">
            <a
              href={YDN_ARTICLE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-80"
            >
              Featured in the Yale Daily News{" "}
              <span aria-hidden className="opacity-70">
                ↗
              </span>
            </a>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute right-3 rounded p-1 text-white/60 transition-colors hover:text-white"
            >
              <FiX size={14} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * A small hero tile that drifts on a gentle 6s loop. Positioned by the caller
 * against the hero band; sits behind the headline text but above the canvas.
 */
function FloatingTile({
  className,
  rotate,
  delay,
  children,
}: {
  className: string;
  rotate: number;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      aria-hidden
      animate={{ y: [0, -4, 0] }}
      transition={{
        duration: 6,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{ rotate: `${rotate}deg` }}
      className={`absolute hidden md:flex items-center gap-2 rounded-xl border border-black/[0.08] dark:border-white/[0.09] bg-white/90 dark:bg-white/[0.05] backdrop-blur px-3 py-2 shadow-lg font-sf dark:opacity-90 ${className}`}
    >
      {children}
    </motion.div>
  );
}

/* --- The sealed button mix (spec §0). Three treatments, nothing else. --- */

type CTAProps = {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
  /** §11: the pressed CTA disables itself and says so while CAS is open. */
  pending?: boolean;
};

/** The one pending treatment: a label swap, disabled, dimmed. No spinner ring. */
function Pending() {
  return (
    <motion.span
      animate={{ opacity: [0.55, 1, 0.55] }}
      transition={{ duration: 1.4, repeat: Infinity }}
    >
      Signing in...
    </motion.span>
  );
}

/** (a) BRAND primary. Hero CTA and the closing-statement CTA only. */
function BrandCTA({
  children,
  onClick,
  href,
  className = "",
  pending = false,
}: CTAProps) {
  const cls = `inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/25 ${pending ? "opacity-70" : ""} ${className}`;
  const body = pending ? (
    <Pending />
  ) : (
    <>
      {children}
      <span aria-hidden>→</span>
    </>
  );
  if (href)
    return (
      <motion.a whileHover={{ y: -1 }} href={href} className={cls}>
        {body}
      </motion.a>
    );
  return (
    <motion.button
      whileHover={pending ? undefined : { y: -1 }}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={cls}
    >
      {body}
    </motion.button>
  );
}

/** (b) MONO primary. Nav CTA and any in-section primary. */
function MonoCTA({
  children,
  onClick,
  href,
  className = "",
  pending = false,
}: CTAProps) {
  const cls = `inline-flex items-center gap-1.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-1.5 text-sm font-medium ${pending ? "opacity-70" : ""} ${className}`;
  if (href)
    return (
      <motion.a whileHover={{ y: -1 }} href={href} className={cls}>
        {children}
      </motion.a>
    );
  return (
    <motion.button
      whileHover={pending ? undefined : { y: -1 }}
      onClick={onClick}
      disabled={pending}
      aria-busy={pending}
      className={cls}
    >
      {pending ? <Pending /> : children}
    </motion.button>
  );
}

/** (c) Ghost secondary. */
function GhostCTA({ children, onClick, href, className = "" }: CTAProps) {
  const cls = `inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium bg-white text-gray-900 ring-1 ring-black/10 dark:bg-white/[0.06] dark:text-white dark:ring-white/15 ${className}`;
  if (href)
    return (
      <motion.a whileHover={{ y: -1 }} href={href} className={cls}>
        {children}
      </motion.a>
    );
  return (
    <motion.button whileHover={{ y: -1 }} onClick={onClick} className={cls}>
      {children}
    </motion.button>
  );
}

/** Mono kicker above a section statement (spec §6). */
function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-xs uppercase tracking-[0.2em] text-pink-500/80">
      {children}
    </p>
  );
}

/** The one window-chrome recipe (spec §0). Content sits edge to edge below it. */
function MockWindow({
  filename,
  children,
  className = "",
}: {
  filename: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.35)] dark:border-white/[0.09] dark:bg-[#101013] ${className}`}
    >
      <div className="relative flex items-center gap-1.5 border-b border-black/[0.05] px-4 py-2.5 dark:border-white/[0.06]">
        <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
        <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
        <span className="pointer-events-none absolute inset-x-0 text-center font-mono text-[10px] text-gray-400 dark:text-gray-500">
          {filename}
        </span>
      </div>
      {children}
    </div>
  );
}

/**
 * The shared open-canvas feature template (spec §6). Alternating split: the
 * mock column sits right by default, left when `mockSide` says so. No panel,
 * no glow, no section shell; whitespace does the separating.
 */
function FeatureSection({
  id,
  kicker,
  line1,
  line2,
  body,
  checks,
  actions,
  mock,
  mockSide = "right",
}: {
  id?: string;
  kicker: string;
  line1: string;
  line2: React.ReactNode;
  body: React.ReactNode;
  checks: React.ReactNode[];
  actions?: React.ReactNode;
  mock: React.ReactNode;
  mockSide?: "left" | "right";
}) {
  return (
    <section id={id} className="px-4 py-24 lg:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[5fr,7fr]">
        <motion.div
          {...reveal}
          className={mockSide === "left" ? "lg:order-2" : undefined}
        >
          <Kicker>{kicker}</Kicker>
          <h2 className="mt-4 text-balance text-4xl font-medium leading-[1.02] tracking-[-0.015em] text-gray-900 dark:text-white md:text-5xl">
            {line1}
            <br />
            <span className="text-gray-400 dark:text-gray-500">{line2}</span>
          </h2>
          <p className="mt-6 max-w-[46ch] font-sf text-base leading-relaxed text-gray-500 dark:text-gray-400 md:text-lg">
            {body}
          </p>
          <ul className="mt-8 space-y-3">{checks}</ul>
          {actions ? (
            <div className="mt-8 flex flex-wrap items-center gap-3 font-sf">
              {actions}
            </div>
          ) : null}
        </motion.div>

        <motion.div
          {...reveal}
          className={mockSide === "left" ? "lg:order-1" : undefined}
        >
          {mock}
        </motion.div>
      </div>
    </section>
  );
}

/** t3-style checklist row. Not a chip, not a box. */
function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 font-sf text-sm text-gray-600 dark:text-gray-300">
      <span aria-hidden className="mt-px shrink-0 text-pink-500">
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
