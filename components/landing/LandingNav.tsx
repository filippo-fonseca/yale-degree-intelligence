"use client";

import LogoIcon from "@/icons/LogoIcon";
import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";

interface LandingNavProps {
  onLogin: () => void;
}

export default function LandingNav({ onLogin }: LandingNavProps) {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <nav className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between rounded-2xl border border-black/[0.06] bg-white/70 px-3 py-2.5 shadow-[0_8px_32px_rgba(15,23,42,0.06)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-gray-950/70 dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)] sm:px-4">
          <div className="flex items-center gap-2">
            <LogoIcon width={22} height={22} />
            <span className="font-louize text-sm font-medium tracking-tight text-gray-900 dark:text-gray-100">
              DegreeIntelligence
            </span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="rounded-xl border border-black/[0.06] p-2 text-gray-600 transition-colors hover:bg-black/[0.04] dark:border-white/[0.08] dark:text-gray-300 dark:hover:bg-white/[0.06]"
            >
              {resolvedTheme === "dark" ? (
                <FiSun size={14} />
              ) : (
                <FiMoon size={14} />
              )}
            </button>
            <button
              onClick={onLogin}
              className="rounded-full bg-gray-900 px-3.5 py-2 font-sf text-xs font-medium text-white transition-colors hover:bg-gray-800 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-100 sm:px-4 sm:text-sm"
            >
              Log in with CAS
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
