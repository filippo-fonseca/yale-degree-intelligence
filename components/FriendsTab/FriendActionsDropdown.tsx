"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FiMoreVertical, FiUser, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { Friend, UserProfile } from "./friendsTypes";

type FriendActionsDropdownProps = {
  friend: Friend;
  profile: UserProfile;
  onRemove: (target: { friend: Friend; profile: UserProfile }) => void;
};

export function FriendActionsDropdown({
  friend,
  profile,
  onRemove,
}: FriendActionsDropdownProps) {
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
        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition"
        aria-label="Friend actions"
      >
        <FiMoreVertical size={14} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="absolute right-0 mt-1.5 w-48 bg-white dark:bg-[#0c0c0e] backdrop-blur-2xl rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-10 border border-gray-200 dark:border-white/[0.08] overflow-hidden"
          >
            <Link
              href={`/user/${profile.uid}`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FiUser size={13} />
              View Profile
            </Link>
            <button
              onClick={() => {
                onRemove({ friend, profile });
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors border-t border-gray-100 dark:border-white/[0.06]"
            >
              <FiX size={13} />
              Remove Friend
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
