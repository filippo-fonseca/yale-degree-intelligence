"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { FiArrowLeft, FiArrowRight, FiCheck } from "react-icons/fi";
import { GraduationCap, Command, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { RELEASES, type Release } from "./releases";

/* ----------------------------------------------------------- */
/* Reveal primitive (matches the landing page)                 */
/* ----------------------------------------------------------- */

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.6, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ----------------------------------------------------------- */
/* Release card                                                */
/* ----------------------------------------------------------- */

function ReleaseCard({ release }: { release: Release }) {
  return (
    <div className="rc-card-hover relative overflow-hidden rounded-2xl border border-gray-200 bg-black/[0.02] p-6 dark:border-white/[0.08] dark:bg-white/[0.02] sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-pink-500/15 opacity-50 blur-3xl" />

      <div className="relative mb-5 flex flex-wrap items-center gap-3">
        <span className="rc-gradient-text text-3xl font-semibold tracking-tight">
          {release.version}
        </span>
        {release.name && (
          <span className="text-lg font-medium text-gray-700 dark:text-white/75">
            {release.name}
          </span>
        )}
        {release.current && (
          <span className="rounded-full border border-pink-400/30 bg-pink-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-600 dark:text-pink-200">
            Latest
          </span>
        )}
        <span className="ml-auto text-sm text-gray-400 dark:text-white/40">
          {release.date}
        </span>
      </div>

      {release.summary && (
        <p className="relative mb-7 max-w-2xl text-pretty text-base leading-relaxed text-gray-500 dark:text-white/55">
          {release.summary}
        </p>
      )}

      <div className="relative grid gap-7 sm:grid-cols-2">
        {release.sections.map((section) => (
          <div key={section.title}>
            <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-pink-600/80 dark:text-pink-300/80">
              <span className="h-px w-5 bg-gradient-to-r from-pink-500/60 to-transparent" />
              {section.title}
            </h3>
            <ul className="space-y-2.5">
              {section.items.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600 dark:text-white/60"
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-pink-500/15 text-[9px] text-pink-600 dark:text-pink-300">
                    <FiCheck />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- */
/* Page                                                        */
/* ----------------------------------------------------------- */

export default function ChangelogPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-louize text-gray-900 antialiased dark:bg-[#08080a] dark:text-white">
      {/* ===== Top bar ===== */}
      <nav className="sticky top-0 z-50 border-b border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#08080a]/80">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="group flex items-center gap-2 text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-white/55 dark:hover:text-white"
          >
            <FiArrowLeft
              size={15}
              className="transition-transform group-hover:-translate-x-0.5"
            />
            Back to home
          </Link>
          <button
            onClick={toggleTheme}
            aria-label={
              theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
            }
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-black/[0.05] hover:text-gray-700 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white/80"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </nav>

      {/* ===== Header ===== */}
      <header className="relative isolate px-4 pb-14 pt-20 sm:px-6 sm:pt-28">
        <div className="rc-bloom pointer-events-none absolute inset-x-0 top-0 h-[50vh] opacity-50" />
        <div className="relative mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-black/[0.03] px-3 py-1 text-xs text-gray-600 backdrop-blur-md dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-white/90"
          >
            <Command size={12} className="text-pink-500 dark:text-pink-300" />
            Changelog
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.21, 0.6, 0.2, 1] }}
            className="text-balance text-4xl font-semibold leading-[1.02] tracking-tight sm:text-6xl"
          >
            Everything we&apos;ve <span className="rc-gradient-text">shipped.</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="mx-auto mt-5 max-w-xl text-pretty text-base leading-relaxed text-gray-600 dark:text-white/60 sm:text-lg"
          >
            A running history of DegreeIntelligence, from the first launch to the
            release you are using today. Free, always.
          </motion.p>
        </div>
      </header>

      {/* ===== Timeline ===== */}
      <main className="relative px-4 pb-28 sm:px-6">
        <div className="relative mx-auto max-w-4xl">
          {/* vertical spine */}
          <div className="pointer-events-none absolute bottom-2 left-[7px] top-2 hidden w-px bg-gradient-to-b from-pink-500/40 via-gray-200 to-transparent dark:via-white/10 sm:block" />

          <div className="space-y-10">
            {RELEASES.map((release, i) => (
              <Reveal key={release.version} delay={i * 0.05}>
                <div className="relative sm:pl-12">
                  {/* timeline node */}
                  <span className="absolute left-0 top-7 hidden h-3.5 w-3.5 -translate-x-px items-center justify-center rounded-full border-2 border-white bg-pink-500 shadow-[0_0_0_4px_rgba(236,72,153,0.15)] dark:border-[#08080a] sm:flex" />
                  <ReleaseCard release={release} />
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </main>

      {/* ===== Footer CTA ===== */}
      <footer className="relative overflow-hidden border-t border-gray-200 dark:border-white/[0.06]">
        <div className="relative mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
          <Reveal>
            <CompoundLogo size="sm" />
            <h2 className="mt-6 text-balance text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
              Ready to take the short way?
            </h2>
            <p className="mt-3 text-base text-gray-500 dark:text-white/55">
              Plan your entire Yale degree in one place.{" "}
              <span className="rc-gradient-text font-medium">Free, always.</span>
            </p>
            <Link
              href="/"
              className="group mt-7 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:scale-[1.03] dark:bg-white dark:text-black"
            >
              <GraduationCap size={16} /> Open DegreeIntelligence
              <FiArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Reveal>
        </div>
      </footer>
    </div>
  );
}
