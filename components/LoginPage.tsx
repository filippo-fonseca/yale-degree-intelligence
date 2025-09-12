"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CompoundLogo from "./ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";

export default function LoginPage({
  onBackClick,
}: {
  onBackClick: () => void;
}) {
  const { signInWithGoogle, loading } = useAuth();
  const [isHovering, setIsHovering] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeFeature, setActiveFeature] = useState(0);

  const features = [
    {
      title: "AI Academic Planning. Done right.",
      description:
        "All we need is YHub transcript for intelligent, personalized suggestions.",
    },
    {
      title: "Major & Distributional Insights.",
      description:
        "Track your major requirements, distributionals, & get real-time guidance.",
    },
    {
      title: "Goodbye Google Sheets.",
      description:
        "No more broken formulas or outdated planners — this is DegreeIntelligence.",
    },
  ];

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handleMouseMove);

    const featureInterval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % features.length);
    }, 4000);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      clearInterval(featureInterval);
    };
  }, []);

  const gradientPosition = {
    x:
      mousePosition.x / (typeof window !== "undefined" ? window.innerWidth : 1),
    y:
      mousePosition.y /
      (typeof window !== "undefined" ? window.innerHeight : 1),
  };

  return (
    <div
      className={`relative flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-gray-900 via-blue-900/80 to-purple-900 overflow-hidden font-louize`}
    >
      {/* Dynamic gradient background */}
      <motion.div
        className="absolute inset-0 opacity-30 pointer-events-none"
        animate={{
          backgroundPosition: `${gradientPosition.x * 100}% ${
            gradientPosition.y * 100
          }%`,
        }}
        transition={{ type: "spring", damping: 30 }}
        style={{
          backgroundImage: `
            radial-gradient(circle at center, rgba(165, 142, 251, 0.8) 0%, transparent 60%),
            radial-gradient(circle at 30% 70%, rgba(100, 210, 255, 0.6) 0%, transparent 55%),
            radial-gradient(circle at 70% 30%, rgba(255, 118, 117, 0.6) 0%, transparent 55%)
          `,
        }}
      />

      {/* Floating Yale-inspired elements */}
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/10 backdrop-blur-sm"
          initial={{
            x: Math.random() * 100,
            y: Math.random() * 100,
            scale: Math.random() * 0.5 + 0.5,
          }}
          animate={{
            x: [null, Math.random() * 100],
            y: [null, Math.random() * 100],
          }}
          transition={{
            duration: Math.random() * 15 + 15,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          style={{
            width: `${Math.random() * 10 + 5}px`,
            height: `${Math.random() * 10 + 5}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}

      {/* Main content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 w-full max-w-xl"
      >
        <div className="p-1 rounded-2xl bg-gradient-to-r from-purple-500/20 via-blue-500/20 to-pink-500/20">
          <div className="p-8 space-y-8 backdrop-blur-lg bg-gray-900/70 rounded-xl border border-gray-800/50 shadow-2xl">
            {/* Yale crest animation */}
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="flex justify-center"
            >
              <div className="relative w-32 h-32">
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
                  <div className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-purple-300">
                    {/* <CompoundLogo animated /> */}
                    <LogoIcon width={64} height={64} />
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="space-y-2 text-center">
              <motion.h1
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-300"
              >
                <CompoundLogo hideLogo animated size="xl" />
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-lg text-gray-300"
              >
                Here you'll navigate Yale journey with clarity, not
                spreadsheets.
              </motion.p>
            </div>

            {/* Rotating feature showcase */}
            <div className="h-24 flex items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeFeature}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.5 }}
                  className="text-center"
                >
                  <h3 className="text-xl font-medium text-blue-200">
                    {features[activeFeature].title}
                  </h3>
                  <p className="text-gray-300">
                    {features[activeFeature].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Auth button */}
            <motion.div
              onHoverStart={() => setIsHovering(true)}
              onHoverEnd={() => setIsHovering(false)}
              className="pt-4"
            >
              <Button
                // onClick={signInWithGoogle}
                disabled={loading}
                className={`w-full h-14 text-lg font-medium rounded-xl transition-all duration-500 ${
                  isHovering
                    ? "bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/30"
                    : "bg-gradient-to-br from-blue-600 to-purple-700 shadow-md"
                }`}
              >
                {loading ? (
                  <motion.span
                    animate={{ opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    Securing Access...
                  </motion.span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <span>Log in with CAS</span>
                    <motion.span
                      animate={isHovering ? { x: [0, 2, 0] } : {}}
                      transition={{ duration: 0.5 }}
                    >
                      →
                    </motion.span>
                  </span>
                )}
              </Button>
            </motion.div>

            {/* Premium badge */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="pt-2 text-center"
            >
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-700/30">
                <span className="text-xs font-medium text-blue-200">
                  MADE BY YALIES, FOR YALIES.
                </span>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
              className="text-center mt-4"
              onClick={onBackClick}
            >
              <a
                href="/"
                className="text-sm text-gray-400 hover:text-white transition-colors inline-flex items-center"
              >
                <span>←</span> Return to homepage
              </a>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-6 text-center text-sm"
      >
        <p className="text-gray-400">
          Hey there! Thanks for stopping by. We're Filippo Fonseca & Emir Ahmed.{" "}
          <a
            href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
            className="text-white font-normal hover:underline"
          >
            Have feedback?
          </a>
        </p>
        <p className="text-xs mt-1 text-gray-400">
          v0.0.1. Not officially affiliated or partnered with Yale University.
        </p>
      </motion.div>
    </div>
  );
}
