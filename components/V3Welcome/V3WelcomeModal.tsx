"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { FiX } from "react-icons/fi";
import {
  Command,
  MonitorCog,
  GraduationCap,
  BarChart2,
  Layers,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import LogoIcon from "@/icons/LogoIcon";

interface V3WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
  gradient: string;
};

const FEATURES: Feature[] = [
  {
    icon: <Command className="h-4 w-4" />,
    title: "Command palette",
    description: "Hit Cmd+K to jump anywhere and run actions in a snap.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: <MonitorCog className="h-4 w-4" />,
    title: "Smarter Simulator",
    description: "Model future semesters with a faster, sharper planner.",
    gradient: "from-purple-500 to-fuchsia-500",
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    title: "Better My Major(s)",
    description: "Track requirements with clearer progress at a glance.",
    gradient: "from-indigo-500 to-blue-500",
  },
  {
    icon: <BarChart2 className="h-4 w-4" />,
    title: "More, better Stats",
    description: "Richer insights into your courses, credits, and pace.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: <Layers className="h-4 w-4" />,
    title: "Conflict manager",
    description: "Spot and resolve overlaps across your double major.",
    gradient: "from-fuchsia-500 to-pink-500",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "Refined UI/UX",
    description: "A more polished, fluid feel throughout the whole app.",
    gradient: "from-violet-500 to-purple-500",
  },
];

export default function V3WelcomeModal({
  open,
  onClose,
  onStartTour,
}: V3WelcomeModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative w-full max-w-2xl rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white/95 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.2)] dark:shadow-[0_24px_90px_rgba(0,0,0,0.55),0_0_140px_rgba(168,85,247,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-2xl ring-1 ring-black/[0.04] dark:ring-white/[0.05] overflow-hidden"
        >
          {/* Decorative gradient glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 -left-20 h-56 w-56 rounded-full bg-gradient-to-br from-pink-500/30 to-purple-500/20 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -top-20 -right-16 h-52 w-52 rounded-full bg-gradient-to-br from-blue-500/25 to-indigo-500/20 blur-3xl"
          />

          {/* Close */}
          <button
            onClick={onClose}
            aria-label="Close welcome"
            className="absolute top-3.5 right-3.5 z-10 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
          >
            <FiX size={18} />
          </button>

          <div className="relative p-6 sm:p-8 max-h-[88vh] overflow-y-auto">
            {/* Header */}
            <div className="text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
                className="mx-auto mb-4 inline-flex items-center justify-center h-14 w-14 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-white/[0.06] shadow-[0_8px_28px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_28px_rgba(0,0,0,0.4)]"
              >
                <LogoIcon className="h-8 w-8" />
              </motion.div>

              <div className="flex items-center justify-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                  Welcome to DegreeIntelligence
                </h2>
                <span className="inline-flex items-center rounded-full bg-gradient-to-r from-pink-500 to-purple-600 px-2.5 py-0.5 text-xs font-semibold text-white shadow-[0_2px_10px_rgba(168,85,247,0.4)]">
                  v3
                </span>
              </div>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                A big leap forward. Faster, clearer, and more powerful. Here is
                what is new:
              </p>
            </div>

            {/* Feature grid */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FEATURES.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 + i * 0.05, duration: 0.3 }}
                  className="group relative flex items-start gap-3 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 p-3 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm transition-all duration-200 hover:border-purple-500/40 hover:shadow-md"
                >
                  <div
                    className={`shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white shadow-[0_4px_14px_rgba(0,0,0,0.18)]`}
                  >
                    {feature.icon}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h3>
                    <p className="mt-0.5 text-xs leading-snug text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="mt-7 flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-center gap-2.5">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-black/[0.06] dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-sm font-medium text-gray-600 dark:text-gray-300 transition-all duration-200"
              >
                Explore on my own
              </button>
              <button
                onClick={onStartTour}
                className="group inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-sm font-semibold text-white shadow-[0_6px_22px_rgba(168,85,247,0.4)] transition-all duration-200"
              >
                Take the tour
                <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
