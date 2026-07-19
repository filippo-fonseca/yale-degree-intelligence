"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import {
  FiUserPlus,
  FiUsers,
  FiCheck,
  FiX,
  FiUser,
  FiUserCheck,
  FiMail,
  FiCopy,
  FiAlertTriangle,
  FiExternalLink,
  FiSettings,
  FiChevronDown,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import type { User } from "firebase/auth";
import { Course, FriendsProfileVisibility } from "@/lib/types";
import { PublicProfileView } from "@/components/FriendsProfile/PublicProfileView";
import { YearBadge } from "../ui/YearBadge";
import { UserAvatar } from "../ui/UserAvatar";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import {
  FriendCardSkeleton,
  RequestCardSkeleton,
  FriendStatCard,
  SectionHeading,
} from "./friendsUiPrimitives";
import {
  Friend,
  FriendRequest,
  FriendsUserProfile,
  getDisplayName,
  UserProfile,
} from "./friendsTypes";
import { MoreOptionsDropdown } from "./MoreOptionsDropdown";
import { FriendActionsDropdown } from "./FriendActionsDropdown";
import { FriendsSearchModal } from "./FriendsSearchModal";

type FriendsMainViewProps = {
  user: User;
  courses: Course[];
  userProfile: FriendsUserProfile | null;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  allUsers: UserProfile[];
  friends: Friend[];
  friendProfiles: UserProfile[];
  sentRequests: FriendRequest[];
  incomingRequests: FriendRequest[];
  userProfilesById: Record<string, UserProfile>;
  ready: boolean;
  profileVisibility: FriendsProfileVisibility;
  resolvedVisibility: ReturnType<
    typeof import("@/lib/types").resolveFriendsProfileVisibility
  >;
  savingVisibility: boolean;
  updateVisibility: (patch: Partial<FriendsProfileVisibility>) => Promise<void>;
  sendFriendRequest: (toId: string, onClose?: () => void) => Promise<void>;
  acceptFriendRequest: (req: FriendRequest) => Promise<void>;
  rejectFriendRequest: (req: FriendRequest) => Promise<void>;
  removeFriend: (friendId: string) => Promise<void>;
  cancelSentRequest: (requestId: string) => Promise<void>;
};

