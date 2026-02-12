"use client";

import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";

interface V2AnnouncementModalProps {
  show: boolean;
  onDismiss: () => void;
}

export default function V2AnnouncementModal({
  show,
  onDismiss,
}: V2AnnouncementModalProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
          onClick={onDismiss}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-2xl bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-gray-950/95 backdrop-blur-2xl border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <button
                onClick={onDismiss}
                className="absolute top-4 right-4 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.08] text-gray-400 hover:text-white transition-all"
              >
                <FiX size={18} />
              </button>
              <div className="flex items-center justify-center gap-3 mb-2">
                <LogoIcon width={32} height={32} />
                <div className="px-2.5 py-1 rounded-full bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 border border-purple-500/30">
                  <span className="text-xs font-semibold bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 bg-clip-text text-transparent">
                    NEW
                  </span>
                </div>
              </div>
              <h2 className="text-2xl text-center font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                Welcome to v2.
              </h2>
              <p className="text-gray-400 mt-1 text-center text-sm">
                We&apos;ve completely rebuilt the experience. It&apos;s
                prettier. It&apos;s faster. It&apos;s better.
              </p>
            </div>

            {/* Stats highlight */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-950/30 via-transparent to-blue-950/30">
              <p className="text-lg font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200 bg-clip-text text-transparent">
                1 in 8 Yale undergrads already use DegreeIntelligence.
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Thanks for being one of them. We genuinely think this new
                version will make your life SO much easier. Like srly. Just try
                it and see. Give us feedback if you can (see sidebar). DI's
                really helped us for our own planning, so we hope it'll do the
                same for you! Appreciate you.{" "}
                <i>- Filippo Fonseca, Davenport '28</i>
              </p>
            </div>

            {/* Video Section */}
            <div className="px-6 py-4">
              <p className="text-center text-xs text-gray-500 mb-3 uppercase tracking-wider font-medium">
                Watch our v2 launch video
              </p>

              {/* Video Container */}
              <div className="relative">
                {/* Glow effect */}
                <div className="absolute -inset-1 bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-blue-500/15 rounded-xl blur-xl opacity-60" />

                {/* Video wrapper */}
                <div className="relative rounded-xl overflow-hidden border border-white/[0.1] shadow-[0_4px_24px_rgba(0,0,0,0.4)] bg-gray-950/80">
                  {/* Decorative top bar */}
                  <div className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-gray-900/80 to-gray-950/80 border-b border-white/[0.06]">
                    <div className="w-2 h-2 rounded-full bg-red-500/80" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                    <div className="w-2 h-2 rounded-full bg-green-500/80" />
                    <span className="ml-2 text-[10px] text-gray-500 font-medium">
                      v2-launch.mp4
                    </span>
                  </div>

                  {/* Video embed */}
                  <div className="aspect-video">
                    <iframe
                      src="https://www.youtube.com/embed/WOqPZC2exwA?si=WvVAvNOZ3Qjv-NjR"
                      title="DegreeIntelligence v2 Launch"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerPolicy="strict-origin-when-cross-origin"
                      allowFullScreen
                      className="w-full h-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-white/[0.06] flex justify-end">
              <button
                onClick={onDismiss}
                className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-500/20 via-purple-500/20 to-pink-500/20 hover:from-blue-500/30 hover:via-purple-500/30 hover:to-pink-500/30 text-white border border-white/[0.1] shadow-[0_2px_12px_rgba(139,92,246,0.15),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-200"
              >
                Let&apos;s go!
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
