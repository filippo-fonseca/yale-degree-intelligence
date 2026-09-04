"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiBell } from "react-icons/fi";
import type { Timestamp } from "firebase/firestore";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  getDisplayName,
  type UserProfile,
} from "@/components/FriendsTab/friendsTypes";
import type { FriendNotification } from "./useFriendNotifications";

interface NotificationBellProps {
  notifications: FriendNotification[];
  unreadCount: number;
  profiles: Record<string, UserProfile>;
  onOpen: () => void;
  onGoToFriends: () => void;
}

function relativeTime(at: Timestamp | null): string {
  if (!at) return "";
  const ms = Date.now() - at.toMillis();
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return at.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const MAX_LISTED = 20;

export function NotificationBell({
  notifications,
  unreadCount,
  profiles,
  onOpen,
  onGoToFriends,
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen]);

  const toggle = () => {
    setIsOpen((open) => {
      if (!open) onOpen();
      return !open;
    });
  };

  const listed = notifications.slice(0, MAX_LISTED);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        className="relative p-1.5 lg:p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.09] dark:hover:border-white/[0.12] text-gray-600 dark:text-gray-300"
        title="Notifications"
        aria-label={
          unreadCount > 0
            ? `Notifications, ${unreadCount} unread`
            : "Notifications"
        }
      >
        <span className="flex h-7 w-7 items-center justify-center">
          <FiBell size={17} />
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[1.05rem] h-[1.05rem] px-1 rounded-full bg-pink-500 text-white text-[10px] font-medium leading-none flex items-center justify-center shadow-sm">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            className="absolute right-0 mt-1.5 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-[#0c0c0e] backdrop-blur-2xl rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-50 border border-gray-200 dark:border-white/[0.08] overflow-hidden"
          >
            <div className="px-4 py-2.5 border-b border-gray-100 dark:border-white/[0.06] flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Notifications
              </span>
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                friend activity
              </span>
            </div>

            {listed.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Nothing yet. Friend requests and accepts show up here.
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {listed.map((n) => {
                  const profile: UserProfile = profiles[n.otherUid] ?? {
                    uid: n.otherUid,
                    majors: [],
                  };
                  const name = getDisplayName(profile);
                  return (
                    <button
                      key={n.id}
                      onClick={() => {
                        setIsOpen(false);
                        onGoToFriends();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-white/[0.05] transition-colors border-b border-gray-100 dark:border-white/[0.06] last:border-b-0"
                    >
                      <UserAvatar
                        photoURL={profile.photoURL ?? null}
                        displayName={profile.displayName ?? null}
                        email={null}
                        size={30}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-gray-700 dark:text-gray-300 leading-snug">
                          {n.type === "request" ? (
                            <>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {name}
                              </span>{" "}
                              sent you a friend request
                            </>
                          ) : (
                            <>
                              <span className="font-medium text-gray-900 dark:text-white">
                                {name}
                              </span>{" "}
                              accepted your friend request
                            </>
                          )}
                        </span>
                        <span className="block text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {relativeTime(n.at)}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                onGoToFriends();
              }}
              className="w-full px-4 py-2.5 text-center text-xs text-pink-600 dark:text-pink-400 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors border-t border-gray-100 dark:border-white/[0.06]"
            >
              Open Friends
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