export function FriendsMainView({
  user,
  courses,
  userProfile,
  onToggleFriends,
  allUsers,
  friends,
  friendProfiles,
  sentRequests,
  incomingRequests,
  userProfilesById,
  ready,
  profileVisibility,
  resolvedVisibility,
  savingVisibility,
  updateVisibility,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  cancelSentRequest,
}: FriendsMainViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAllIncoming, setShowAllIncoming] = useState(false);
  const [showAllSent, setShowAllSent] = useState(false);
  const [removeFriendTarget, setRemoveFriendTarget] = useState<{
    friend: Friend;
    profile: UserProfile;
  } | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  const profileShareUrl =
    typeof window !== "undefined" && user
      ? `${window.location.origin}/user/${user.uid}`
      : "";

  const filteredUsers = allUsers.filter(
    (u) =>
      u.uid !== user?.uid &&
      !friends.some((fr) => fr.users.includes(u.uid)) &&
      !sentRequests.some((req) => req.to === u.uid) &&
      !incomingRequests.some((req) => req.from === u.uid) &&
      (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.majors || []).join(" ").toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const closeSearchModal = () => {
    setSearchTerm("");
    setShowSearchModal(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto font-louize">
      <div className="mb-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Friends</h2>
          <MoreOptionsDropdown onDisable={() => setShowDisableConfirm(true)} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          See how older students in your major built their path — courses and
          distributionals, never grades.
        </p>
      </div>

      <section className="mb-6 p-4 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.08] shadow-neu">
        <p className="text-xs font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400 mb-3">
          Your public page
        </p>
        <div className="rounded-xl overflow-hidden bg-gray-950 p-2 mb-3">
          <PublicProfileView
            profile={{
              displayName: user?.displayName || undefined,
              email: user?.email || undefined,
              photoURL: user?.photoURL || undefined,
              majors: userProfile?.majors || [],
              graduationYear: userProfile?.graduationYear,
              bio: userProfile?.bio,
            }}
            courses={courses}
            visibility={profileVisibility}
            isPreview
            isOwnProfile
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              if (!profileShareUrl) return;
              navigator.clipboard.writeText(profileShareUrl);
              toast.success("Link copied to clipboard!");
            }}
            className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40 hover:bg-pink-100 dark:hover:bg-pink-800/30 transition"
          >
            <FiCopy size={12} />
            Copy link
          </button>
          <Link
            href={user ? `/user/${user.uid}` : "#"}
            target="_blank"
            className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-gray-50 dark:bg-white/[0.04] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/[0.08] hover:border-pink-300 dark:hover:border-pink-500/40 hover:text-pink-600 dark:hover:text-pink-300 transition"
          >
            <FiExternalLink size={12} />
            Open my page
          </Link>
          <button
            type="button"
            onClick={() => setShowCustomize((v) => !v)}
            className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 hover:bg-purple-500/20 transition"
          >
            <FiSettings size={12} />
            Customize
            <FiChevronDown
              size={12}
              className={`transition-transform ${showCustomize ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        <AnimatePresence>
          {showCustomize && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-white/[0.06]">
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-3">
                  This is what friends see on your page.
                </p>
                <div className="space-y-2">
                  {(
                    [
                      { key: "showBio", label: "Bio" },
                      { key: "showStats", label: "Stats overview" },
                      { key: "showDistributionals", label: "Distributionals" },
                      { key: "showCourses", label: "Course list" },
                    ] as const
                  ).map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/[0.06] cursor-pointer"
                    >
                      <span className="text-xs text-gray-700 dark:text-gray-300">{label}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={resolvedVisibility[key]}
                        disabled={savingVisibility}
                        onClick={() =>
                          updateVisibility({ [key]: !resolvedVisibility[key] })
                        }
                        className={`relative w-9 h-5 rounded-full transition-colors ${
                          resolvedVisibility[key]
                            ? "bg-pink-500"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                            resolvedVisibility[key] ? "translate-x-4" : ""
                          }`}
                        />
                      </button>
                    </label>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <div className="flex justify-end mb-5">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          data-tour="friends-add"
          className="px-3 py-1.5 bg-gradient-to-br from-pink-600 to-pink-700 hover:from-pink-500 hover:to-pink-600 text-white rounded-lg transition-all flex items-center gap-1.5 text-xs font-medium shadow-[0_2px_8px_rgba(236,72,153,0.25)]"
          onClick={() => setShowSearchModal(true)}
        >
          <FiUserPlus size={13} />
          Add Friend
        </motion.button>
      </div>

      {!ready && (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 shadow-neu"
              >
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-6 w-10" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 shadow-neu">
              <Skeleton className="h-3 w-36 mb-3" />
              <div className="space-y-2">
                <RequestCardSkeleton />
                <RequestCardSkeleton />
              </div>
            </div>
            <div className="p-3 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 shadow-neu">
              <Skeleton className="h-3 w-28 mb-3" />
              <div className="space-y-2">
                <RequestCardSkeleton />
              </div>
            </div>
          </div>

          <div>
            <Skeleton className="h-3 w-44 mb-4" />
            <div className="space-y-2.5">
              <FriendCardSkeleton />
              <FriendCardSkeleton />
              <FriendCardSkeleton />
            </div>
          </div>
        </div>
      )}

      {ready && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <FriendStatCard
              label="Friends"
              value={friendProfiles.length}
              color="text-pink-600 dark:text-pink-300"
            />
            <FriendStatCard
              label="Pending (in)"
              value={incomingRequests.length}
              color="text-emerald-600 dark:text-emerald-300"
              tooltip="Friend requests other Yale students have sent you."
            />
            <FriendStatCard
              label="Pending (out)"
              value={sentRequests.length}
              color="text-blue-600 dark:text-blue-300"
              tooltip="Friend requests you've sent that are awaiting acceptance."
            />
          </div>

          {(incomingRequests.length > 0 || sentRequests.length > 0) && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6"
              >
                {incomingRequests.length > 0 && (
                  <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.06] shadow-neu">
                    <SectionHeading
                      icon={<FiMail size={11} />}
                      label="Incoming Requests"
                      count={incomingRequests.length}
                      accent="text-emerald-600 dark:text-emerald-400"
                    />
                    <div className="space-y-1.5">
                      {(showAllIncoming
                        ? incomingRequests
                        : incomingRequests.slice(0, 4)
                      ).map((req) => {
                        const sender = userProfilesById[req.from] || {
                          uid: req.from,
                          majors: [],
                        };
                        return (
                          <motion.div
                            key={req.id}
                            layout
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/[0.06] hover:border-emerald-300 dark:hover:border-emerald-500/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar
                                photoURL={sender.photoURL}
                                displayName={sender.displayName}
                                size={24}
                              />
                              <span className="text-xs text-gray-800 dark:text-gray-200 truncate font-medium">
                                {getDisplayName(sender)}
                              </span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 hover:bg-emerald-500/30 transition border border-emerald-500/30"
                                onClick={() => acceptFriendRequest(req)}
                                title="Accept"
                              >
                                <FiCheck size={10} />
                              </button>
                              <button
                                className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/25 transition border border-red-500/20"
                                onClick={() => rejectFriendRequest(req)}
                                title="Decline"
                              >
                                <FiX size={10} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                      {incomingRequests.length > 4 && (
                        <button
                          type="button"
                          onClick={() => setShowAllIncoming((v) => !v)}
                          className="text-[10px] text-emerald-500 dark:text-emerald-400 hover:underline pt-0.5"
                        >
                          {showAllIncoming
                            ? "Show less"
                            : `View all ${incomingRequests.length} requests`}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {sentRequests.length > 0 && (
                  <div className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.06] shadow-neu">
                    <SectionHeading
                      icon={<FiUserCheck size={11} />}
                      label="Sent Requests"
                      count={sentRequests.length}
                      accent="text-blue-600 dark:text-blue-400"
                    />
                    <div className="space-y-1.5">
                      {(showAllSent
                        ? sentRequests
                        : sentRequests.slice(0, 4)
                      ).map((req) => {
                        const recipient = userProfilesById[req.to] || {
                          uid: req.to,
                          majors: [],
                        };
                        return (
                          <motion.div
                            key={req.id}
                            layout
                            initial={{ opacity: 0, x: 6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 6 }}
                            className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/[0.06] hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <UserAvatar
                                photoURL={recipient.photoURL}
                                displayName={recipient.displayName}
                                size={24}
                              />
                              <div className="min-w-0">
                                <div className="text-xs text-gray-800 dark:text-gray-200 truncate font-medium">
                                  {getDisplayName(recipient)}
                                </div>
                                <div className="text-[10px] text-blue-400 dark:text-blue-500">
                                  Pending
                                </div>
                              </div>
                            </div>
                            <button
                              className="p-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] text-gray-400 dark:text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition border border-gray-200 dark:border-white/[0.08]"
                              onClick={() => cancelSentRequest(req.id)}
                              title="Cancel request"
                            >
                              <FiX size={10} />
                            </button>
                          </motion.div>
                        );
                      })}
                      {sentRequests.length > 4 && (
                        <button
                          type="button"
                          onClick={() => setShowAllSent((v) => !v)}
                          className="text-[10px] text-blue-500 dark:text-blue-400 hover:underline pt-0.5"
                        >
                          {showAllSent
                            ? "Show less"
                            : `View all ${sentRequests.length} requests`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}

          <FriendsSearchModal
            show={showSearchModal}
            searchTerm={searchTerm}
            onSearchTermChange={setSearchTerm}
            onClose={closeSearchModal}
            filteredUsers={filteredUsers}
            onSendRequest={(uid) => sendFriendRequest(uid, closeSearchModal)}
            profileShareUrl={profileShareUrl}
          />

          <section>
            <SectionHeading
              icon={<FiUsers size={11} />}
              label="Your Friends"
              count={friendProfiles.length}
              accent="text-pink-600 dark:text-pink-400"
            />

            {friendProfiles.length === 0 && (
              <EmptyState
                icon={<FiUsers className="w-7 h-7 text-gray-300 dark:text-gray-500" />}
                title="No friends yet"
                description="Add your froco, an upperclassman in your major, or anyone whose path you want to learn from."
                primaryAction={{
                  label: "Add friend",
                  onClick: () => setShowSearchModal(true),
                }}
              />
            )}

            <AnimatePresence>
              <div className="space-y-2.5">
                {friendProfiles.map((f, idx) => {
                  const friend = friends.find((fr) => fr.users.includes(f.uid));
                  if (!friend) return null;

                  return (
                    <motion.div
                      key={f.uid}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4, scale: 0.98 }}
                      transition={{ delay: idx * 0.04 }}
                      whileHover={{ y: -1 }}
                      className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.06] hover:border-pink-300 dark:hover:border-pink-500/40 transition-all shadow-neu"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <UserAvatar
                          photoURL={f.photoURL}
                          displayName={f.displayName}
                          size={38}
                        />
                        <div className="min-w-0">
                          <div className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                            {getDisplayName(f)}
                          </div>
                          <div className="text-[10px] text-gray-400 dark:text-gray-500 flex items-center gap-1 flex-wrap mt-0.5">
                            {f.majors?.length > 0 && (
                              <span className="text-pink-500 dark:text-pink-400">
                                {f.majors.join(", ")}
                              </span>
                            )}
                            {f.majors?.length > 0 && f.graduationYear && (
                              <span className="text-gray-300 dark:text-gray-700">·</span>
                            )}
                            {f.graduationYear && (
                              <YearBadge graduationYear={f.graduationYear} noPadding />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link
                          href={`/user/${f.uid}`}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium bg-gray-50 dark:bg-white/[0.04] text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-pink-50 dark:hover:bg-pink-500/20 hover:text-pink-600 dark:hover:text-pink-200 hover:border-pink-200 dark:hover:border-pink-500/40 transition-all"
                        >
                          <FiUser size={11} />
                          Profile
                        </Link>
                        <FriendActionsDropdown
                          friend={friend}
                          profile={f}
                          onRemove={setRemoveFriendTarget}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </section>
        </>
      )}

      <AnimatePresence>
        {removeFriendTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isRemovingFriend) {
                setRemoveFriendTarget(null);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.10] rounded-xl p-5 max-w-sm w-full shadow-[0_8px_48px_rgba(0,0,0,0.5)]"
            >
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Remove {getDisplayName(removeFriendTarget.profile)}?
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                They will no longer appear in your friends list. You can send a
                new request later.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setRemoveFriendTarget(null)}
                  disabled={isRemovingFriend}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!removeFriendTarget.friend.id) return;
                    setIsRemovingFriend(true);
                    try {
                      await removeFriend(removeFriendTarget.friend.id);
                      setRemoveFriendTarget(null);
                    } finally {
                      setIsRemovingFriend(false);
                    }
                  }}
                  disabled={isRemovingFriend}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {isRemovingFriend ? "Removing..." : "Remove friend"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDisableConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={(e) => {
              if (e.target === e.currentTarget && !isDisabling) {
                setShowDisableConfirm(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 backdrop-blur-2xl border border-gray-200 dark:border-white/[0.10] rounded-xl p-5 max-w-sm w-full shadow-[0_8px_48px_rgba(0,0,0,0.5)]"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-xl border border-red-500/20">
                  <FiAlertTriangle className="text-red-500" size={18} />
                </div>
                <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                  Disable Friends Feature?
                </h3>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 leading-relaxed">
                This will{" "}
                <strong className="text-red-500 dark:text-red-400">
                  remove all your friends
                </strong>
                , pending requests, and hide your courses from others. You can re-enable
                later, but you'll need to add friends again.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  disabled={isDisabling}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/[0.08] hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-700 dark:text-gray-300 text-sm disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    setIsDisabling(true);
                    try {
                      await onToggleFriends(false);
                      toast.success("Friends feature disabled");
                      setShowDisableConfirm(false);
                    } catch {
                      toast.error("Failed to disable friends feature");
                    } finally {
                      setIsDisabling(false);
                    }
                  }}
                  disabled={isDisabling}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50 flex items-center gap-1.5 transition"
                >
                  {isDisabling ? (
                    <>
                      <span className="animate-spin h-3 w-3 border-2 border-white/30 border-t-white rounded-full" />
                      Disabling...
                    </>
                  ) : (
                    "Disable & Remove Friends"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
