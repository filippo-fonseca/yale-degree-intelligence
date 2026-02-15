"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompoundLogo from "./ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowRight, FiArrowLeft } from "react-icons/fi";
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
    },
    {
      title: "Major & Distributional Tracking",
      description: "Real-time progress tracking for all your requirements.",
    },
    {
      title: "Goodbye Spreadsheets",
      description: "No more broken formulas — this is DegreeIntelligence.",
    },
  ];

  useEffect(() => {
    const featureInterval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 3500);

    return () => clearInterval(featureInterval);
  }, []);

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 overflow-hidden font-louize">
      <CosmicBackground mode="stars" opacity={0.7} />

      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[600px] rounded-full bg-gradient-to-r from-blue-600/15 via-purple-600/15 to-pink-600/15 blur-3xl" />
      </div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="p-6 rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-900/60 to-gray-950/80 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_100px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]">
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
            <p className="text-sm text-gray-400">
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
            <div className="h-[72px] flex items-center justify-center p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-transparent border border-white/[0.06] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                  className="text-center"
                >
                  <h3 className="text-sm font-medium bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent mb-0.5">
                    {features[activeFeature].title}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {features[activeFeature].description}
                  </p>
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
                      : "w-1 bg-gray-600 hover:bg-gray-500"
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
              className="w-full py-3 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 hover:from-blue-500/40 hover:via-purple-500/40 hover:to-pink-500/40 border border-white/[0.1] shadow-[0_4px_20px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.15),inset_0_-1px_0_rgba(0,0,0,0.2)] transition-all duration-300 flex items-center justify-center gap-2"
            >
              {loading ? (
                <motion.span
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-gray-300"
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
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-medium tracking-wide uppercase bg-gradient-to-r from-blue-500/15 via-purple-500/15 to-pink-500/15 border border-white/[0.08] text-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
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
              className="text-xs text-gray-500 hover:text-gray-300 transition-colors inline-flex items-center gap-1.5 group"
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
        <p className="text-xs text-gray-500">
          Built by Yalies, for Yalies. NOT associated with Yale University in
          any way, shape, or form. Just a personal proj. ·{" "}
          <a
            href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
            className="text-gray-400 hover:text-white transition-colors"
          >
            Feedback?
          </a>
        </p>
        <p className="text-[10px] mt-0.5 text-gray-600">
          v2.0 · Not affiliated with Yale University. Any data you upload is
          from your own volition and you agree to our storage practices. We will
          NOT store your transcript.
        </p>
      </motion.div>
    </div>
  );
}
