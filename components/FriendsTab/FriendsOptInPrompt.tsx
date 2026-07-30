"use client";

import { useState } from "react";
import { FiToggleRight } from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { PublicProfileView } from "@/components/FriendsProfile/PublicProfileView";
import {
  DEMO_PREVIEW_COURSES,
  DEMO_PREVIEW_USER,
} from "@/components/FriendsProfile/demoPreviewData";

type FriendsOptInPromptProps = {
  onToggleFriends: (enabled: boolean) => Promise<void>;
};

export function FriendsOptInPrompt({ onToggleFriends }: FriendsOptInPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false);

  return (
    <div className="w-full max-w-3xl mx-auto font-louize">
      <div className="mb-6">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Friends</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          See how older students in your major built their path: courses and
          distributionals, never grades.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
            What your page could look like
          </p>
          <div className="rounded-xl overflow-hidden bg-gray-950 p-2">
            <PublicProfileView
              profile={{
                displayName: DEMO_PREVIEW_USER.displayName,
                majors: DEMO_PREVIEW_USER.majors,
                graduationYear: DEMO_PREVIEW_USER.graduationYear,
                bio: DEMO_PREVIEW_USER.bio,
              }}
              courses={DEMO_PREVIEW_COURSES}
              isPreview
            />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.06] shadow-neu">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
            What friends see
          </h4>
          <ul className="text-xs text-gray-500 dark:text-gray-400 space-y-1.5 ml-3.5">
            <li>Course codes and names (no grades)</li>
            <li>Semesters, credits, and distributionals</li>
            <li>Your major, year, and optional bio</li>
          </ul>
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-white/[0.06] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-emerald-500 dark:text-emerald-400 font-medium">
              Grades and GPA are NEVER shared
            </span>
          </div>
        </div>

        <motion.button
          data-tour="friends-enable"
          onClick={async () => {
            setIsEnabling(true);
            try {
              await onToggleFriends(true);
              toast.success("Friends feature enabled!");
            } catch {
              toast.error("Failed to enable friends feature");
            } finally {
              setIsEnabling(false);
            }
          }}
          disabled={isEnabling}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="di-btn-primary w-full !rounded-xl !px-6 !py-3.5 !text-sm"
        >
          {isEnabling ? (
            <>
              <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
              Enabling...
            </>
          ) : (
            <>
              <FiToggleRight size={18} />
              Enable Friends
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
