"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

interface LandingVideoModalProps {
  open: boolean;
  onClose: () => void;
}

export default function LandingVideoModal({
  open,
  onClose,
}: LandingVideoModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 10 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-neu dark:border-white/[0.08] dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-black/[0.05] px-4 py-3 dark:border-white/[0.06]">
                <span className="font-louize text-sm font-medium text-gray-900 dark:text-white">
                  DegreeIntelligence v3
                </span>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-gray-500 transition hover:bg-black/[0.04] hover:text-gray-900 dark:hover:bg-white/[0.06] dark:hover:text-white"
                  aria-label="Close video"
                >
                  <FiX size={18} />
                </button>
              </div>
              <div className="aspect-video bg-black">
                <iframe
                  src="https://www.youtube.com/embed/5H1kjMWQfgs"
                  title="DegreeIntelligence v3"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
