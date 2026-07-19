"use client";

import { useEffect, useRef } from "react";
import { FiSearch, FiUserPlus, FiX } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { Panda } from "lucide-react";
import { YearBadge } from "../ui/YearBadge";
import { UserAvatar } from "../ui/UserAvatar";
import { CopyButton } from "./friendsUiPrimitives";
import { getDisplayName, UserProfile } from "./friendsTypes";

type FriendsSearchModalProps = {
  show: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onClose: () => void;
  filteredUsers: UserProfile[];
  onSendRequest: (uid: string) => void;
  profileShareUrl: string;
};

function NoFriendsResult({ profileShareUrl }: { profileShareUrl: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3.5 text-center py-8">
      <div className="p-3 rounded-xl bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08]">
        <Panda size={28} className="text-gray-400 dark:text-gray-500" />
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
        Can't find your friend?{" "}
        {profileShareUrl ? (
          <CopyButton profileUrl={profileShareUrl} />
        ) : (
          <span>Share your profile link from settings</span>
        )}
        <br />
        and text it to them! You'll be helping them (and us) out
        <br />
        with our mission of making academic planning easier for all Yale students.
      </div>
    </div>
  );
}

export function FriendsSearchModal({
  show,
  searchTerm,
  onSearchTermChange,
  onClose,
  filteredUsers,
  onSendRequest,
  profileShareUrl,
}: FriendsSearchModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl p-5 rounded-xl shadow-[0_8px_48px_rgba(0,0,0,0.5)] border border-gray-200 dark:border-white/[0.08] max-w-lg w-full h-[400px] flex flex-col"
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            ref={modalRef}
          >
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                  Add a Friend
                </h3>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                  Search by name or major
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition"
              >
                <FiX size={15} />
              </button>
            </div>

            <div className="relative mb-3">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 w-3.5 h-3.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => onSearchTermChange(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                placeholder="Your best friend, or that upperclassman..."
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 pr-0.5">
              {searchTerm.length === 0 ? (
                <NoFriendsResult profileShareUrl={profileShareUrl} />
              ) : filteredUsers.length > 0 ? (
                filteredUsers.slice(0, 10).map((u) => (
                  <motion.div
                    key={u.uid}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] hover:border-pink-400/40 dark:hover:border-pink-500/40 transition-all"
                    whileHover={{ scale: 0.995 }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <UserAvatar
                        photoURL={u.photoURL}
                        displayName={u.displayName}
                        size={32}
                      />
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-800 dark:text-gray-200 truncate">
                          {getDisplayName(u)}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-wrap">
                          {u.majors?.length > 0 && (
                            <span>{u.majors.join(", ")}</span>
                          )}
                          {u.majors?.length > 0 && u.graduationYear && (
                            <span className="text-gray-300 dark:text-gray-700">·</span>
                          )}
                          {u.graduationYear && (
                            <YearBadge graduationYear={u.graduationYear} noPadding />
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 text-[11px] bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 rounded-lg border border-pink-200 dark:border-pink-800/40 hover:bg-pink-100 dark:hover:bg-pink-700/40 hover:text-pink-700 dark:hover:text-white transition font-medium"
                      onClick={() => onSendRequest(u.uid)}
                    >
                      <FiUserPlus size={11} />
                      Add
                    </button>
                  </motion.div>
                ))
              ) : (
                <NoFriendsResult profileShareUrl={profileShareUrl} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
