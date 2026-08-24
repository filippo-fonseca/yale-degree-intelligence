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
} from "lucide-react";
import LogoIcon from "@/icons/LogoIcon";
import { useTheme } from "@/context/ThemeContext";
import { ShinyButton } from "@/components/ui/shiny-button";
import { GhostButton } from "@/components/ui/ghost-button";

/**
 * What's new, in the v3 system.
 *
 * Same vocabulary as the landing page and the setup flow: one near-black
 * window with a mono status line, Louize for the headline, SF for interface
 * copy, and the shiny pill as the only primary. The six features used to be
 * six different gradients, which made a list of six equal things read as six
 * unrelated ones.
 */

interface V3WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStartTour: () => void;
}

type Feature = {
  icon: ReactNode;
  title: string;
  description: string;
};

const FEATURES: Feature[] = [
  {
    icon: <Command className="h-4 w-4" />,
    title: "Command palette",
    description: "Hit Cmd+K to jump anywhere and run actions in a snap.",
  },
  {
    icon: <MonitorCog className="h-4 w-4" />,
    title: "Smarter Simulator",
    description: "Model future semesters with a faster, sharper planner.",
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    title: "Better My Major(s)",
    description: "Track requirements with clearer progress at a glance.",
  },
  {
    icon: <BarChart2 className="h-4 w-4" />,
    title: "More, better Stats",
    description: "Richer insights into your courses, credits, and pace.",
  },
  {
    icon: <Layers className="h-4 w-4" />,
    title: "Conflict manager",
    description: "Spot and resolve overlaps across your double major.",
  },
  {
    icon: <Sparkles className="h-4 w-4" />,
    title: "Refined UI/UX",
    description: "A more polished, fluid feel throughout the whole app.",
  },
];

export default function V3WelcomeModal({
  open,
  onClose,
  onStartTour,
}: V3WelcomeModalProps) {
  const { resolvedTheme } = useTheme();

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
        className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 font-louize backdrop-blur-md dark:bg-black/75 sm:p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] dark:border-white/[0.09] dark:bg-[#101013]"
        >
          {/* Window bar. The release number lives here, in mono, rather than in
              a pink pill beside the headline. */}
          <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            <span>what&apos;s new</span>
            <span className="pr-6">v3.0.0</span>
          </div>
          <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.08]" />

          <button
            onClick={onClose}
            aria-label="Close welcome"
            className="absolute right-3 top-2 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
          >
            <FiX size={16} />
          </button>

          <div className="max-h-[82vh] overflow-y-auto p-5 sm:p-7">
            <div className="flex flex-col items-center text-center">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.08] dark:bg-white/[0.04]">
                <LogoIcon
                  width={24}
                  height={24}
                  variant={resolvedTheme === "dark" ? undefined : "darkOnLight"}
                />
              </div>

              <h2 className="mt-4 text-balance text-[1.5rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[1.75rem]/[1.25]">
                Welcome to Yale DegreeIntelligence 26-27!
              </h2>

              <p className="mx-auto mt-3 max-w-[52ch] font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                this is a big leap forward for us. we&apos;re now faster,
                clearer, and more powerful in our opinion. here&apos;s what
                changed:
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {FEATURES.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 + index * 0.04, duration: 0.25 }}
                  className="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 dark:border-white/[0.07] dark:bg-white/[0.03]"
                >
                  <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
                    {feature.icon}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                      {feature.title}
                    </h3>
                    <p className="mt-0.5 font-sf text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="mt-7 flex flex-col-reverse items-center justify-center gap-2.5 font-sf sm:flex-row">
              <GhostButton onClick={onClose}>Explore on my own</GhostButton>
              <ShinyButton size="sm" withArrow onClick={onStartTour}>
                Take the tour
              </ShinyButton>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
