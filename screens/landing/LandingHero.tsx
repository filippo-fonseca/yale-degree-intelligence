"use client";

import { motion } from "framer-motion";
import { FiArrowRight, FiPlayCircle, FiHeart } from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import LogoIcon from "@/icons/LogoIcon";
import CompoundLogo from "@/components/ui/CompoundLogo";
import Link from "next/link";
import HeroConstellation from "@/components/landing/HeroConstellation";

type LandingHeroProps = {
  onLogin: () => void;
  onOpenVideo: () => void;
};

export default function LandingHero({ onLogin, onOpenVideo }: LandingHeroProps) {
  return (
    <>
      {/* Welcome Banner */}
      <div className="relative mb-8 mt-14 z-30 bg-gradient-to-r from-emerald-900/20 via-blue-900/20 to-purple-900/20 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-center gap-2">
          <span className="px-2.5 py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 text-emerald-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.1),0_2px_8px_rgba(52,211,153,0.2)] flex items-center gap-1 shrink-0">
            <HiSparkles className="w-3 h-3" />{" "}
            <span className="hidden sm:inline">News</span>
          </span>
          <p className="text-[11px] sm:text-sm text-emerald-100">
            <span className="sm:hidden">The YDN featured us.</span>
            <span className="hidden sm:inline">
              The Yale Daily News featured us.
            </span>{" "}
            <a
              href="https://yaledailynews.com/blog/2025/09/23/new-student-run-platform-aims-to-simplify-degree-planning/"
              target="_blank"
              className="text-blue-600 dark:text-blue-300 font-medium hover:text-gray-900 dark:hover:text-white hover:underline transition-colors"
            >
              Read it!
            </a>
          </p>
        </div>
      </div>

      {/* Sticky Navbar */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogoIcon width={22} height={22} className="sm:w-6 sm:h-6" />
            <span className="text-sm font-medium text-gray-800 dark:text-gray-200 hidden sm:inline">
              DegreeIntelligence
            </span>
          </div>
          <motion.button
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 hover:from-pink-500/30 hover:via-purple-500/30 hover:to-blue-500/30 backdrop-blur-xl rounded-lg sm:rounded-xl text-gray-900 dark:text-white font-medium transition-all shadow-[0_4px_20px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] border border-black/[0.08] dark:border-white/[0.1]"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onLogin}
          >
            <span className="sm:hidden">Log in</span>
            <span className="hidden sm:inline">Log in with @yale.edu Google</span>
            <FiArrowRight size={14} className="opacity-70" />
          </motion.button>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative pt-6 sm:pt-8">
        {/* Cursor-adaptive constellation background (sits behind hero content) */}
        <HeroConstellation />
        {/* increased top padding to fix logo spacing */}
        <div className="max-w-6xl mx-auto px-4 pb-3 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 1, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center p-6 sm:p-8 rounded-2xl bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/[0.04] dark:ring-white/[0.05]"
          >
            {/* Version Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="mb-4 flex justify-center"
            >
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 border border-white/[0.15] shadow-[0_4px_20px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.15)] backdrop-blur-xl">
                <span className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span className="bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text text-transparent">
                  Introducing DegreeIntelligence v3.0.0
                </span>
              </span>
            </motion.div>

            <div className="flex justify-center mb-5">
              {/* more space under logo */}
              <div className="relative w-20 h-20">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400/30 border-r-purple-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <LogoIcon width={40} height={40} />
                </div>
              </div>
            </div>

            <h1 className="flex items-center justify-center text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">
              <CompoundLogo hideLogo animated size="lg" />
            </h1>
            {/* Welcome Badge */}
            <div className="mb-3 flex justify-center">
              <div className="relative p-[1px] rounded-xl bg-gradient-to-r from-pink-500/40 via-purple-500/40 to-blue-500/40">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-950/90 text-pink-600 dark:text-pink-200 shadow-[0_8px_32px_rgba(236,72,153,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.2)] backdrop-blur-xl">
                  <FiHeart className="w-3 h-3 text-blue-400" /> We're so glad
                  you're here. We think you'll love this.
                </span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Your Yale Degree,
              <br className="sm:hidden" />
              <span className="hidden sm:inline"> </span>
              <span className="text-blue-600 dark:text-blue-300">made easy.</span>
            </h2>

            <p className="text-base text-gray-700 dark:text-gray-300 max-w-2xl mx-auto mb-5">
              Let's democratize academic planning, stats, & insights at Yale,
              together.{" "}
              <Link
                href="#team"
                className="inline-flex items-center gap-1.5 text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-purple-300 hover:from-blue-200 hover:to-purple-200 font-medium transition-all group"
              >
                For Yalies, by Yalies
                <span className="text-purple-400 text-sm opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                  ↓
                </span>
              </Link>
            </p>

            <motion.div className="flex flex-wrap justify-center gap-3">
              <motion.button
                className="px-5 py-2.5 text-sm bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] hover:from-black/[0.08] dark:hover:from-white/[0.1] backdrop-blur-xl rounded-xl text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium flex items-center gap-2 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.12] dark:hover:border-white/[0.15]"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onOpenVideo}
              >
                See v3.0.0 launch vid
                <FiPlayCircle className="opacity-70" size={14} />
              </motion.button>
              <motion.button
                className="group relative px-5 py-2.5 text-sm rounded-xl text-white font-medium flex items-center gap-2 transition-all overflow-hidden"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={onLogin}
              >
                {/* Animated gradient border */}
                <span
                  className="absolute inset-0 rounded-xl bg-[conic-gradient(from_var(--angle),#06b6d4,#8b5cf6,#ec4899,#f97316,#06b6d4)] p-[2px] animate-border-spin"
                  style={{ "--angle": "0deg" } as React.CSSProperties}
                >
                  <span className="flex h-full w-full rounded-[10px] bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl" />
                </span>
                {/* Glow effect */}
                <span
                  className="absolute inset-0 rounded-xl opacity-50 blur-md bg-[conic-gradient(from_var(--angle),#06b6d4,#8b5cf6,#ec4899,#f97316,#06b6d4)] animate-border-spin"
                  style={{ "--angle": "0deg" } as React.CSSProperties}
                />
                {/* Button content */}
                <span className="relative z-10 flex items-center gap-2">
                  Log in with @yale.edu Google
                  <FiArrowRight
                    className="opacity-80 group-hover:translate-x-0.5 transition-transform"
                    size={14}
                  />
                </span>
              </motion.button>
            </motion.div>

            {/* Social Proof */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-8 pt-6 border-t border-white/[0.08]"
            >
              <p className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent leading-relaxed">
                Have you heard? 1 in 6 Yale undergrads already use DegreeIntelligence.
              </p>
              <p className="text-base text-gray-500 dark:text-gray-400 mt-2">
                Why don't you? Even if you do...{" "}
                <span className="text-purple-600 dark:text-purple-300 font-medium">
                  We just launched v3.0.0. Free. Always.
                </span>
              </p>

              {/* V2 Launch Video */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.5 }}
                className="mt-8"
              >
                {/* Caption */}
                <div className="mb-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    <span className="font-semibold bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                      OUR V2 LAUNCH — FEB 2026.
                    </span>
                    <br />
                    <span className="text-gray-400 dark:text-gray-500">
                      it's prettier. it's faster. it's better. you should
                      probably check it out idk
                    </span>
                  </p>
                </div>

                {/* Video Container */}
                <div className="relative mx-auto max-w-2xl">
                  {/* Glow effect */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 rounded-2xl blur-xl opacity-60" />

                  {/* Video wrapper */}
                  <div className="relative rounded-2xl overflow-hidden border-2 border-black/[0.08] dark:border-white/[0.1] shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_60px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] bg-white/80 dark:bg-gray-950/80 backdrop-blur-xl">
                    {/* Decorative top bar */}
                    <div className="flex items-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-gray-100/80 to-gray-50/80 dark:from-gray-900/80 dark:to-gray-950/80 border-b border-black/[0.05] dark:border-white/[0.06]">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                      <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      <span className="ml-3 text-[10px] text-gray-400 dark:text-gray-500 font-medium tracking-wide">
                        v2-launch-vid.mp4
                      </span>
                    </div>

                    {/* Video embed */}
                    <div className="aspect-video">
                      <iframe
                        width="560"
                        height="315"
                        src="https://www.youtube.com/embed/5H1kjMWQfgs?si=F9mSXs1G_Wy1Fkx-"
                        title="YouTube video player"
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                        className="w-full h-full"
                      ></iframe>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>

        {/* subtle splash gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-10 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl" />
        </div>
      </div>
    </>
  );
}
