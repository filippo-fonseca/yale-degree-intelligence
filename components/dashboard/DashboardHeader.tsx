"use client";

import type { User } from "firebase/auth";
import { motion } from "framer-motion";
import { FiChevronDown, FiMenu, FiMoon, FiSun } from "react-icons/fi";
import { Search } from "lucide-react";
import CompoundLogo from "@/components/ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";
import { UserAvatar } from "@/components/ui/UserAvatar";

interface DashboardHeaderProps {
  user: User;
  resolvedTheme: string;
  onOpenSidebar: () => void;
  onGoHome: () => void;
  onOpenCommandPalette: () => void;
  onToggleTheme: () => void;
  onOpenSettings: () => void;
}

export function DashboardHeader({
  user,
  resolvedTheme,
  onOpenSidebar,
  onGoHome,
  onOpenCommandPalette,
  onToggleTheme,
  onOpenSettings,
}: DashboardHeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex justify-between items-center py-4 lg:py-8"
    >
      <div className="flex items-center gap-2 lg:gap-3">
        <button
          onClick={onOpenSidebar}
          className="lg:hidden p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
          aria-label="Open menu"
        >
          <FiMenu size={18} />
        </button>
        <div
          onClick={onGoHome}
          className="cursor-pointer transition-all hover:scale-105"
        >
          <div className="lg:hidden">
            <LogoIcon width={28} height={28} />
          </div>
          <div className="hidden lg:block">
            <CompoundLogo />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-3">
        <button
          onClick={onOpenCommandPalette}
          className="lg:hidden p-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.09] dark:hover:border-white/[0.12] text-gray-600 dark:text-gray-300"
          title="Search (⌘K)"
          aria-label="Open search"
        >
          <Search size={16} />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-1.5 lg:p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.09] dark:hover:border-white/[0.12] text-gray-600 dark:text-gray-300"
          title={
            resolvedTheme === "dark"
              ? "Switch to light mode"
              : "Switch to dark mode"
          }
          aria-label="Toggle theme"
        >
          <span className="flex h-7 w-7 items-center justify-center">
            {resolvedTheme === "dark" ? (
              <FiSun size={18} />
            ) : (
              <FiMoon size={18} />
            )}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 lg:p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.09] dark:hover:border-white/[0.12] flex items-center gap-1"
          title="Settings"
        >
          <UserAvatar
            photoURL={user.photoURL}
            displayName={user.displayName}
            email={user.email}
            size={28}
          />
          <FiChevronDown className="hidden lg:block text-gray-500 dark:text-gray-400 text-sm" />
        </button>
      </div>
    </motion.header>
  );
}
