"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  FiBarChart2,
  FiBook,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiCoffee,
} from "react-icons/fi";
import { FaGithub, FaHeart } from "react-icons/fa6";
import { MessageCircleQuestionMark, Search } from "lucide-react";
import type { NavItem } from "./navItems";

interface DesktopSidebarProps {
  navItems: NavItem[];
  activeTab: string;
  sidebarExpanded: boolean;
  sidebarPinned: boolean;
  onTabChange: (tabId: string) => void;
  onOpenCommandPalette: () => void;
  onTogglePinned: (pinned: boolean) => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClearHover: () => void;
}

export function DesktopSidebar({
  navItems,
  activeTab,
  sidebarExpanded,
  sidebarPinned,
  onTabChange,
  onOpenCommandPalette,
  onTogglePinned,
  onMouseEnter,
  onMouseLeave,
  onClearHover,
}: DesktopSidebarProps) {
  return (
    <motion.aside
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0, width: sidebarExpanded ? 224 : 76 }}
      transition={{ width: { type: "spring", stiffness: 380, damping: 38 } }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="hidden lg:flex h-full flex-col justify-between p-3 rounded-3xl bg-gradient-to-br from-white/90 via-gray-50/80 to-white/70 dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.1),0_0_80px_rgba(59,130,246,0.04),inset_0_1px_0_rgba(255,255,255,0.8),inset_0_-1px_0_rgba(0,0,0,0.05)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_80px_rgba(59,130,246,0.06),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3)] ring-1 ring-black/[0.04] dark:ring-white/[0.05] overflow-visible"
    >
      <div
        className={`flex mb-1.5 ${sidebarExpanded ? "justify-end" : "justify-center"}`}
      >
        <button
          onClick={() => {
            const next = !sidebarPinned;
            onTogglePinned(next);
            if (!next) onClearHover();
          }}
          title={sidebarPinned ? "Collapse sidebar" : "Keep sidebar open"}
          aria-label={
            sidebarPinned ? "Collapse sidebar" : "Keep sidebar open"
          }
          className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
        >
          {sidebarPinned ? (
            <FiChevronsLeft size={16} />
          ) : (
            <FiChevronsRight size={16} />
          )}
        </button>
      </div>

      <div className="px-1 mb-2">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onOpenCommandPalette}
          data-tour="search"
          title={sidebarExpanded ? undefined : "Search (⌘K)"}
          className={`w-full flex items-center rounded-2xl border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors ${
            sidebarExpanded
              ? "justify-between px-3 py-2.5"
              : "justify-center p-3"
          }`}
        >
          <span className="flex items-center space-x-3">
            <Search size={14} />
            {sidebarExpanded && (
              <span className="text-sm whitespace-nowrap">Search</span>
            )}
          </span>
          {sidebarExpanded && (
            <kbd className="flex items-center gap-0.5 rounded-md border border-black/[0.08] dark:border-white/10 px-1.5 py-0.5 text-[10px] font-medium text-gray-400 dark:text-gray-500">
              ⌘K
            </kbd>
          )}
        </motion.button>
      </div>

      <nav className="space-y-1.5 flex-1 overflow-y-auto overflow-x-visible px-1">
        {navItems
          .filter((item) => !item.disabled && !item.comingSoon)
          .map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                onTabChange(item.id);
                void new Audio("/audio/pop.mp3").play().catch(() => null);
              }}
              data-tour={`nav-${item.id}`}
              title={sidebarExpanded ? undefined : item.label}
              className={`relative w-full flex items-center px-3 py-3 text-left rounded-2xl transition-colors duration-200 ${
                sidebarExpanded ? "justify-between" : "justify-center"
              } ${
                activeTab === item.id
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
              }`}
            >
              {activeTab === item.id && (
                <motion.div
                  layoutId="sidebarActiveTab"
                  transition={{
                    type: "spring",
                    stiffness: 480,
                    damping: 40,
                  }}
                  className="absolute inset-0 rounded-2xl bg-gray-200/90 dark:bg-white/[0.08] shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.7)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_4px_12px_rgba(0,0,0,0.25)]"
                />
              )}
              <div className="relative z-10 flex items-center space-x-3 min-w-0">
                <item.icon
                  size={item.id === "cleoai" ? 18 : 12}
                  opacity={
                    item.id === "cleoai" && activeTab !== "cleoai" ? 0.5 : 1
                  }
                />
                {sidebarExpanded && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
                {sidebarExpanded && item.badge && (
                  <span className="ml-0.5 px-1.5 py-0.5 text-[9px] rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                    {item.badge}
                  </span>
                )}
              </div>

              {sidebarExpanded && activeTab === item.id && !item.badge && (
                <FiChevronRight className="relative z-10 text-blue-500 dark:text-blue-400" />
              )}
            </motion.button>
          ))}

        {navItems
          .filter((item) => item.comingSoon)
          .map((item) => (
            <motion.button
              key={item.id}
              data-tour={`nav-${item.id}`}
              title={sidebarExpanded ? undefined : item.label}
              className={`w-full flex items-center px-3 py-3 text-left rounded-2xl transition-all duration-300 relative text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60 ${
                sidebarExpanded ? "justify-between" : "justify-center"
              }`}
              disabled
            >
              <div className="flex items-center space-x-3">
                <item.icon
                  size={item.id === "cleoai" ? 18 : 12}
                  opacity={0.5}
                />
                {sidebarExpanded && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
                {sidebarExpanded && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    COMING SOON
                  </span>
                )}
              </div>
            </motion.button>
          ))}

        {sidebarExpanded &&
          navItems.some((item) => item.disabled && !item.comingSoon) && (
            <div className="pt-3 pb-1 px-4">
              <p className="text-[9px] font-medium uppercase tracking-widest text-gray-400 dark:text-gray-600">
                After you upload courses:
              </p>
            </div>
          )}

        {navItems
          .filter((item) => item.disabled && !item.comingSoon)
          .map((item) => (
            <motion.button
              key={item.id}
              data-tour={`nav-${item.id}`}
              title={sidebarExpanded ? undefined : item.label}
              className={`w-full flex items-center px-3 py-3 text-left rounded-2xl transition-all duration-300 relative text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-60 ${
                sidebarExpanded ? "justify-between" : "justify-center"
              }`}
              disabled
            >
              <div className="flex items-center space-x-3">
                <item.icon
                  size={item.id === "cleoai" ? 18 : 12}
                  opacity={0.5}
                />
                {sidebarExpanded && (
                  <span className="whitespace-nowrap">{item.label}</span>
                )}
              </div>
            </motion.button>
          ))}
      </nav>

      <div
        className={`sticky bottom-0 left-0 right-0 pt-2 ${
          sidebarExpanded ? "" : "hidden"
        }`}
      >
        <div className="space-y-2">
          <motion.div
            whileHover={{ y: -1, scale: 1.005 }}
            whileTap={{ scale: 0.99 }}
            className="p-2 rounded-xl bg-gradient-to-br from-black/[0.04] via-transparent to-black/[0.06] dark:from-white/[0.08] dark:via-transparent dark:to-black/20 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.06),0_0_60px_rgba(139,92,246,0.02),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-1px_0_rgba(0,0,0,0.04)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_60px_rgba(139,92,246,0.04),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-1px_0_rgba(0,0,0,0.3)] backdrop-blur-md"
          >
            <div className="flex flex-col space-y-1">
              <Link
                href="/mission"
                target="_blank"
                className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="p-1 rounded-md bg-gradient-to-br from-emerald-500/20 to-emerald-900/30 border border-emerald-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <FaHeart
                    className="text-emerald-400 drop-shadow-[0_0_4px_rgba(52,211,153,0.4)]"
                    size={10}
                  />
                </div>
                <span className="text-xs">Our mission</span>
              </Link>
              <Link
                href="/changelog"
                target="_blank"
                className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="p-1 rounded-md bg-gradient-to-br from-pink-500/20 to-pink-900/30 border border-pink-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <FiBarChart2
                    className="text-pink-400 drop-shadow-[0_0_4px_rgba(236,72,153,0.4)]"
                    size={10}
                  />
                </div>
                <span className="text-xs">Changelog</span>
              </Link>
              <Link
                href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                target="_blank"
                className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="p-1 rounded-md bg-gradient-to-br from-purple-500/20 to-purple-900/30 border border-purple-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <MessageCircleQuestionMark
                    className="text-purple-400 drop-shadow-[0_0_4px_rgba(167,139,250,0.4)]"
                    size={10}
                  />
                </div>
                <span className="text-xs">Feedback & errors</span>
              </Link>
              <Link
                href="/terms"
                target="_blank"
                className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="p-1 rounded-md bg-gradient-to-br from-blue-500/20 to-blue-900/30 border border-blue-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <FiBook
                    className="text-blue-400 drop-shadow-[0_0_4px_rgba(96,165,250,0.4)]"
                    size={10}
                  />
                </div>
                <span className="text-xs">Terms</span>
              </Link>
              <Link
                href="https://coff.ee/filippofonseca"
                target="_blank"
                className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="p-1 rounded-md bg-gradient-to-br from-amber-500/20 to-amber-900/30 border border-amber-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <FiCoffee
                    className="text-amber-400 drop-shadow-[0_0_4px_rgba(251,191,36,0.4)]"
                    size={10}
                  />
                </div>
                <span className="text-xs">Buy us a coffee</span>
              </Link>
              <Link
                href="https://github.com/filippo-fonseca/yale-degree-intelligence"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center space-x-2 p-1.5 rounded-lg hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-all duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <div className="p-1 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-900/30 border border-gray-500/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <FaGithub className="text-gray-300" size={10} />
                </div>
                <span className="text-xs">We&apos;re open source</span>
              </Link>
            </div>
          </motion.div>

          <div className="px-1 pb-1">
            <p className="text-[10px] text-gray-400 dark:text-gray-600 leading-tight text-justify">
              Student-built, not affiliated with Yale. Free forever. We will
              never charge a dime. Data may be inaccurate; verify with your DUS.
            </p>
          </div>
        </div>
      </div>
    </motion.aside>
  );
}
