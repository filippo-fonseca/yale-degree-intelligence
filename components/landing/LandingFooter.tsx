"use client";

import Link from "next/link";
import { FiMail } from "react-icons/fi";

interface LandingFooterProps {
  onLogin?: () => void;
}

export default function LandingFooter({ onLogin }: LandingFooterProps) {
  return (
    <footer className="relative overflow-hidden border-t border-black/[0.06] dark:border-white/[0.06]">
      <div
        className="landing-glow pointer-events-none absolute left-1/2 top-0 h-48 w-[28rem] -translate-x-1/2 -translate-y-1/3 rounded-full blur-3xl opacity-70"
        aria-hidden
      />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="font-louize text-2xl font-medium tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            Plan your degree with clarity.
          </h2>
          <p className="mx-auto mt-3 max-w-md font-sf text-sm text-gray-600 dark:text-gray-300">
            Free for Yalies. Always. Feedback and builders welcome.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onLogin && (
              <button
                onClick={onLogin}
                className="rounded-full bg-pink-500 px-5 py-2.5 font-sf text-sm font-medium text-white shadow-[0_10px_28px_rgba(236,72,153,0.25)] transition hover:bg-pink-600"
              >
                Log in with CAS
              </button>
            )}
            <a
              href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 px-5 py-2.5 font-sf text-sm font-medium text-gray-700 backdrop-blur-md transition hover:bg-white dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200"
            >
              <FiMail size={14} /> Email us
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 text-center">
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-sf text-xs text-gray-500 dark:text-gray-400">
            <Link
              href="/mission"
              className="transition hover:text-gray-900 dark:hover:text-white"
            >
              Mission
            </Link>
            <Link
              href="/changelog"
              className="transition hover:text-gray-900 dark:hover:text-white"
            >
              Changelog
            </Link>
            <Link
              href="/terms"
              className="transition hover:text-gray-900 dark:hover:text-white"
            >
              Terms
            </Link>
            <Link
              href="/contact"
              className="transition hover:text-gray-900 dark:hover:text-white"
            >
              Contact
            </Link>
          </nav>
          <p className="font-sf text-xs text-gray-400 dark:text-gray-500">
            Not affiliated with Yale University.
          </p>
          <div className="flex items-center gap-2 font-sf text-xs text-gray-400 dark:text-gray-500">
            <span className="rounded-full border border-black/[0.06] bg-white/80 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300">
              v3.0
            </span>
            <span>© {new Date().getFullYear()} DegreeIntelligence</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
