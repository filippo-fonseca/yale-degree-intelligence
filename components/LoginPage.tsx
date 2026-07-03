"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompoundLogo from "./ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowRight, FiArrowLeft } from "react-icons/fi";
import { BarChart2, Layers } from "lucide-react";
import { HiSparkles } from "react-icons/hi2";
import CosmicBackground from "@/components/CosmicBackground/page";

export default function LoginPage({
  onBackClick,
}: {
  onBackClick: () => void;
}) {
  const { signInWithGoogle, loading } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: "AI Academic Planning",
      description:
        "Intelligent, personalized course suggestions from your transcript.",
      icon: HiSparkles,
      gradient: "from-pink-500 to-purple-600",
      shadow: "shadow-[0_4px_12px_rgba(168,85,247,0.45)]",
    },
    {
      title: "Major & Distributional Tracking",
      description: "Real-time progress tracking for all your requirements.",
      icon: BarChart2,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-[0_4px_12px_rgba(59,130,246,0.45)]",
    },
    {
      title: "Goodbye Spreadsheets",
      description: "No more broken formulas. This is DegreeIntelligence.",
      icon: Layers,
      gradient: "from-violet-500 to-indigo-600",
      shadow: "shadow-[0_4px_12px_rgba(99,102,241,0.45)]",
    },
  ];

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3500);

    return () => clearInterval(featureInterval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 neu-page overflow-hidden font-louize">
      <CosmicBackground mode="stars" opacity={0.7} />

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="p-6 rounded-2xl neu-surface backdrop-blur-2xl ring-1 ring-black/[0.03] dark:ring-white/[0.05]">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="flex justify-center mb-5"
          >
            <div className="relative w-16 h-16">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border border-transparent border-t-blue-400/30 border-r-purple-400/30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <LogoIcon width={36} height={36} />
              </div>
            </div>
          </motion.div>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center mb-4"
          >
            <h1 className="flex items-center justify-center mb-2">
              <CompoundLogo hideLogo animated size="lg" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Navigate your Yale journey with clarity.
            </p>
          </motion.div>

          {/* Feature carousel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mb-5"
          >
            <div className="h-[80px] flex items-center justify-center px-4 py-3 rounded-xl neu-inset">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3 w-full"
                >
                  {(() => {
                    const f = features[activeFeature];
                    const Icon = f.icon;
                    return (
                      <>
                        <div
                          className={`shrink-0 w-9 h-9 rounded-lg bg-gradient-to-br ${f.gradient} ${f.shadow} flex items-center justify-center shadow-neu-sm`}
                        >
                          <Icon size={16} className="text-white" />
                        </div>
                        <div className="text-left">
                          <h3 className="text-sm font-medium text-gray-900 dark:text-white leading-tight">
                            {f.title}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                            {f.description}
                          </p>
                        </div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Feature indicators */}
            <div className="flex justify-center gap-1.5 mt-3">
              {features.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveFeature(i)}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === activeFeature
                      ? "w-4 bg-gradient-to-r from-blue-400 to-purple-400"
                      : "w-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </motion.div>

          {/* CAS Login button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              onClick={signInWithGoogle}
              disabled={loading}
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-gray-900 dark:text-white neu-control hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-gray-600 dark:text-gray-300"
                >
                  Authenticating...
                </motion.span>
              ) : (
                <>
                  <span>Log in with Yale CAS</span>
                  <motion.span
                    animate={isHovering ? { x: [0, 3, 0] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    <FiArrowRight size={14} className="opacity-70" />
                  </motion.span>
                </>
              )}
            </motion.button>
          </motion.div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex justify-center"
          >
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase neu-control text-gray-500 dark:text-gray-400">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              For Yalies, by Yalies
            </span>
          </motion.div>

          {/* Back link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-center"
          >
            <button
              onClick={onBackClick}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors inline-flex items-center gap-1.5 group"
            >
              <FiArrowLeft
                size={12}
                className="group-hover:-translate-x-0.5 transition-transform"
              />
              Back to homepage
            </button>
          </motion.div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="absolute bottom-4 text-center"
      >
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Built by Yalies, for Yalies. NOT associated with Yale University in
          any way, shape, or form. Just a personal proj. ·{" "}
          <a
            href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Feedback?
          </a>
        </p>
        <p className="text-[10px] mt-0.5 text-gray-400 dark:text-gray-600">
          v2.0 · Not affiliated with Yale University. Any data you upload is
          from your own volition and you agree to our storage practices. We will
          NOT store your transcript.
        </p>
      </motion.div>
    </div>
  );
}
