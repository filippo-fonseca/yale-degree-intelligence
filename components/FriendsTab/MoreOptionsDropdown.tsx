"use client";

import { useEffect, useRef, useState } from "react";
import { FiMoreVertical, FiToggleLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export function MoreOptionsDropdown({ onDisable }: { onDisable: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
        aria-label="More options"
      >
        <FiMoreVertical size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-[#0c0c0e] backdrop-blur-2xl rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-20 border border-gray-200 dark:border-white/[0.08] overflow-hidden"
          >
            <button
              onClick={() => {
                onDisable();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
            >
              <FiToggleLeft size={14} />
              Disable Friends Feature
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
