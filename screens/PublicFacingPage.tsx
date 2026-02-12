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
  FiArrowRight,
  FiGithub,
  FiMail,
  FiExternalLink,
  FiChevronRight,
  FiUsers,
  FiSearch,
  FiSave,
  FiShare2,
  FiPlayCircle,
  FiUserPlus,
  FiCheck,
  FiX,
  FiUser,
  FiAlertCircle,
  FiZap,
  FiTrendingUp,
  FiBarChart2,
  FiHeart,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import LogoIcon from "@/icons/LogoIcon";
import CompoundLogo from "@/components/ui/CompoundLogo";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import dynamic from "next/dynamic";
import { GraduationCap, BookOpen, Award, Clock } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground/page";

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
  const sp = useSpring(mv, { stiffness: 120, damping: 20, duration });
  const rounded = useTransform(sp, (v) => v.toFixed(decimals));
  // start when visible
  if (inView) mv.set(to);
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
    <div className="w-full bg-gray-900/80 rounded-full h-3 overflow-hidden border border-white/[0.05] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }}
        viewport={{ once: true, amount: 0.4 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="h-3 rounded-full bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500 shadow-[0_0_12px_rgba(139,92,246,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]"
      />
    </div>
  );
}

export default function AboutPage() {
  const [logInFlow, setLogInFlow] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

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

  const lineRef = useRef<HTMLDivElement | null>(null);
  const lineInView = useInView(lineRef, { once: true, amount: 0.35 });
  const pieRef = useRef<HTMLDivElement | null>(null);
  const pieInView = useInView(pieRef, { once: true, amount: 0.35 });
  const cardsRef = useRef<HTMLDivElement | null>(null);
  const cardsInView = useInView(cardsRef, { once: true, amount: 0.35 });

  const features = [
    {
      title: "No more spreadsheet nightmares.",
      description:
        "We automated the tedious parts of academic planning so you don't have to maintain those fragile Google Sheets formulas.",
      icon: <FiBarChart2 className="w-5 h-5" />,
    },
    {
      title: "Major (and even concentration) reqs at a glance.",
      description:
        "See exactly what you've completed and what remains for your major—no more digging through PDF requirements or five different poorly organized websites 4 clicks deep.",
      icon: <FiSearch className="w-5 h-5" />,
    },
    {
      title: "Built by Yalies, for Yalies.",
      description:
        "Born from our own frustrations with double major planning. We're solving the problems we actually faced. Rather than gatekeeping, we decided to make it clean and publish it.",
      icon: <GraduationCap className="w-5 h-5" />,
    },
  ];

  // --- mock for public preview ---
  const demoTotals = { completed: 5, inProgress: 3, total: 12 };

  const demoStrictPct = Math.round(
    (demoTotals.completed / demoTotals.total) * 100,
  );
  const demoWithIPPct = Math.round(
    ((demoTotals.completed + demoTotals.inProgress) / demoTotals.total) * 100,
  );

  if (logInFlow) return <LoginPage onBackClick={() => setLogInFlow(false)} />;

  return (
    <div className="min-h-screen pt-2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 font-louize">
      <CosmicBackground mode="stars" opacity={0.9} />
      {/* Welcome Banner */}
      <div className="relative mb-8 z-50 bg-gradient-to-r from-emerald-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-2">
          <span className="px-3 py-1.5 text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(52,211,153,0.2)] flex items-center gap-1.5">
            <HiSparkles className="w-3 h-3" /> News Feature
          </span>
          <p className="text-sm text-emerald-100">
            The Yale Daily News ran a feature on us.{" "}
            <a
              href="https://yaledailynews.com/blog/2025/09/23/new-student-run-platform-aims-to-simplify-degree-planning/"
              target="_blank"
              className="text-blue-300 font-medium hover:text-white hover:underline transition-colors"
            >
              Read it!
            </a>{" "}
          </p>
        </div>
      </div>

      {/* Sticky Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-40 bg-gray-950/70 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon width={24} height={24} />
            <span className="text-sm font-medium text-gray-200 hidden sm:inline">
              DegreeIntelligence
            </span>
          </div>
          <motion.button
            className="flex items-center gap-2 px-4 py-2 text-sm bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 hover:from-pink-500/30 hover:via-purple-500/30 hover:to-blue-500/30 backdrop-blur-xl rounded-xl text-white font-medium transition-all shadow-[0_4px_20px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] border border-white/[0.1]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setLogInFlow(true)}
          >
            <span>Log in with CAS</span>
            <FiArrowRight size={14} className="opacity-70" />
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative pt-6 sm:pt-8l">
        {/* increased top padding to fix logo spacing */}
        <div className="max-w-6xl mx-auto px-4 pb-3 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 1, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-gray-900/60 via-gray-900/40 to-gray-950/60 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]"
          >
            {/* Version Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 flex justify-center"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-white/[0.15] shadow-[0_4px_20px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Introducing DegreeIntelligence v2
                </span>
              </span>
            </motion.div>

            <div className="flex justify-center mb-5">
              {/* more space under logo */}
              <div className="relative w-20 h-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400/30 border-r-purple-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <LogoIcon width={40} height={40} />
                </div>
              </div>
            </div>

            <h1 className="flex items-center justify-center text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-300 mb-3">
              <CompoundLogo hideLogo animated size="lg" />
            </h1>
            {/* Welcome Badge */}
            <div className="mb-3 flex justify-center">
              <div className="relative p-[1px] rounded-xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-gradient-to-br from-gray-900/90 via-gray-900/80 to-gray-950/90 text-pink-200 shadow-[0_8px_32px_rgba(236,72,153,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)] backdrop-blur-xl">
                  <FiHeart className="w-3 h-3 text-blue-400" /> We're so glad you're here. We think you'll
                  love this.
                </span>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">
              Your Yale Degree,{" "}
              <span className="text-blue-300">made easy.</span>
            </h2>

            <p className="text-base text-gray-300 max-w-2xl mx-auto mb-5">
              Let's democratize academic planning, stats, & insights at Yale,
              together.{" "}
              <Link
                href="#team"
                className="inline-flex items-center gap-1.5 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 hover:from-blue-200 hover:to-purple-200 font-medium transition-all group"
              >
                For Yalies, by Yalies
                <span className="text-purple-400 text-sm opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  ↓
                </span>
              </Link>
            </p>

            <motion.div className="flex flex-wrap justify-center gap-3">
              <motion.button
                className="px-5 py-2.5 text-sm bg-gradient-to-br from-white/[0.06] to-transparent hover:from-white/[0.1] backdrop-blur-xl rounded-xl text-gray-300 hover:text-white font-medium flex items-center gap-2 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border border-white/[0.08] hover:border-white/[0.15]"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowVideoModal(true)}
              >
                See v2 launch vid
                <FiPlayCircle className="opacity-70" size={14} />
              </motion.button>
              <motion.button
                className="group relative px-5 py-2.5 text-sm rounded-xl text-white font-medium flex items-center gap-2 transition-all overflow-hidden"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLogInFlow(true)}
              >
                {/* Animated gradient border */}
                <span
                  className="absolute inset-0 rounded-xl bg-[conic-gradient(from_var(--angle),#06b6d4,#8b5cf6,#ec4899,#f97316,#06b6d4)] p-[2px] animate-border-spin"
                  style={{ "--angle": "0deg" } as React.CSSProperties}
                >
                  <span className="flex h-full w-full rounded-[10px] bg-gray-900/95 backdrop-blur-xl" />
                </span>
                {/* Glow effect */}
                <span
                  className="absolute inset-0 rounded-xl opacity-50 blur-md bg-[conic-gradient(from_var(--angle),#06b6d4,#8b5cf6,#ec4899,#f97316,#06b6d4)] animate-border-spin"
                  style={{ "--angle": "0deg" } as React.CSSProperties}
                />
                {/* Button content */}
                <span className="relative z-10 flex items-center gap-2">
                  Log in with CAS
                  <FiArrowRight
                    className="opacity-80 group-hover:translate-x-0.5 transition-transform"
                    size={14}
                  />
                </span>
              </motion.button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 pt-6 border-t border-white/[0.08]"
            >
              <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent leading-relaxed">
                1 in 8 Yale undergrads already use DegreeIntelligence.
              </p>
              <p className="text-base text-gray-400 mt-2">
                Why don't you? Even if you do...{" "}
                <span className="text-purple-300 font-medium">
                  We just launched v2. Free. Always.
                </span>
              </p>

              {/* V2 Launch Video */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8"
              >
                {/* Caption */}
                <div className="mb-4 text-center">
                  <p className="text-sm text-gray-400 leading-relaxed">
                    <span className="font-semibold bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                      OUR V2 LAUNCH — FEB 2026.
                    </span>
                    <br />
                    <span className="text-gray-500">
                      it's prettier. it's faster. it's better. you should
                      probably check it out idk
                    </span>
                  </p>
                </div>

                {/* Video Container */}
                <div className="relative mx-auto max-w-2xl">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-60" />

                  {/* Video wrapper */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-white/[0.1] shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_60px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] bg-gray-950/80 backdrop-blur-xl">
                    {/* Decorative top bar */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-gray-900/80 to-gray-950/80 border-b border-white/[0.06]">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      <span className="ml-3 text-[10px] text-gray-500 font-medium tracking-wide">
                        v2-launch-vid.mp4
                      </span>
                    </div>

                    {/* Video embed */}
                    <div className="aspect-video">
                      <iframe
                        width="560"
                        height="315"
                        src="https://www.youtube.com/embed/WOqPZC2exwA?si=WvVAvNOZ3Qjv-NjR"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* subtle splash gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-10 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl" />
        </div>
      </div>

      {/* Blueprint Section */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_80px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-3">
              Our blueprint, broken down.
            </h2>
            <p className="text-sm text-gray-300 max-w-2xl mx-auto">
              How we believe we transformed frustration into an elegant solution
              for academic planning and visualization at Yale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Problem */}
            <Card fade>
              <CardHeader
                icon={<FiAlertCircle className="w-4 h-4" />}
                title="The Problem"
                color="red"
              />
              <ul className="space-y-2 text-gray-300 text-sm">
                {[
                  "Scattered requirements across PDFs and websites",
                  "Manual tracking in error-prone spreadsheets",
                  "No centralized view of progress",
                  "Planning nightmares (esp. double majors)",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <FiChevronRight className="text-red-400 mt-1" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Solution */}
            <Card fade delay={0.1}>
              <CardHeader
                icon={<FiZap className="w-4 h-4" />}
                title="Our Solution"
                color="blue"
              />
              <ul className="space-y-2 text-gray-300 text-sm">
                {[
                  "Unified requirements database",
                  "Real-time progress stats + visualization",
                  "Intelligent course recommendations",
                  "Clean, intuitive interface",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <FiChevronRight className="text-blue-400 mt-1" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Impact */}
            <Card fade>
              <CardHeader
                icon={<FiTrendingUp className="w-4 h-4" />}
                title="The Impact"
                color="green"
              />
              <ul className="space-y-2 text-gray-300 text-sm">
                {[
                  "Hours saved on academic planning",
                  "Reduced errors in requirement tracking",
                  "Empowered students can make space for fun classes",
                  "Democratized access to academic insights",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <FiChevronRight className="text-green-400 mt-1" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>
      </div>

      {/* NEW: Simulator Section */}
      <section
        id="simulator"
        className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8"
      >
        <div className="bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(6,182,212,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-cyan-500/20 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />

          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Left: copy + bullets */}
            <div className="flex-1 min-w-0">
              <h3 className="text-2xl font-bold text-white mb-2">
                Simulator — drag, drop, done.
              </h3>
              <p className="text-gray-300 text-sm mb-4 max-w-xl">
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
                    className="flex items-center gap-2 text-gray-200 bg-gradient-to-br from-white/[0.06] to-transparent border border-white/[0.08] rounded-lg px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm"
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
                  onClick={() => setLogInFlow(true)}
                >
                  Try Simulator
                </button>
                <Link href="/demo#simulator">
                  <button className="px-4 py-2 text-sm rounded-xl bg-gradient-to-br from-white/[0.06] to-transparent hover:from-white/[0.1] text-white border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200">
                    Watch Demo
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: GIF/video placeholder */}
            <div className="flex-1 w-full px-4">
              <div className="relative rounded-xl border-2 border-pink-500 bg-black/40 overflow-hidden shadow-2xl">
                <img
                  src="/demo/simulator.gif"
                  alt="Simulator demo"
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
        <div className="bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-purple-500/20 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-purple-500/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="mb-4">
            <h3 className="text-2xl font-bold text-white">
              Contextual stats that actually help.
            </h3>
            <p className="text-gray-300 text-sm mt-1">
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
                  <p className="text-xs text-gray-400">Cumulative GPA</p>
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
                  <p className="text-xs text-gray-400">Total Credits</p>
                  <div className="text-blue-400 drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                    <BookOpen className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-medium text-blue-400 mt-1.5 drop-shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                  <CountUp to={statsMock.totalCredits} inView={cardsInView} />
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
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
                  <p className="text-xs text-gray-400">Courses Completed</p>
                  <div className="text-purple-300 drop-shadow-[0_0_8px_rgba(216,180,254,0.5)]">
                    <Award className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-medium text-purple-300 mt-1.5 drop-shadow-[0_0_12px_rgba(216,180,254,0.3)]">
                  <CountUp
                    to={statsMock.coursesCompleted}
                    inView={cardsInView}
                  />
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
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
                  <p className="text-xs text-gray-400">
                    Average Credits/Semester
                  </p>
                  <div className="text-blue-300 drop-shadow-[0_0_8px_rgba(147,197,253,0.5)]">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-medium text-blue-300 mt-1.5 drop-shadow-[0_0_12px_rgba(147,197,253,0.3)]">
                  <CountUp
                    to={statsMock.avgCreditsPerSem}
                    inView={cardsInView}
                    decimals={1}
                  />
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
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
                  <h4 className="font-medium text-base text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                    Cumulative GPA
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Watch your GPA evolve semester by semester.
                  </p>
                </div>
                <div className="p-1.5 rounded-full bg-gray-800/50 text-purple-300">
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
                    className="pointer-events-none absolute inset-0 bg-gray-900/50"
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
                  <h4 className="font-medium text-base text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-purple-200">
                    Grade distribution
                  </h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Your percentage mix of A's, A-'s, B+'s, and beyond.
                  </p>
                </div>
                <div className="p-1.5 rounded-full bg-gray-800/50 text-blue-300">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M11 2a10 10 0 1 0 10 10h-10V2Z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                </div>
              </div>

              <div
                ref={pieRef}
                className="h-[260px] w-full"
              >
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

          <div className="mt-4">
            <button
              className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-purple-500/30 to-purple-600/30 hover:from-purple-500/40 hover:to-purple-600/40 text-white border border-white/[0.1] shadow-[0_4px_16px_rgba(139,92,246,0.3),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200"
              onClick={() => setLogInFlow(true)}
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
        <div className="bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(59,130,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-blue-500/20">
          <div className="mb-3">
            <h3 className="text-xl font-bold text-white">
              Your <i>Major</i> progress, visualized.
            </h3>
            <p className="text-gray-300 text-sm mt-1">
              Track your journey at a glance, complete with a clean progress bar
              and a full grid of requirements, each showing the courses you’ve
              taken and smart recommendations for what to take next from us or
              your DUS. We have it all.
            </p>
          </div>

          <div className="space-y-4">
            {/* Strict (completed only) */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400">Completed only</span>
                <span className="text-blue-300 font-medium">
                  {demoStrictPct}%
                </span>
              </div>
              <MajorProgressBar percent={demoStrictPct} />
              <div className="text-[10px] text-gray-400 mt-1.5">
                {demoTotals.completed}/{demoTotals.total} credits
              </div>
            </div>

            {/* Including in-progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-gray-400">Including in-progress</span>
                <span className="text-purple-300 font-medium">
                  {demoWithIPPct}%
                </span>
              </div>
              <MajorProgressBar percent={demoWithIPPct} />
              <div className="text-[10px] text-gray-400 mt-1.5">
                {demoTotals.completed + demoTotals.inProgress}/
                {demoTotals.total} credits
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button
              className="px-4 py-2 text-sm rounded-xl bg-gradient-to-r from-pink-500/30 to-blue-500/30 hover:from-pink-500/40 hover:to-blue-500/40 text-white border border-white/[0.1] shadow-[0_4px_16px_rgba(236,72,153,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all duration-200"
              onClick={() => setLogInFlow(true)}
            >
              Let's do this
            </button>
          </div>
        </div>
      </section>

      {/* NEW: Public Profiles & Friends */}
      <section className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(236,72,153,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-pink-500/20">
          <div className="text-center mb-8 flex flex-col gap-2">
            <h2 className="text-2xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200">
              Friends & Connections
            </h2>
            <p className="text-gray-300 text-sm max-w-2xl mx-auto">
              Add friends and mutually see each other's academic journeys. Learn
              from upperclassmen who've walked your path.
            </p>
          </div>

          {/* Mock Friends UI */}
          <div className="max-w-xl mx-auto">
            {/* Add Friend Button */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-medium text-pink-200 flex items-center gap-2">
                <FiUsers
                  size={14}
                  className="drop-shadow-[0_0_6px_rgba(236,72,153,0.5)]"
                />{" "}
                Your Friends (3)
              </h3>
              <button
                className="px-3 py-1.5 bg-gradient-to-r from-pink-500/30 to-pink-600/30 hover:from-pink-500/40 hover:to-pink-600/40 text-white rounded-lg transition flex items-center gap-1.5 text-xs font-medium border border-white/[0.1] shadow-[0_4px_16px_rgba(236,72,153,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
                onClick={() => setLogInFlow(true)}
              >
                <FiUserPlus size={12} /> Add Friend
              </button>
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
                  gradient: "from-blue-500 to-cyan-600",
                },
                {
                  name: "Jordan Kim",
                  major: "MCDB",
                  year: "2025",
                  initials: "JK",
                  gradient: "from-emerald-500 to-teal-600",
                },
              ].map((friend, i) => (
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
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${friend.gradient} flex items-center justify-center text-white font-medium text-sm border-2 border-gray-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.3)]`}
                    >
                      {friend.initials}
                    </div>
                    <div>
                      <div className="font-medium text-pink-200 group-hover:text-pink-100 transition-colors">
                        {friend.name}
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-2">
                        {friend.major}
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-200">
                          '{friend.year.slice(-2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-white/[0.06] to-transparent text-gray-300 rounded-xl border border-white/[0.08] hover:bg-pink-500/20 hover:text-white hover:border-pink-500/30 transition-all text-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
              <h4 className="text-sm font-medium text-pink-200 mb-3">
                What gets shared:
              </h4>
              <ul className="text-sm text-gray-400 space-y-2">
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
                onClick={() => setLogInFlow(true)}
              >
                Enable Friends Feature
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-3">
              What it is and why we built this.
            </h2>
            <p className="text-sm text-gray-300 max-w-2xl mx-auto">
              Trying to plan our majors, we kept running into the same problem:
              Yale's requirements are complex, scattered across PDFs and
              websites, and nearly impossible to track manually. So we built the
              tool we wish we had. We sincerely hope it helps :)
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:scale-[1.02] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]"
              >
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 border border-white/[0.08] text-blue-300 mb-3 w-fit shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                  {feature.icon}
                </div>
                <h3 className="text-base font-medium text-blue-200 mb-1.5">
                  {feature.title}
                </h3>
                <p className="text-gray-300 text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Team Section */}
      <div
        id="team"
        className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-20"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-3">
            It's nice to meet you!
          </h2>
          <p className="text-sm text-gray-300 max-w-2xl mx-auto">
            We're just two Yale students who got tired of spreadsheet hell and
            decided to do something about it.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-4">
          {[
            {
              name: "Filippo Fonseca",
              role: "Founder | Mechanical Engineering (ABET) & EECS '28",
              bio: "Built the first version as a shell script after one too many long sessions trying to plan courses. Talks too much.",
              contact: "filippo.fonseca@yale.edu",
              photoRoute: "/team/filippo.jpeg",
              github: "https://github.com/filippo-fonseca",
              website: "https://filippofonseca.com",
            },
            {
              name: "Emir Ahmed",
              role: "Development | Electrical Engineering & CS (EECS) '28",
              bio: "Joined forces to continue scaling the platform and make it more robust.",
              contact: "emir.ahmed@yale.edu",
              photoRoute: "/team/emir.JPG",
              github: "https://github.com/EmirataG",
              website: "",
            },
          ].map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 backdrop-blur-xl p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.15] flex-1 max-w-sm hover:scale-[1.02] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_4px_16px_rgba(139,92,246,0.3)]">
                  <img
                    src={person.photoRoute}
                    alt={person.name}
                    className="w-full h-full rounded-full object-cover border-2 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                  />
                </div>
                <div>
                  <h3 className="text-base font-medium text-white">
                    {person.name}
                  </h3>
                  <p className="text-xs text-blue-300">{person.role}</p>
                </div>
              </div>
              <p className="text-gray-300 text-sm mb-3">{person.bio}</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`mailto:${person.contact}`}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent border border-white/[0.08] text-blue-400 hover:text-blue-300 hover:border-blue-500/30 text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <FiMail size={12} /> Email
                </a>
                <a
                  href={person.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent border border-white/[0.08] text-blue-400 hover:text-blue-300 hover:border-blue-500/30 text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <FiGithub size={12} /> GitHub
                </a>
                {person.website && (
                  <a
                    href={person.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent border border-white/[0.08] text-blue-400 hover:text-blue-300 hover:border-blue-500/30 text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                  >
                    <FiExternalLink size={12} /> Website
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Wait... Are You Trying to Replace CourseTable? */}
      {/* <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-800/50 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Wait, wait wait... are you trying to replace{" "}
              <span className="text-blue-300">CourseTable</span>?
            </h2>
          </div>
          <div className="text-gray-300 max-w-4xl mx-auto space-y-4 text-lg leading-relaxed">
            <p>
              <strong>No. Not at all.</strong> We <em>love</em> CourseTable 💙.
              Heck, our founder,{" "}
              <span className="text-white-300 font-medium">Filippo</span>, is
              literally on the{" "}
              <Link
                href="https://coursetable.com/about"
                target="_blank"
                className="text-blue-300"
              >
                CourseTable team
              </Link>
              .
            </p>
            <p>
              This fulfills{" "}
              <span className="text-white-300">
                a completely different need
              </span>{" "}
              — one that CourseTable doesn’t aim to cover by design, as we are
              different products entirely. We’re here for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>
                Visualizing your grades and stats in beautiful, digestible ways
              </li>
              <li>Planning out your progress toward your degree</li>
              <li>Getting real-time analysis from our suggestion models</li>
              <li>Seeing what upperclassmen have done in previous years</li>
              <li>
                Exploring different majors and mapping out “what if” scenarios
              </li>
            </ul>
            <p>
              That’s <strong>not</strong> what CourseTable does — and that’s the
              point. They help you <em>choose</em> courses, see course reviews,
              and see friend's worksheets. We don't (and never will) do that. We
              instead help you <em>make sense of the journey</em> and
              democratize the complex planning process at Yale with regard to,
              in particular, your major.
            </p>
          </div>
        </div>
      </section> */}

      {/* CTA Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0.75 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-pink-900/30 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.1] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-purple-500/20 text-center"
        >
          <h2 className="text-xl font-bold text-white mb-3">
            Want to contribute?
          </h2>
          <p className="text-gray-300 text-sm max-w-xl mx-auto mb-4">
            This is a project by and for the Yale community. We'd love your
            feedback and bug reports! Reach out anytime. Also... if you wish you
            join the team, we're always looking for fellow Yale students to
            join.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-sm bg-gradient-to-br from-white/[0.08] to-transparent hover:from-white/[0.12] rounded-xl text-white flex items-center gap-2 transition-all hover:scale-105 border border-white/[0.08] hover:border-white/[0.15] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            >
              <FiGithub size={14} /> GitHub
            </a>
            <a
              href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
              className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 hover:from-blue-500/40 hover:via-purple-500/40 hover:to-pink-500/40 rounded-xl text-white flex items-center gap-2 transition-all hover:scale-105 border border-white/[0.1] shadow-[0_4px_16px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              <FiMail size={14} /> Email Us
            </a>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-6 text-center text-gray-400 text-xs border-t border-white/[0.05]">
        <p className="flex items-center justify-center gap-2">
          Made with <FiHeart className="w-3 h-3 text-blue-400" /> | Not officially
          affiliated with Yale University. We make no money from this and this
          is NOT a business or job for any of us.
        </p>
        <p className="mt-1.5 text-gray-500">
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300">
            v2.0
          </span>{" "}
          - © {new Date().getFullYear()} Yale DegreeIntelligence
        </p>
      </div>

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
              <div className="rounded-2xl bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95 backdrop-blur-2xl border border-white/[0.1] shadow-[0_8px_64px_rgba(0,0,0,0.6),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.08]">
                  <div className="flex items-center gap-2">
                    <FiPlayCircle className="text-purple-400" size={16} />
                    <span className="text-sm font-medium text-white">
                      v2 Launch Video
                    </span>
                  </div>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-400 hover:text-white transition-all"
                  >
                    <FiX size={16} />
                  </button>
                </div>

                {/* Video embed */}
                <div className="aspect-video bg-black/50">
                  <iframe
                    src="https://www.youtube.com/embed/WOqPZC2exwA"
                    title="DegreeIntelligence v2 Launch"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                  />
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-white/[0.08] flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] text-gray-400 text-[10px]">
                      ESC
                    </kbd>{" "}
                    or click outside to close
                  </p>
                  <button
                    onClick={() => setShowVideoModal(false)}
                    className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-br from-white/[0.06] to-transparent hover:from-white/[0.1] border border-white/[0.08] text-gray-300 hover:text-white transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shared components */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @property --angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes border-spin {
          from {
            --angle: 0deg;
          }
          to {
            --angle: 360deg;
          }
        }

        .animate-border-spin {
          animation: border-spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
}

function Card({
  children,
  fade,
  delay = 0,
}: {
  children: React.ReactNode;
  fade?: boolean;
  delay?: number;
}) {
  const cardClass =
    "bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]";

  if (!fade) return <div className={cardClass}>{children}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className={cardClass}
    >
      {children}
    </motion.div>
  );
}

function CardHeader({
  icon,
  title,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  color?: "red" | "blue" | "green";
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-400 bg-gradient-to-br from-red-500/25 to-red-600/15 border-red-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(239,68,68,0.2)]",
    blue: "text-blue-400 bg-gradient-to-br from-blue-500/25 to-blue-600/15 border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(59,130,246,0.2)]",
    green:
      "text-green-400 bg-gradient-to-br from-green-500/25 to-green-600/15 border-green-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(34,197,94,0.2)]",
  };
  return (
    <div className="flex items-center gap-2 mb-3">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center border ${colorMap[color]}`}
      >
        {icon}
      </div>
      <h3 className="text-base font-medium text-white">{title}</h3>
    </div>
  );
}
