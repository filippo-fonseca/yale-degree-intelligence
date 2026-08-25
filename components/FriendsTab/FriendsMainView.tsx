"use client";

import { useCallback, useState, type ReactNode } from "react";
import Link from "next/link";
import { FiCheck, FiUserPlus, FiX } from "react-icons/fi";
import { AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";
import type { User } from "firebase/auth";
import { Course, FriendsProfileVisibility } from "@/lib/types";
import { YearBadge } from "../ui/YearBadge";
import { UserAvatar } from "../ui/UserAvatar";
import { ShinyButton } from "../ui/shiny-button";
import { GhostButton } from "../ui/ghost-button";
import { FriendCardSkeleton, RequestCardSkeleton } from "./friendsUiPrimitives";
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
import { PublicPageCard } from "./PublicPageCard";

/**
 * Friends, once it is on.
 *
 * Rebuilt in the v3 system. What changed, beyond surfaces:
 *
 * - The three coloured stat cards are gone. "Friends 3 / Pending (in) 1 /
 *   Pending (out) 2" took the top third of the tab to say what the section
 *   headings below it already said, in three different hues. It is one mono
 *   line now.
 * - Incoming and sent requests were two side-by-side panels, each with its own
 *   accent colour, both present whenever either had anything in it. They are
 *   one Requests section now, incoming first because that is the one that
 *   needs an answer, and the section disappears entirely when it is empty.
 * - Add friend is in the header, where the tab's primary action belongs,
 *   instead of floating between the page card and the stats.
 */

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

/** Mono section label, matching the window bars elsewhere in v3. */
function SectionLabel({
  children,
  count,
}: {
  children: ReactNode;
  count?: number;
}) {
  return (
    <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
      {children}
      {count !== undefined && count > 0 && (
        <span className="ml-1.5 text-gray-500 dark:text-gray-400">{count}</span>
      )}
    </p>
  );
}

/** The v3 dialog shell, shared by the two confirmations on this tab. */
function ConfirmDialog({
  title,
  icon,
  children,
  onClose,
  busy,
  actions,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  busy: boolean;
  actions: ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4 font-louize backdrop-blur-md dark:bg-black/75"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 6 }}
        transition={{ duration: 0.2, ease: [0.25, 1, 0.5, 1] }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] dark:border-white/[0.09] dark:bg-[#101013]"
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            {icon}
            <div className="min-w-0">
              <h3 className="text-[1.15rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
                {title}
              </h3>
              <div className="mt-2 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                {children}
              </div>
            </div>
          </div>
          <div className="mt-5 flex items-center justify-end gap-2 font-sf">
            {actions}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** Destructive primary. The shiny pill is for the good path only. */
function DangerButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 rounded-full border border-red-600 bg-red-600 px-4 py-2 font-sf text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

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
        (u.majors || [])
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase())),
  );

  const closeSearchModal = useCallback(() => {
    setSearchTerm("");
    setShowSearchModal(false);
  }, []);

  const hasRequests = incomingRequests.length > 0 || sentRequests.length > 0;

  /** The counts, as one line rather than three cards. */
  const summary = [
    `${friendProfiles.length} ${friendProfiles.length === 1 ? "friend" : "friends"}`,
    incomingRequests.length > 0 ? `${incomingRequests.length} to answer` : null,
    sentRequests.length > 0 ? `${sentRequests.length} waiting on them` : null,
  ]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="mx-auto w-full max-w-3xl font-louize">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
            Friends
          </h2>
          <p className="mt-1 max-w-[56ch] font-sf text-sm text-gray-500 dark:text-gray-400">
            See how other Yalies built their path: courses and distributionals,
            never grades.
          </p>
          {ready && (
            <p className="mt-2 font-mono text-[11px] tracking-tight text-gray-400 dark:text-gray-500">
              {summary}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5 font-sf">
          <div data-tour="friends-add">
            <ShinyButton size="sm" onClick={() => setShowSearchModal(true)}>
              <FiUserPlus size={13} />
              Add friend
            </ShinyButton>
          </div>
          <MoreOptionsDropdown onDisable={() => setShowDisableConfirm(true)} />
        </div>
      </div>

      <PublicPageCard
        user={user}
        userProfile={userProfile}
        shareUrl={profileShareUrl}
        resolvedVisibility={resolvedVisibility}
        savingVisibility={savingVisibility}
        updateVisibility={updateVisibility}
        showCustomize={showCustomize}
        onToggleCustomize={() => setShowCustomize((v) => !v)}
      />

      {!ready && (
        <div className="mt-6 space-y-2.5">
          <RequestCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
          <FriendCardSkeleton />
        </div>
      )}

      {ready && (
        <>
          {hasRequests && (
            <section className="mt-7">
              <SectionLabel count={incomingRequests.length + sentRequests.length}>
                Requests
              </SectionLabel>

              <div className="space-y-2">
                <AnimatePresence initial={false}>
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
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white p-3 dark:border-white/[0.07] dark:bg-white/[0.03]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            photoURL={sender.photoURL}
                            displayName={sender.displayName}
                            size={32}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getDisplayName(sender)}
                            </p>
                            <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                              wants to be friends
                            </p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5 font-sf">
                          <button
                            onClick={() => acceptFriendRequest(req)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-600 bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
                          >
                            <FiCheck size={12} />
                            Accept
                          </button>
                          <button
                            onClick={() => rejectFriendRequest(req)}
                            title="Decline"
                            aria-label="Decline"
                            className="rounded-full border border-black/10 p-2 text-gray-400 transition-colors hover:text-red-500 dark:border-white/15 dark:text-gray-500 dark:hover:text-red-400"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>

                {incomingRequests.length > 4 && (
                  <button
                    type="button"
                    onClick={() => setShowAllIncoming((v) => !v)}
                    className="font-sf text-xs text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {showAllIncoming
                      ? "Show fewer"
                      : `Show all ${incomingRequests.length} incoming`}
                  </button>
                )}

                {/* Sent requests are quieter: nothing is being asked of you. */}
                <AnimatePresence initial={false}>
                  {(showAllSent ? sentRequests : sentRequests.slice(0, 3)).map(
                    (req) => {
                      const recipient = userProfilesById[req.to] || {
                        uid: req.to,
                        majors: [],
                      };
                      return (
                        <motion.div
                          key={req.id}
                          layout
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-black/[0.08] px-3 py-2.5 dark:border-white/[0.09]"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <UserAvatar
                              photoURL={recipient.photoURL}
                              displayName={recipient.displayName}
                              size={26}
                            />
                            <p className="truncate font-sf text-sm text-gray-500 dark:text-gray-400">
                              {getDisplayName(recipient)}
                              <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
                                sent
                              </span>
                            </p>
                          </div>
                          <button
                            onClick={() => cancelSentRequest(req.id)}
                            title="Cancel request"
                            aria-label="Cancel request"
                            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                          >
                            <FiX size={12} />
                          </button>
                        </motion.div>
                      );
                    },
                  )}
                </AnimatePresence>

                {sentRequests.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setShowAllSent((v) => !v)}
                    className="font-sf text-xs text-gray-500 underline underline-offset-2 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                  >
                    {showAllSent
                      ? "Show fewer"
                      : `Show all ${sentRequests.length} sent`}
                  </button>
                )}
              </div>
            </section>
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

          <section className="mt-7">
            <SectionLabel count={friendProfiles.length}>
              Your friends
            </SectionLabel>

            {friendProfiles.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-black/[0.12] p-8 text-center dark:border-white/[0.12]">
                <p className="font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                  No friends yet.
                </p>
                <p className="mx-auto mt-1.5 max-w-[46ch] font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  Add your froco, an upperclassman in your major, or anyone
                  whose path you want to learn from.
                </p>
                <div className="mt-4 flex justify-center font-sf">
                  <ShinyButton
                    size="sm"
                    onClick={() => setShowSearchModal(true)}
                  >
                    <FiUserPlus size={13} />
                    Add friend
                  </ShinyButton>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <AnimatePresence initial={false}>
                  {friendProfiles.map((f, idx) => {
                    const friend = friends.find((fr) =>
                      fr.users.includes(f.uid),
                    );
                    if (!friend) return null;

                    return (
                      <motion.div
                        key={f.uid}
                        layout
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ delay: Math.min(idx * 0.03, 0.2) }}
                        className="flex items-center justify-between gap-3 rounded-xl border border-black/[0.06] bg-white p-3 transition-colors hover:border-black/[0.12] dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/[0.14]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            photoURL={f.photoURL}
                            displayName={f.displayName}
                            size={36}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                              {getDisplayName(f)}
                            </p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 font-sf text-xs text-gray-500 dark:text-gray-400">
                              {f.majors?.length > 0 && (
                                <span className="truncate">
                                  {f.majors.join(", ")}
                                </span>
                              )}
                              {f.majors?.length > 0 && f.graduationYear && (
                                <span className="text-gray-300 dark:text-gray-600">
                                  ·
                                </span>
                              )}
                              {f.graduationYear && (
                                <YearBadge
                                  graduationYear={f.graduationYear}
                                  noPadding
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-1.5 font-sf">
                          <Link
                            href={`/user/${f.uid}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white"
                          >
                            View page
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
                </AnimatePresence>
              </div>
            )}
          </section>
        </>
      )}

      <AnimatePresence>
        {removeFriendTarget && (
          <ConfirmDialog
            title={`Remove ${getDisplayName(removeFriendTarget.profile)}?`}
            busy={isRemovingFriend}
            onClose={() => setRemoveFriendTarget(null)}
            actions={
              <>
                <GhostButton onClick={() => setRemoveFriendTarget(null)}>
                  Cancel
                </GhostButton>
                <DangerButton
                  disabled={isRemovingFriend}
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
                >
                  {isRemovingFriend ? "Removing..." : "Remove friend"}
                </DangerButton>
              </>
            }
          >
            They will no longer appear in your friends list, and neither of you
            will see the other&apos;s page. You can send a new request later.
          </ConfirmDialog>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showDisableConfirm && (
          <ConfirmDialog
            title="Turn Friends off?"
            busy={isDisabling}
            onClose={() => setShowDisableConfirm(false)}
            icon={
              <span className="mt-0.5 shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 p-2 text-red-500">
                <AlertTriangle className="h-4 w-4" />
              </span>
            }
            actions={
              <>
                <GhostButton onClick={() => setShowDisableConfirm(false)}>
                  Cancel
                </GhostButton>
                <DangerButton
                  disabled={isDisabling}
                  onClick={async () => {
                    setIsDisabling(true);
                    try {
                      await onToggleFriends(false);
                      toast.success("Friends is off.");
                      setShowDisableConfirm(false);
                    } catch {
                      toast.error("Could not turn Friends off. Try again?");
                    } finally {
                      setIsDisabling(false);
                    }
                  }}
                >
                  {isDisabling ? "Turning it off..." : "Turn off and remove"}
                </DangerButton>
              </>
            }
          >
            This removes{" "}
            <span className="font-medium text-red-500 dark:text-red-400">
              all of your friends
            </span>{" "}
            and every pending request, and hides your page. You can turn it back
            on later, but you will have to add everyone again.
          </ConfirmDialog>
        )}
      </AnimatePresence>
    </div>
  );
}
