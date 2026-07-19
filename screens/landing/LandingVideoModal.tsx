"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiPlayCircle, FiX } from "react-icons/fi";

type LandingVideoModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function LandingVideoModal({
  open,
  onClose,
}: LandingVideoModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative w-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="rounded-2xl bg-white/90 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-black/[0.06] dark:border-white/[0.1] shadow-[0_8px_64px_rgba(0,0,0,0.6),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-black/[0.04] dark:ring-white/[0.05] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center gap-2">
                  <FiPlayCircle className="text-purple-400" size={16} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    v3.0.0 Launch Video
                  </span>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-black/[0.04] dark:bg-white/[0.05] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all"
                >
                  <FiX size={16} />
                </button>
              </div>

              {/* Video embed */}
              <div className="aspect-video bg-black/50">
                <iframe
                  src="https://www.youtube.com/embed/5H1kjMWQfgs"
                  title="DegreeIntelligence v3.0.0 Launch"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full"
                />
              </div>

              {/* Footer */}
              <div className="px-5 py-3 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 rounded bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.1] text-gray-500 dark:text-gray-400 text-[10px]">
                    ESC
                  </kbd>{" "}
                  or click outside to close
                </p>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 text-xs rounded-lg bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] hover:from-black/[0.08] dark:hover:from-white/[0.1] border border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
