"use client";

import { motion, useInView } from "framer-motion";
import {
  FiSearch,
  FiSave,
  FiShare2,
  FiUsers,
  FiUserPlus,
  FiCheck,
  FiX,
  FiUser,
} from "react-icons/fi";
import { GraduationCap, BookOpen, Award, Clock } from "lucide-react";
import dynamic from "next/dynamic";
import { useRef } from "react";
import { CountUp, MajorProgressBar } from "./LandingPrimitives";
import {
  statsMock,
  statsDemo,
  CHART_COLORS,
  demoTotals,
  demoStrictPct,
  demoWithIPPct,
  demoReqs,
  demoHeat,
  friendsMock,
} from "./landingMockData";

const LineChart = dynamic(
  () => import("@mui/x-charts/LineChart").then((m) => m.LineChart),
  { ssr: false },
);
const PieChartWrapper = dynamic(
  () => import("@/components/ui/PieChartWrapper"),
  { ssr: false },
);

type LandingProductPreviewsProps = {
  onLogin: () => void;
  onOpenVideo: () => void;
};

export default function LandingProductPreviews({
  onLogin,
  onOpenVideo,
}: LandingProductPreviewsProps) {
  const lineRef = useRef<HTMLDivElement | null>(null);
  const lineInView = useInView(lineRef, { once: true, amount: 0.35 });
  const pieRef = useRef<HTMLDivElement | null>(null);
  const pieInView = useInView(pieRef, { once: true, amount: 0.35 });
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const cardsInView = useInView(cardsRef, { once: true, amount: 0.35 });

  return (
    <>
      {/* NEW: Simulator Section */}
      <section
        id="simulator"
        className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-cyan-500/20 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Left: copy + bullets */}
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Simulator: drag, drop, done.
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 max-w-xl">
                Build a semester-by-semester plan by dragging courses from your
                major (or search <em>every</em> course at Yale). Save multiple
                plans, load them later, and see how fun classes and
                distributional requirements fit without breaking anything.
              </p>

              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  {
                    icon: <FiSearch size={14} />,
                    text: "Search the full catalog + your major",
                  },
                  {
                    icon: <FiSave size={14} />,
                    text: "Save and duplicate plans instantly",
                  },
                  {
                    icon: <FiShare2 size={14} />,
                    text: "Share with friends / mentors",
                  },
                  {
                    icon: <FiUsers size={14} />,
                    text: "See where friends slotted courses",
                  },
                ].map((b) => (
                  <div
                    key={b.text}
                    className="flex items-center gap-2 text-gray-700 dark:text-gray-200 bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] rounded-lg px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
                  >
                    <span className="shrink-0 text-cyan-400 drop-shadow-[0_0_6px_rgba(6,182,212,0.5)]">
                      {b.icon}
                    </span>
                    <span className="text-xs">{b.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-cyan-500/30 to-cyan-600/30 hover:from-cyan-500/40 hover:to-cyan-600/40 text-white border border-white/[0.1] shadow-[0_4px_16px_rgba(6,182,212,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200"
                  onClick={onLogin}
                >
                  Try Simulator
                </button>
                <button
                  className="px-4 py-2 text-sm rounded-xl bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] hover:from-black/[0.08] dark:hover:from-white/[0.1] text-gray-900 dark:text-white border border-black/[0.06] dark:border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200"
                  onClick={onOpenVideo}
                >
                  Watch Demo
                </button>
              </div>
            </div>

            {/* Right: GIF/video placeholder */}
            <div className="flex-1 w-full px-4">
              <div className="relative rounded-xl border-2 border-pink-500 bg-black/40 overflow-hidden shadow-2xl">
                {/* GIF ~2MB; compress with gifsicle -O3 if load time becomes an issue */}
                <img
                  src="/demo/simulator.gif"
                  alt="Simulator demo"
                  loading="lazy"
                  className="w-[80%] h-[80%] object-cover aspect-video"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Stats Preview (public) */}
      <section
        id="stats"
        className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-purple-500/20 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="mb-4">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              Contextual stats that actually help.
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
              See your progress and trajectory in context so you know where to
              improve, not just your grades in isolation. This is just a preview
              of all that we have; log in to see it!
            </p>
          </div>
          <div ref={cardsRef} className="mb-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Cumulative GPA */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5 }}
                className="p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cumulative GPA</p>
                  <div className="text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)]">
                    <GraduationCap className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-medium text-emerald-400 mt-1.5 drop-shadow-[0_0_12px_rgba(52,211,153,0.3)]">
                  <CountUp
                    to={statsMock.gpa}
                    inView={cardsInView}
                    decimals={2}
                  />
                </p>
              </motion.div>

              {/* Total Credits */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.05 }}
                className="p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Credits</p>
                  <div className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-medium text-blue-400 mt-1.5 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                  <CountUp to={statsMock.totalCredits} inView={cardsInView} />
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  {statsMock.progressToGradPct}% to graduation
                </p>
              </motion.div>

              {/* Courses Completed */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 }}
                className="p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Courses Completed</p>
                  <div className="text-purple-600 dark:text-purple-300 drop-shadow-[0_0_8px_rgba(216,180,254,0.5)]">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-medium text-purple-600 dark:text-purple-300 mt-1.5 drop-shadow-[0_0_12px_rgba(216,180,254,0.3)]">
                  <CountUp
                    to={statsMock.coursesCompleted}
                    inView={cardsInView}
                  />
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  & 5 courses in progress right now
                </p>
              </motion.div>

              {/* Average Credits / Semester */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={cardsInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                    inView={cardsInView}
                    decimals={1}
                  />
                </p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  across 6 semesters
                </p>
              </motion.div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Cumulative GPA */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6 }}
              className="p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                    animate={lineInView ? { x: "100%" } : {}}
                    transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
                    className="pointer-events-none absolute inset-0 bg-white/50 dark:bg-gray-900/50"
                    style={{ mixBlendMode: "multiply" }}
                  />
                  {lineInView && (
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
                        "& .MuiChartsAxis-bottom .MuiChartsAxis-tickLabel": {
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
              viewport={{ once: true, amount: 0.35 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
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
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
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
                  animate={pieInView ? { scale: 1, opacity: 1 } : {}}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  {pieInView && (
                    <PieChartWrapper
                      key="pie-mounted"
                      data={{
                        labels: statsDemo.gradeDistribution.map((g) => g.label),
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

          <div className="mt-4">
            <button
              className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-500/30 to-purple-600/30 hover:from-purple-500/40 hover:to-purple-600/40 text-white border border-white/[0.1] shadow-[0_4px_16px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200"
              onClick={onLogin}
            >
              See my full stats
            </button>
          </div>
        </div>
      </section>

      {/* NEW: Major Progress — compact bar only */}
      <section
        id="major-progress"
        className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(59,130,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-blue-500/20">
          <div className="mb-3">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">
              Your <i>Major</i> progress, visualized.
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
              Track your journey at a glance, complete with a clean progress bar
              and a full grid of requirements, each showing the courses you've
              taken and smart recommendations for what to take next from us or
              your DUS. We have it all.
            </p>
          </div>

          <div className="space-y-4">
            {/* Strict (completed only) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-500 dark:text-gray-400">Completed only</span>
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
                <span className="text-gray-500 dark:text-gray-400">Including in-progress</span>
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
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Complete
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-400" /> In progress
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> Not taken
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
                    viewport={{ once: true, amount: 0.4 }}
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
                  viewport={{ once: true, amount: 0.4 }}
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

          <div className="mt-6">
            <button
              className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-pink-500/30 to-blue-500/30 hover:from-pink-500/40 hover:to-blue-500/40 text-white border border-white/[0.1] shadow-[0_4px_16px_rgba(236,72,153,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200"
              onClick={onLogin}
            >
              Let's do this
            </button>
          </div>
        </div>
      </section>

      {/* NEW: Public Profiles & Friends */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(236,72,153,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-pink-500/20">
          <div className="text-center mb-8 flex flex-col gap-2">
            <h2 className="text-2xl font-medium text-gray-900 dark:text-white">
              Friends & Connections
            </h2>
            <p className="text-gray-700 dark:text-gray-300 text-sm max-w-2xl mx-auto">
              Add friends and mutually see each other's academic journeys. Learn
              from upperclassmen who've walked your path.
            </p>
          </div>

          {/* Mock Friends UI */}
          <div className="max-w-xl mx-auto">
            {/* Add Friend Button */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-medium text-pink-600 dark:text-pink-200 flex items-center gap-2">
                <FiUsers
                  size={14}
                  className="drop-shadow-[0_0_6px_rgba(236,72,153,0.5)]"
                />{" "}
                Your Friends (3)
              </h3>
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500/30 to-pink-600/30 hover:from-pink-500/40 hover:to-pink-600/40 text-white rounded-lg transition flex items-center gap-1.5 text-xs font-medium border border-white/[0.1] shadow-[0_4px_16px_rgba(236,72,153,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                onClick={onLogin}
              >
                <FiUserPlus size={12} /> Add Friend
              </button>
            </div>

            {/* Mock Friend Cards */}
            <div className="space-y-4">
              {friendsMock.map((friend, i) => (
                <motion.div
                  key={friend.name}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                  className="flex items-center justify-between p-5 rounded-2xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 border border-white/[0.08] hover:border-pink-500/30 transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] group"
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
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-200">
                          '{friend.year.slice(-2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={onLogin}
                      className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] text-gray-600 dark:text-gray-300 rounded-xl border border-black/[0.06] dark:border-white/[0.08] hover:bg-pink-500/20 hover:text-gray-900 dark:hover:text-white hover:border-pink-500/30 transition-all text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                    >
                      <FiUser className="inline-block" size={14} />
                      Profile
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Info Box */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 p-5 rounded-2xl bg-gradient-to-br from-pink-500/10 via-transparent to-purple-500/10 border border-pink-500/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
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
                  <FiX className="text-red-400 shrink-0" size={14} /> Grades and
                  GPA are <strong className="text-red-300">NEVER</strong> shared
                </li>
              </ul>
            </motion.div>

            <div className="mt-8 text-center">
              <button
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-pink-500/30 via-purple-500/30 to-blue-500/30 hover:from-pink-500/40 hover:via-purple-500/40 hover:to-blue-500/40 text-white border border-white/[0.1] shadow-[0_4px_16px_rgba(236,72,153,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200 font-medium"
                onClick={onLogin}
              >
                Enable Friends Feature
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
