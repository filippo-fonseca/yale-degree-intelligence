"use client";

import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

interface CustomLoaderProps {
  fullScreen?: boolean;
}

const CustomLoader = ({ fullScreen = true }: CustomLoaderProps) => {
  const [randomPhrase, setRandomPhrase] = useState(
    "Loading your academic rizz..."
  );
  const [isClient, setIsClient] = useState(false);

  const randomPhrases = [
    "Longer than my attention span...",
    "This load time...",
    "Your academic glow-up loading...",
    "Calculating how many all-nighters you've pulled...",
    "Finding out which dining hall meal gave you food poisoning...",
    "Detecting how many times you cried in Bass...",
    "Counting how many times you said 'I'll start tomorrow'...",
    "Measuring the depth of your imposter syndrome...",
    "Loading more patience than I have for group projects...",
    "This is taking longer than my laundry pile...",
    "Better than waiting in a dining hall line...",
    "This wait tho...",
    "Processing your trauma...",
    "Detecting how many blue books you've filled...",
    "Loading more effort than my 9am attendance...",
  ];

  useEffect(() => {
    setIsClient(true);
    setRandomPhrase(
      randomPhrases[Math.floor(Math.random() * randomPhrases.length)]
    );
  }, []);

  // Static fallback for server-side rendering
  if (!isClient) {
    return (
      <div
        className={`flex items-center justify-center ${
          fullScreen ? "min-h-screen" : "min-h-[200px]"
        } bg-theme overflow-hidden`}
      >
        <div className="relative w-72 h-72">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 border-2 border-purple-300/40 dark:border-purple-500/30 shadow-inner" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? "min-h-screen" : "min-h-[200px]"
      } bg-theme overflow-hidden`}
    >
      <div className="relative w-96 h-64">
        {/* The landing circle */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-900 dark:to-gray-800 border-2 border-purple-300/40 dark:border-purple-500/30 shadow-md dark:shadow-inner" />
        </div>
        {/* Falling drops */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 left-1/2 w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-md shadow-md"
            initial={{
              x: -3,
              y: -50,
              rotate: 0,
              scale: 0.8,
            }}
            animate={{
              y: 100,
              x: Math.random() * 40 - 20,
              opacity: [1, 1, 0],
              rotate: 360,
            }}
            transition={{
              delay: i * 0.09,
              duration: 0.6,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "easeIn",
            }}
            style={{
              originX: 0.5,
              originY: 0.5,
            }}
          />
        ))}
        {/* Impact burst */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`pack-${i}`}
            className="absolute top-1/2 left-1/2 w-5 h-5 bg-gradient-to-br from-blue-400 to-purple-500 rounded-md shadow-md"
            initial={{
              x: Math.random() * 40 - 20,
              y: -50,
              scale: 0.8,
              opacity: 0,
            }}
            animate={{
              scale: [0, 1, 0],
              opacity: [0, 1, 0],
              x: 0,
              y: 0,
            }}
            transition={{
              delay: 0.4 + i * 0.07,
              duration: 0.45,
              repeat: Infinity,
              repeatDelay: 0.4,
              ease: "anticipate",
            }}
          />
        ))}
        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: [1, 1.25, 1],
            opacity: [0, 0.35, 0],
          }}
          transition={{
            delay: 0.45,
            duration: 0.8,
            repeat: Infinity,
            repeatDelay: 0.15,
            ease: "easeOut",
          }}
        >
          <div className="w-24 h-24 rounded-full border-2 border-blue-400/40 dark:border-blue-400/30" />
        </motion.div>
        {/* Subtitle text */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 text-center text-sm text-muted"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {randomPhrase}
        </motion.div>
      </div>
    </div>
  );
};

export default CustomLoader;
