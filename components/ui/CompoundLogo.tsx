import React from "react";
import LogoIcon from "@/icons/LogoIcon";
import { motion, Variants } from "framer-motion";

interface CompoundLogoProps {
  animated?: boolean;
  hideLogo?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  lightMode?: boolean;
  // Force the dark-on-dark treatment regardless of the active theme class
  // (used on the always-dark marketing landing page).
  darkAlways?: boolean;
}

const CompoundLogo: React.FC<CompoundLogoProps> = ({
  animated = false,
  hideLogo = false,
  size = "md",
  lightMode = false,
  darkAlways = false,
}) => {
  const sizeClasses = {
    sm: {
      text: "text-xl",
      badge: "text-xs -top-2 -right-5 px-1.5 py-0.5",
    },
    md: {
      text: "text-2xl",
      badge: "text-xs -top-3 -right-6 px-2 py-1",
    },
    lg: {
      text: "text-3xl",
      badge: "text-sm -top-4 -right-7 px-2.5 py-1",
    },
    xl: {
      text: "text-4xl",
      badge: "text-base -top-5 -right-8 px-3 py-1.5",
    },
  };

  const animationVariants: Variants = {
    animate: {
      y: [0, -10, 0],
      rotate: [12, -8, 12],
      scale: [1, 1.1, 1],
      transition: {
        duration: 0.6,
        repeat: Infinity,
        repeatDelay: 2,
        ease: "easeInOut" as const,
      },
    },
  };

  return (
    <div
      className={`flex items-center ${
        size !== "sm" ? "space-x-2" : "space-x-1.5"
      }`}
    >
      {!hideLogo && (
        <LogoIcon
          lightMode={lightMode}
          className={
            size === "xl"
              ? "h-10 w-10"
              : size === "lg"
              ? "h-8 w-8"
              : size === "md"
              ? "h-6 w-6"
              : "h-5 w-5"
          }
        />
      )}
      <div className="relative">
        <h1
          className={`${sizeClasses[size].text} font-medium tracking-tight ${
            darkAlways
              ? "text-white"
              : lightMode
                ? "text-gray-900"
                : "text-gray-900 dark:text-white"
          }`}
        >
          DegreeIntelligence
        </h1>
        <motion.span
          whileHover={{ scale: 1.05 }}
          animate={animated ? "animate" : undefined}
          variants={animationVariants}
          className={`font-sf absolute ${sizeClasses[size].badge} font-bold rounded-lg transform rotate-12 transition-all ${
            darkAlways
              ? "bg-gray-900 border border-gray-800 text-pink-400 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] hover:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.1)]"
              : lightMode
                ? "bg-white border border-gray-200 text-pink-600 shadow-md"
                : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-[inset_2px_2px_4px_rgba(0,0,0,0.3),inset_-2px_-2px_4px_rgba(255,255,255,0.05)] text-pink-600 dark:text-pink-400 hover:shadow-[inset_3px_3px_6px_rgba(0,0,0,0.4),inset_-3px_-3px_6px_rgba(255,255,255,0.1)]"
          }`}
        >
          YALE
        </motion.span>
      </div>
    </div>
  );
};

export default CompoundLogo;
