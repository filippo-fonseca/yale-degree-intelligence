"use client";

import { motion } from "framer-motion";
import { Course } from "@/lib/types";
import { TabNeedsCoursesEmpty } from "@/components/ui/TabNeedsCoursesEmpty";
import { FriendsTab } from "./dynamicTabs";
import type { UserProfile } from "./types";

interface FriendsTabPanelProps {
  courses: Course[];
  hasData: boolean;
  friendsEnabled: boolean;
  userProfile: UserProfile | null;
  onGoToCourses: () => void;
  onToggleFriends: (enabled: boolean) => Promise<void>;
}

export function FriendsTabPanel({
  courses,
  hasData,
  friendsEnabled,
  userProfile,
  onGoToCourses,
  onToggleFriends,
}: FriendsTabPanelProps) {
  return (
    <motion.div
      key="friends"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {!hasData ? (
        <TabNeedsCoursesEmpty
          tabLabel="Friends"
          onGoToCourses={onGoToCourses}
        />
      ) : (
        <FriendsTab
          friendsEnabled={friendsEnabled}
          onToggleFriends={onToggleFriends}
          courses={courses}
          userProfile={userProfile}
        />
      )}
    </motion.div>
  );
}
