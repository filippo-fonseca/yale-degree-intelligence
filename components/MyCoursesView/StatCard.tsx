"use client";

import { motion } from "framer-motion";
import { FiInfo } from "react-icons/fi";

interface StatCardProps {
  label: string;
  value: string | number;
  color?: string;
  infoTooltip?: string;
}

export function StatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  infoTooltip,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl neu-surface-sm backdrop-blur-md hover:-translate-y-0.5 transition-all relative"
    >
      {infoTooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-500 hover:text-gray-700 dark:hover:text-gray-400" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 neu-surface-sm backdrop-blur-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {infoTooltip}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-medium mt-0.5 ${color}`}>{value}</p>
    </motion.div>
  );
}
