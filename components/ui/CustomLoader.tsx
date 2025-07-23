"use client";

import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";

const CustomLoader = () => {
  const [randomPhrase, setRandomPhrase] = useState(
    "Loading your academic rizz..."
  );
  const [isClient, setIsClient] = useState(false);

  const randomPhrases = [
    "Loading your academic rizz...",
    "This taking longer than my attention span...",
    "Your transcript is giving main character energy...",
    "Processing... like my brain during finals week...",
    "Boutta make your GPA go 📈...",
    "This load time is sus...",
    "Your academic glow-up loading...",
    "Calculating how many all-nighters you've pulled...",
    "Finding out which dining hall meal gave you food poisoning...",
    "Detecting how many times you cried in Bass...",
    "Counting how many times you said 'I'll start tomorrow'...",
    "Measuring the depth of your imposter syndrome...",
    "Loading more patience than I have for group projects...",
    "This taking longer than my laundry pile...",
    "Your academic villain origin story loading...",
    "Better than waiting for a dining hall line...",
    "This wait tho...",
    "Processing your trauma...",
    "Detecting how many blue books you've filled...",
    "Loading more effort than my 9am attendance...",
    "Your academics are unmatched...",
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
      <div className="flex items-center justify-center min-h-screen bg-gray-950 overflow-hidden">
        <div className="relative w-64 h-64">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-gray-700 shadow-inner" />
          </div>
          <div className="absolute bottom-0 left-0 right-0 text-center text-sm text-gray-400 mt-4">
            cooking here...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-950 overflow-hidden">
      <div className="relative w-64 h-64">
        {/* The hole */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gray-900 to-gray-800 border-2 border-gray-700 shadow-inner" />
        </div>
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute top-0 left-1/2 w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg shadow-md"
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
              delay: i * 0.15, // Reduced delay between items
              duration: 0.8, // Faster animation
              repeat: Infinity,
              repeatDelay: 3, // Reduced pause before repeating
              ease: "easeInOut",
            }}
            style={{
              originX: 0.5,
              originY: 0.5,
            }}
          />
        ))}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`pack-${i}`}
            className="absolute top-1/2 left-1/2 w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-500 rounded-lg shadow-md"
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
              delay: 0.5 + i * 0.1, // Start sooner with smaller gap
              duration: 0.6, // Faster animation
              repeat: Infinity,
              repeatDelay: 3, // Reduced pause
              ease: "anticipate",
            }}
          />
        ))}
        {/* Ripple effect */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeOut",
          }}
        >
          <div className="w-24 h-24 rounded-full border-2 border-blue-400/30" />
        </motion.div>
        {/* Text */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 text-center text-sm text-gray-400 mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          {randomPhrase}
        </motion.div>
      </div>
    </div>
  );
};

export default CustomLoader;
