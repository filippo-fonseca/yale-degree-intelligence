"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { FiArrowLeft, FiMoon, FiSun } from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";
import { useTheme } from "@/context/ThemeContext";

/**
 * The frame the standalone pages (Terms, Mission) sit in.
 *
 * Same vocabulary as the landing page: the near-black canvas, a hairline
 * sticky nav, the dot grid, Louize for headings and SF for interface copy.
 * Both pages were dark-only gradients before, which meant a student on light
 * mode got a dark page with no warning, so the frame is themed properly and
 * carries the toggle.
 */

export function StaticPageNav() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 border-b border-black/[0.07] bg-[#fafafa]/80 backdrop-blur-xl dark:border-white/[0.08] dark:bg-[#0a0a0b]/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <LogoIcon
            width={20}
            height={20}
            variant={resolvedTheme === "dark" ? undefined : "darkOnLight"}
          />
          <span className="font-sf text-sm font-medium text-gray-900 dark:text-white">
            DegreeIntelligence
          </span>
        </Link>

        <div className="flex items-center gap-2 font-sf">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="rounded-full p-2 text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            {resolvedTheme === "dark" ? <FiSun size={14} /> : <FiMoon size={14} />}
          </button>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white"
          >
            <FiArrowLeft size={12} />
            Back to the app
          </Link>
        </div>
      </div>
    </nav>
  );
}

/** Page canvas plus the landing's dot grid, faded out down the page. */
export function StaticPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#fafafa] font-louize text-gray-900 dark:bg-[#0a0a0b] dark:text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[36rem] bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.055)_1px,transparent_1px)]"
      />
      <div className="relative">{children}</div>
    </div>
  );
}

/** Mono section label, as used on the landing page's bands. */
export function Kicker({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
      {children}
    </p>
  );
}

export function StaticPageFooter() {
  return (
    <footer className="mt-20 border-t border-black/[0.07] py-8 dark:border-white/[0.08]">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-3 px-4 text-center font-mono text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 sm:flex-row sm:justify-between sm:px-6 sm:text-left">
        <span>DegreeIntelligence</span>
        <span className="max-w-[52ch]">
          Not affiliated with Yale University, Yale College, or DegreeAudit. A
          free, student-built project. We will never charge a dime.
        </span>
      </div>
    </footer>
  );
}
