"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompoundLogo from "./ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowRight, FiArrowLeft, FiCheck } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import { GraduationCap, BarChart2, Layers } from "lucide-react";
import CosmicBackground from "@/components/CosmicBackground/page";

const FEATURES = [
  {
    icon: <HiSparkles className="h-4 w-4" />,
    title: "AI academic planning",
    description:
      "Intelligent, personalized course suggestions straight from your transcript.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: <BarChart2 className="h-4 w-4" />,
    title: "Live requirement tracking",
    description:
      "Real-time progress across every major, minor, and distributional.",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: <Layers className="h-4 w-4" />,
    title: "Goodbye spreadsheets",
    description: "No more broken formulas. This is DegreeIntelligence.",
    gradient: "from-pink-500 to-rose-600",
  },
];

const ROTATING_LINES = [
  "Navigate your Yale journey with clarity.",
  "Every requirement, every major, one fast place.",
  "Plan your entire degree in minutes, not nights.",
];

export default function LoginPage({
  onBackClick,
}: {
  onBackClick: () => void;
}) {
  const { signInWithGoogle, loading } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const [activeLine, setActiveLine] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActiveLine((prev) => (prev + 1) % ROTATING_LINES.length);
    }, 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-white px-4 py-10 font-louize text-gray-900 antialiased dark:bg-[#08080a] dark:text-white">
      <CosmicBackground mode="stars" opacity={0.6} />

      {/* Ambient shard + bloom backdrop, matching the landing page */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="rc-bloom absolute left-1/2 top-[-18%] h-[70vh] w-[130%] -translate-x-1/2 opacity-70" />
        <div className="rc-shards-beams absolute left-1/2 top-[-22%] h-[90vh] w-[140%] -translate-x-1/2 opacity-60" />
        <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent_35%,#ffffff_88%)] dark:bg-[radial-gradient(120%_80%_at_50%_-10%,transparent_35%,#08080a_88%)]" />
      </div>

      {/* Back link, floating top-left */}
      <motion.button
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        onClick={onBackClick}
        className="group absolute left-5 top-5 z-20 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-black/[0.03] px-3 py-1.5 text-xs text-gray-600 backdrop-blur-md transition-colors hover:border-pink-400/40 hover:text-gray-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/65 dark:hover:text-white"
      >
        <FiArrowLeft
          size={13}
          className="transition-transform group-hover:-translate-x-0.5"
        />
        Back to homepage
      </motion.button>

      {/* Main split card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.21, 0.6, 0.2, 1] }}
        className="rc-window relative z-10 grid w-full max-w-5xl overflow-hidden rounded-3xl border border-gray-200 bg-white/80 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/85 dark:via-gray-900/65 dark:to-gray-950/85 lg:grid-cols-[1.05fr_1fr]"
      >
        {/* ---------- Left: brand & value panel ---------- */}
        <div className="relative hidden flex-col justify-between gap-8 overflow-hidden border-r border-gray-200 bg-gradient-to-br from-pink-500/[0.06] via-purple-500/[0.03] to-transparent p-9 dark:border-white/[0.07] dark:from-pink-500/[0.1] dark:via-purple-500/[0.04] lg:flex">
          <div
            aria-hidden
            className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full bg-pink-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 bottom-0 h-56 w-56 rounded-full bg-indigo-500/15 blur-3xl"
          />

          <div className="relative">
            <a
              href="https://yaledailynews.com/blog/2025/09/23/new-student-run-platform-aims-to-simplify-degree-planning/"
              target="_blank"
              rel="noreferrer"
              className="group mb-8 inline-flex items-center gap-2.5 rounded-full border border-gray-200 bg-black/[0.03] py-1.5 pl-3 pr-3 text-xs text-gray-600 backdrop-blur-md transition-colors hover:border-pink-400/40 hover:text-gray-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/70 dark:hover:text-white"
            >
              <span className="text-[10px] uppercase tracking-[0.18em] text-gray-400 dark:text-white/45">
                As featured in
              </span>
              <span className="h-3 w-px bg-gray-300 dark:bg-white/15" />
              <span className="font-medium tracking-tight text-gray-900 dark:text-white">
                The Yale Daily News
              </span>
            </a>

            <h2 className="text-balance text-3xl font-semibold leading-[1.05] tracking-tight sm:text-4xl">
              The shortcut to your{" "}
              <span className="rc-gradient-text">Yale degree.</span>
            </h2>

            <div className="mt-3 h-6">
              <AnimatePresence mode="wait">
                <motion.p
                  key={activeLine}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35 }}
                  className="text-sm text-gray-500 dark:text-white/55"
                >
                  {ROTATING_LINES[activeLine]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="relative space-y-2.5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
                className="group flex items-start gap-3 rounded-2xl border border-gray-200 bg-white/40 p-3 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-pink-400/40 dark:border-white/[0.07] dark:bg-white/[0.03] dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)]"
              >
                <span
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${f.gradient} text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]`}
                >
                  {f.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {f.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-white/50">
                    {f.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="relative flex items-center gap-3">
            <span className="flex -space-x-2.5">
              {[
                "from-pink-400 to-rose-500",
                "from-violet-400 to-purple-500",
                "from-sky-400 to-blue-500",
                "from-fuchsia-400 to-pink-500",
              ].map((g, i) => (
                <span
                  key={i}
                  className={`h-6 w-6 rounded-full bg-gradient-to-br ${g} ring-2 ring-white dark:ring-[#0c0c0f]`}
                />
              ))}
            </span>
            <p className="text-xs text-gray-500 dark:text-white/55">
              <span className="font-semibold text-gray-900 dark:text-white">
                1 in 6 Yale undergrads
              </span>{" "}
              already plan here.
            </p>
          </div>
        </div>

        {/* ---------- Right: sign-in panel ---------- */}
        <div className="relative flex flex-col justify-center p-8 sm:p-10">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.12, type: "spring", stiffness: 260 }}
            className="mb-6 flex justify-center"
          >
            <div className="relative flex h-16 w-16 items-center justify-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-transparent border-r-purple-400/40 border-t-pink-400/40"
              />
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 shadow-[0_8px_28px_rgba(0,0,0,0.12)] dark:border-white/[0.08] dark:bg-white/[0.06] dark:shadow-[0_8px_28px_rgba(0,0,0,0.4)]">
                <LogoIcon width={32} height={32} />
              </span>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mb-7 text-center"
          >
            <h1 className="mb-2 flex items-center justify-center">
              <CompoundLogo hideLogo animated size="lg" />
            </h1>
            <p className="mx-auto max-w-xs text-sm leading-relaxed text-gray-500 dark:text-white/55">
              Sign in with your Yale CAS account to pick up exactly where you
              left off.
            </p>
          </motion.div>

          {/* CAS Login button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.26 }}
            onClick={signInWithGoogle}
            disabled={loading}
            onHoverStart={() => setIsHovering(true)}
            onHoverEnd={() => setIsHovering(false)}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            className="group flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3.5 text-sm font-semibold text-white shadow-[0_10px_34px_-10px_rgba(0,0,0,0.45)] transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-white dark:text-black dark:shadow-[0_10px_34px_-10px_rgba(255,255,255,0.45)] dark:hover:bg-pink-50"
          >
            {loading ? (
              <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              >
                Authenticating...
              </motion.span>
            ) : (
              <>
                <GraduationCap size={16} />
                <span>Log in with Yale CAS</span>
                <motion.span
                  animate={isHovering ? { x: [0, 3, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <FiArrowRight size={15} />
                </motion.span>
              </>
            )}
          </motion.button>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.34 }}
            className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] text-gray-400 dark:text-white/40"
          >
            <span className="inline-flex items-center gap-1">
              <FiCheck className="text-emerald-500 dark:text-emerald-400" />
              Free, always
            </span>
            <span className="h-3 w-px bg-gray-200 dark:bg-white/10" />
            <span className="inline-flex items-center gap-1">
              <FiCheck className="text-emerald-500 dark:text-emerald-400" />
              Transcript never stored
            </span>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42 }}
            className="mt-7 flex justify-center"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-black/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-wide text-gray-500 backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/50">
              <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
              For Yalies, by Yalies
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mx-auto mt-6 max-w-xs text-center text-[10px] leading-relaxed text-gray-400 dark:text-white/30"
          >
            v2.0 · Not affiliated with Yale University. Any data you upload is
            from your own volition. We will NOT store your transcript.{" "}
            <a
              href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
              className="text-gray-500 underline-offset-2 transition-colors hover:text-gray-900 hover:underline dark:text-white/45 dark:hover:text-white"
            >
              Feedback?
            </a>
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
}
