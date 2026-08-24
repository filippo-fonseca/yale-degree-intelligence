"use client";

import type { User } from "firebase/auth";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBarChart2,
  FiBook,
  FiChevronRight,
  FiCoffee,
  FiX,
} from "react-icons/fi";
import { FaGithub, FaHeart } from "react-icons/fa6";
import { MessageCircleQuestionMark } from "lucide-react";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { playPop } from "@/lib/soundEffects";
import type { NavItem } from "./navItems";

interface MobileSidebarProps {
  open: boolean;
  user: User;
  navItems: NavItem[];
  activeTab: string;
  onClose: () => void;
  onTabChange: (tabId: string) => void;
  onOpenSettings: () => void;
}

export function MobileSidebar({
  open,
  user,
  navItems,
  activeTab,
  onClose,
  onTabChange,
  onOpenSettings,
}: MobileSidebarProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 w-72 z-50 lg:hidden flex flex-col justify-between p-4 bg-gradient-to-br from-white via-white to-gray-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 border-r border-black/[0.06] dark:border-white/[0.08] shadow-[8px_0_32px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
              <CompoundLogo size="sm" />
              <button
                onClick={onClose}
                className="p-2 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                <FiX size={18} />
              </button>
            </div>
            <nav className="space-y-1.5 flex-1 overflow-y-auto">
              {navItems
                .filter((item) => !item.disabled && !item.comingSoon)
                .map((item) => (
                  <motion.button
                    key={item.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      onTabChange(item.id);
                      onClose();
                      playPop();
                    }}
                    className={`w-full flex items-center justify-between px-4 py-3 text-left rounded-2xl transition-all duration-300 ${
                      activeTab === item.id
                        ? "bg-gradient-to-br from-black/[0.08] via-black/[0.04] to-transparent dark:from-white/[0.12] dark:via-white/[0.06] dark:to-transparent text-gray-900 dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <item.icon size={item.id === "cleoai" ? 18 : 14} />
                      <span className="text-sm">{item.label}</span>
                      {item.badge && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    {activeTab === item.id && !item.badge && (
                      <FiChevronRight className="text-blue-400" />
                    )}
                  </motion.button>
                ))}
            </nav>
            <div className="pt-4 border-t border-black/[0.06] dark:border-white/[0.08] space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Link
                  href="/mission"
                  onClick={onClose}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FaHeart className="text-emerald-400" size={12} />
                  <span className="text-xs">Mission</span>
                </Link>
                <Link
                  href="/changelog"
                  onClick={onClose}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FiBarChart2 className="text-pink-400" size={12} />
                  <span className="text-xs">Changelog</span>
                </Link>
                <Link
                  href="/terms"
                  onClick={onClose}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FiBook className="text-blue-400" size={12} />
                  <span className="text-xs">Terms</span>
                </Link>
                <Link
                  href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <MessageCircleQuestionMark
                    className="text-purple-400"
                    size={12}
                  />
                  <span className="text-xs">Feedback</span>
                </Link>
                <Link
                  href="https://coff.ee/filippofonseca"
                  target="_blank"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FiCoffee className="text-amber-400" size={12} />
                  <span className="text-xs">Coffee</span>
                </Link>
                <Link
                  href="https://github.com/filippo-fonseca/yale-degree-intelligence"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                >
                  <FaGithub className="text-gray-400" size={12} />
                  <span className="text-xs">Source</span>
                </Link>
              </div>

              <button
                onClick={() => {
                  onOpenSettings();
                  onClose();
                }}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.06] transition-all"
              >
                <UserAvatar
                  photoURL={user.photoURL}
                  displayName={user.displayName}
                  email={user.email}
                  size={32}
                />
                <div className="flex-1 text-left">
                  <p className="text-sm text-gray-900 dark:text-white truncate">
                    {user.displayName}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {user.email}
                  </p>
                </div>
              </button>

              <p className="text-[9px] text-gray-400 dark:text-gray-600 leading-tight px-1">
                Student-built tool. Verify with your DUS. Not affiliated with
                Yale.
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
