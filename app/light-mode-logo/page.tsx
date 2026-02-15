"use client";

import LogoIcon from "@/icons/LogoIcon";
import { motion } from "framer-motion";

export default function LightModeLogoPage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center font-louize overflow-visible">
      <div className="flex items-center space-x-3 p-16">
        <LogoIcon variant="darkOnLight" className="h-14 w-14" />
        <div className="relative">
          <h1 className="text-5xl font-medium tracking-tight text-gray-900">
            DegreeIntelligence
          </h1>
          <motion.span
            className="font-sf absolute text-lg -top-6 -right-10 px-3 py-1.5 font-bold rounded-lg transform rotate-12 bg-white border border-gray-200 text-pink-500 shadow-md"
          >
            YALE
          </motion.span>
        </div>
      </div>
    </div>
  );
}
