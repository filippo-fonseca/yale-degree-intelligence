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
import LoginPage from "@/components/LoginPage";
import dynamic from "next/dynamic";
import { GraduationCap, BookOpen, Award, Clock } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

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
    { label: "A", count: 12.5 },
    { label: "B+", count: 4 },
    { label: "B", count: 1 },
    { label: "B-", count: 1 },
  ],
};

const CHART_COLORS = [
  "#8B5CF6", // purple
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
];

function MajorProgressBar({ percent }: { percent: number }) {
  return (
    <div className="w-full bg-gray-100 dark:bg-gray-900/80 rounded-full h-3 overflow-hidden border border-black/[0.05] dark:border-white/[0.05] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        viewport={mockViewport}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-3 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]"
      />
    </div>
  );
}

export default function AboutPage() {
  const [logInFlow, setLogInFlow] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const { resolvedTheme, toggleTheme } = useTheme();

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

  // Mock requirement cards mirroring the real MajorProgressView layout:
  // status-colored card + n/N badge + course pills (emerald=complete,
  // blue=in progress, red=not taken). Marketing preview only, no fetching.
  type DemoPill = {
    code: string;
    cr: number;
    status: "complete" | "in-progress" | "not-taken";
  };
  type DemoReq = {
    name: string;
    have: number;
    required: number;
    status: "in-progress" | "not-started";
    desc: string;
    pills: DemoPill[];
  };
  const demoReqs: DemoReq[] = [
    {
      name: "Introductory Sequence",
      have: 2,
      required: 2,
      status: "in-progress",
      desc: "Two foundational courses.",
      pills: [
        { code: "CPSC 201", cr: 1, status: "complete" },
        { code: "CPSC 202", cr: 1, status: "complete" },
      ],
    },
    {
      name: "Core Systems",
      have: 1,
      required: 3,
      status: "in-progress",
      desc: "Three systems-level courses.",
      pills: [
        { code: "CPSC 223", cr: 1, status: "complete" },
        { code: "CPSC 323", cr: 1, status: "in-progress" },
        { code: "CPSC 365", cr: 1, status: "not-taken" },
      ],
    },
    {
      name: "Mathematics",
      have: 0,
      required: 2,
      status: "not-started",
      desc: "Two math electives.",
      pills: [
        { code: "MATH 222", cr: 1, status: "not-taken" },
        { code: "MATH 241", cr: 1, status: "not-taken" },
      ],
    },
  ];

  // Mock heat-map grid: each cell is a requirement's fulfilment state.
  const demoHeat: Array<"complete" | "in-progress" | "not-taken"> = [
    "complete",
    "complete",
    "complete",
    "in-progress",
    "complete",
    "in-progress",
    "in-progress",
    "not-taken",
    "complete",
    "not-taken",
    "not-taken",
    "not-taken",
  ];

  if (logInFlow) return <LoginPage onBackClick={() => setLogInFlow(false)} />;

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0b] font-louize overflow-x-hidden">
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
            <MonoCTA onClick={() => setLogInFlow(true)}>
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
          </div>
        </div>

        <div className="relative max-w-5xl mx-auto px-4 lg:px-6 text-center">
          {/* 1. The one hero pill */}
          <div className="flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/10 bg-white dark:bg-white/[0.04] px-3.5 py-1 text-xs font-medium font-sf">
              <Link
                href="/changelog"
                className="text-gray-900 dark:text-white transition-opacity hover:opacity-70"
              >
                ✦ v3 is out now
              </Link>
              <span aria-hidden className="text-gray-300 dark:text-gray-600">
                ·
              </span>
              <a
                href="https://yaledailynews.com/blog/2025/09/23/new-student-run-platform-aims-to-simplify-degree-planning/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-500 dark:text-gray-400 transition-colors hover:text-gray-900 dark:hover:text-white"
              >
                featured in the Yale Daily News ↗
              </a>
            </span>
          </div>

          {/* 2. Headline */}
          <h1 className="mt-8 font-medium text-balance text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.95] tracking-[-0.02em] text-gray-900 dark:text-white">
            Your Yale degree,
            <br />
            <span className="text-gray-400 dark:text-gray-500">made easy.</span>
          </h1>

          {/* 3. Subhead */}
          <p className="mt-6 mx-auto max-w-[60ch] font-sf text-base md:text-lg text-gray-500 dark:text-gray-400 leading-relaxed">
            Plan semesters, track requirements, simulate outcomes, and see
            exactly how your degree is going. Built by Yalies, for Yalies.
          </p>

          {/* 4. CTA row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 font-sf">
            <BrandCTA onClick={() => setLogInFlow(true)}>
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
            ~2,000 students · every residential college · zero ads, zero fees
          </p>
        </motion.div>
      </section>

      {/* Blueprint band — open canvas, no panel */}
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
            <MonoCTA onClick={() => setLogInFlow(true)}>
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
          <MonoCTA onClick={() => setLogInFlow(true)}>
            See my full stats
          </MonoCTA>
        }
        mock={
          <MockWindow filename="stats.tsx">
            <div className="p-4">
              <div ref={cardsRef} className="mb-4">
                <div className="grid grid-cols-2 gap-3">
                  {/* Cumulative GPA */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={cardsShown ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5 }}
                    className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 shadow-neu"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cumulative GPA
                      </p>
                      <div className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-medium text-emerald-400 mt-1.5 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                      <CountUp
                        to={statsMock.gpa}
                        inView={cardsShown}
                        decimals={2}
                      />
                    </p>
                  </motion.div>

                  {/* Total Credits */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={cardsShown ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.05 }}
                    className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 shadow-neu"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Total Credits
                      </p>
                      <div className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                        <BookOpen className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-medium text-blue-400 mt-1.5 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                      <CountUp
                        to={statsMock.totalCredits}
                        inView={cardsShown}
                      />
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      {statsMock.progressToGradPct}% to graduation
                    </p>
                  </motion.div>

                  {/* Courses Completed */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={cardsShown ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 shadow-neu"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Courses Completed
                      </p>
                      <div className="text-purple-600 dark:text-purple-300 drop-shadow-[0_0_8px_rgba(216,180,254,0.5)]">
                        <Award className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-medium text-purple-600 dark:text-purple-300 mt-1.5 drop-shadow-[0_0_12px_rgba(216,180,254,0.3)]">
                      <CountUp
                        to={statsMock.coursesCompleted}
                        inView={cardsShown}
                      />
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      & 5 courses in progress right now
                    </p>
                  </motion.div>

                  {/* Average Credits / Semester */}
                  <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={cardsShown ? { opacity: 1, y: 0 } : {}}
                    transition={{ duration: 0.5, delay: 0.15 }}
                    className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 shadow-neu"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Average Credits/Semester
                      </p>
                      <div className="text-blue-600 dark:text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]">
                        <Clock className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-medium text-blue-600 dark:text-blue-300 mt-1.5 drop-shadow-[0_0_12px_rgba(147,197,253,0.3)]">
                      <CountUp
                        to={statsMock.avgCreditsPerSem}
                        inView={cardsShown}
                        decimals={1}
                      />
                    </p>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                      across 6 semesters
                    </p>
                  </motion.div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Cumulative GPA */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={mockViewport}
                  transition={{ duration: 0.6 }}
                  className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 shadow-neu"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-base text-gray-900 dark:text-white">
                        Cumulative GPA
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Watch your GPA evolve semester by semester.
                      </p>
                    </div>
                    <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800/50 text-purple-600 dark:text-purple-300">
                      {/* icon-ish sparkline */}
                      <svg
                        width="18"
                        height="18"
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
                  <div className="h-[280px] w-full">
                    <div ref={lineRef} className="relative">
                      {/* Wipe reveal overlay */}
                      <motion.div
                        initial={{ x: 0 }}
                        animate={lineShown ? { x: "100%" } : {}}
                        transition={{
                          duration: 0.9,
                          ease: "easeOut",
                          delay: 0.15,
                        }}
                        className="pointer-events-none absolute inset-0 bg-white/50 dark:bg-gray-900/50"
                        style={{ mixBlendMode: "multiply" }}
                      />
                      {lineShown && (
                        <LineChart
                          key="cum-line-mounted"
                          height={280}
                          xAxis={[
                            {
                              scaleType: "point",
                              data: statsDemo.semesters,
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
                              min: Math.max(
                                0,
                                Math.floor(
                                  Math.min(...statsDemo.cumulativeGpa) * 2,
                                ) / 2,
                              ),
                              max: 4,
                            },
                          ]}
                          series={[
                            {
                              data: statsDemo.cumulativeGpa,
                              showMark: true,
                              color: "#ed64a6",
                              area: true,
                              curve: "natural",
                            },
                          ]}
                          grid={{ vertical: true, horizontal: true }}
                          margin={{ left: 60, right: 20, top: 20, bottom: 80 }}
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
                          sx={{
                            "& .MuiChartsAxis-left .MuiChartsAxis-tickLabel": {
                              fill: "#9CA3AF",
                            },
                            "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel":
                              {
                                fill: "#9CA3AF",
                              },
                            "& .MuiChartsAxis-left .MuiChartsAxis-label": {
                              fill: "#9CA3AF",
                            },
                            "& .MuiChartsAxis-left .MuiChartsAxis-line, & .MuiChartsAxis-bottom .MuiChartsAxis-line":
                              {
                                stroke: "#374151",
                                opacity: 0.4,
                              },
                          }}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>

                {/* Grade Distribution (Pie) */}
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={mockViewport}
                  transition={{ duration: 0.6, delay: 0.05 }}
                  className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-sm border border-gray-200 dark:border-gray-800/50 shadow-neu"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-base text-gray-900 dark:text-white">
                        Grade distribution
                      </h4>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        Your percentage mix of A's, A-'s, B+'s, and beyond.
                      </p>
                    </div>
                    <div className="p-1.5 rounded-full bg-gray-100 dark:bg-gray-800/50 text-blue-600 dark:text-blue-300">
                      <svg
                        width="18"
                        height="18"
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

                  <div ref={pieRef} className="h-[260px] w-full">
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={pieShown ? { scale: 1, opacity: 1 } : {}}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className="w-full h-full"
                    >
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
                                backgroundColor: CHART_COLORS.slice(
                                  0,
                                  statsDemo.gradeDistribution.length,
                                ),
                                borderColor: Array(
                                  statsDemo.gradeDistribution.length,
                                ).fill("#1F2937"),
                                borderWidth: 1,
                              },
                            ],
                          }}
                          showLegend={true}
                        />
                      )}
                    </motion.div>
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
          <MonoCTA onClick={() => setLogInFlow(true)}>
            See my major progress
          </MonoCTA>
        }
        mock={
          <MockWindow filename="major-progress.tsx">
            <div className="p-4">
              <div className="space-y-4">
                {/* Strict (completed only) */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 dark:text-gray-400">
                      Completed only
                    </span>
                    <span className="text-blue-600 dark:text-blue-300 font-medium">
                      {demoStrictPct}%
                    </span>
                  </div>
                  <MajorProgressBar percent={demoStrictPct} />
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                    {demoTotals.completed}/{demoTotals.total} credits
                  </div>
                </div>

                {/* Including in-progress */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-gray-500 dark:text-gray-400">
                      Including in-progress
                    </span>
                    <span className="text-purple-600 dark:text-purple-300 font-medium">
                      {demoWithIPPct}%
                    </span>
                  </div>
                  <MajorProgressBar percent={demoWithIPPct} />
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                    {demoTotals.completed + demoTotals.inProgress}/
                    {demoTotals.total} credits
                  </div>
                </div>
              </div>

              {/* Requirement cards — mirrors the real MajorProgressView grid */}
              <div className="mt-6">
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                    Requirements
                  </h4>
                  <div className="flex items-center gap-2.5 text-[10px] text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />{" "}
                      Complete
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-blue-400" /> In
                      progress
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-red-400" /> Not
                      taken
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {demoReqs.map((req, i) => {
                    const inProgress = req.status === "in-progress";
                    return (
                      <motion.div
                        key={req.name}
                        initial={{ opacity: 0, y: 12 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={mockViewport}
                        transition={{ duration: 0.45, delay: i * 0.08 }}
                        className={`p-3 rounded-xl backdrop-blur-md border transition-all relative shadow-neu-sm ${
                          inProgress
                            ? "bg-blue-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-blue-950/40 dark:via-gray-900/50 dark:to-gray-950/50 border-blue-200 dark:border-blue-800/30"
                            : "bg-red-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-red-950/30 dark:via-gray-900/50 dark:to-gray-950/50 border-red-200 dark:border-red-800/25"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1.5">
                          <h5
                            className={`font-medium text-sm ${
                              inProgress
                                ? "text-blue-600 dark:text-blue-300"
                                : "text-red-600 dark:text-red-300"
                            }`}
                          >
                            {req.name}
                          </h5>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                              inProgress
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-300 dark:border-blue-700/30"
                                : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 border border-red-300 dark:border-red-700/30"
                            }`}
                          >
                            {req.have}/{req.required}
                          </span>
                        </div>
                        <p
                          className={`text-[11px] mb-2 ${
                            inProgress
                              ? "text-blue-500 dark:text-blue-300/70"
                              : "text-red-500 dark:text-red-300/70"
                          }`}
                        >
                          {req.desc}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {req.pills.map((opt) => (
                            <div
                              key={opt.code}
                              className={`relative px-2 py-0.5 rounded-full text-xs flex items-center ${
                                opt.status === "complete"
                                  ? "bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700"
                                  : opt.status === "in-progress"
                                    ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700"
                                    : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700"
                              }`}
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
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Requirement heat map — color-coded fulfilment grid */}
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2.5">
                  Requirement heat map
                </h4>
                <div className="grid grid-cols-6 sm:grid-cols-12 gap-1.5">
                  {demoHeat.map((cell, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.6 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={mockViewport}
                      transition={{ duration: 0.3, delay: i * 0.03 }}
                      title={
                        cell === "complete"
                          ? "Complete"
                          : cell === "in-progress"
                            ? "In progress"
                            : "Not taken"
                      }
                      className={`aspect-square rounded-md border ${
                        cell === "complete"
                          ? "bg-emerald-500/20 border-emerald-500/40 dark:bg-emerald-500/15"
                          : cell === "in-progress"
                            ? "bg-blue-500/20 border-blue-500/40 dark:bg-blue-500/15"
                            : "bg-red-500/15 border-red-500/30 dark:bg-red-500/10"
                      }`}
                    />
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
          <MonoCTA onClick={() => setLogInFlow(true)}>Enable friends</MonoCTA>
        }
        mock={
          <MockWindow filename="friends.tsx">
            <div className="p-4">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-medium text-pink-600 dark:text-pink-200 flex items-center gap-2">
                  <FiUsers size={14} /> Your Friends (3)
                </h3>
                <span className="px-3 py-1.5 text-white bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg flex items-center gap-1.5 text-xs font-medium">
                  <FiUserPlus size={12} /> Add Friend
                </span>
              </div>

              {/* Mock Friend Cards */}
              <div className="space-y-4">
                {[
                  {
                    name: "Sarah Chen",
                    major: "CPSC & MATH",
                    year: "2026",
                    initials: "SC",
                    gradient: "from-pink-500 to-purple-600",
                  },
                  {
                    name: "Alex Rivera",
                    major: "ECON & S&DS",
                    year: "2027",
                    initials: "AR",
                    gradient: "from-blue-500 to-purple-600",
                  },
                  {
                    name: "Jordan Kim",
                    major: "MCDB",
                    year: "2025",
                    initials: "JK",
                    gradient: "from-pink-500 to-purple-600",
                  },
                ].map((friend, i) => (
                  <motion.div
                    key={friend.name}
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={mockViewport}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex items-center justify-between p-5 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-gray-800/50 hover:border-pink-500/30 dark:hover:border-pink-500/30 transition-all duration-300 shadow-neu group"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${friend.gradient} flex items-center justify-center text-white font-medium text-sm border-2 border-gray-300 dark:border-gray-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.3)]`}
                      >
                        {friend.initials}
                      </div>
                      <div>
                        <div className="font-medium text-pink-600 dark:text-pink-200 group-hover:text-pink-700 dark:group-hover:text-pink-100 transition-colors">
                          {friend.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                          {friend.major}
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-700 dark:text-purple-200">
                            '{friend.year.slice(-2)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <span className="flex items-center gap-1.5 px-4 py-2 bg-black/[0.04] dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 rounded-xl border border-black/[0.06] dark:border-white/[0.08] text-sm">
                        <FiUser className="inline-block" size={14} />
                        Profile
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* What gets shared, kept as the mock's own footer row */}
              <div className="mt-5 border-t border-black/[0.05] dark:border-white/[0.06] pt-4">
                <h4 className="text-sm font-medium text-pink-600 dark:text-pink-200 mb-3">
                  What gets shared:
                </h4>
                <ul className="text-sm text-gray-500 dark:text-gray-400 space-y-2">
                  <li className="flex items-center gap-2.5">
                    <FiCheck className="text-emerald-400 shrink-0" size={14} />{" "}
                    Course codes, semesters, and credits
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FiCheck className="text-emerald-400 shrink-0" size={14} />{" "}
                    Major and graduation year
                  </li>
                  <li className="flex items-center gap-2.5">
                    <FiX className="text-red-400 shrink-0" size={14} /> Grades
                    and GPA are never shared
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
            <BrandCTA onClick={() => setLogInFlow(true)}>
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
};

/** (a) BRAND primary. Hero CTA and the closing-statement CTA only. */
function BrandCTA({ children, onClick, href, className = "" }: CTAProps) {
  const cls = `inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-purple-600/25 ${className}`;
  const body = (
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
    <motion.button whileHover={{ y: -1 }} onClick={onClick} className={cls}>
      {body}
    </motion.button>
  );
}

/** (b) MONO primary. Nav CTA and any in-section primary. */
function MonoCTA({ children, onClick, href, className = "" }: CTAProps) {
  const cls = `inline-flex items-center gap-1.5 rounded-full bg-gray-900 text-white dark:bg-white dark:text-gray-900 px-4 py-1.5 text-sm font-medium ${className}`;
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
