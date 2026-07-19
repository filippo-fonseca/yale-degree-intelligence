"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  addDoc,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import {
  FiUserPlus,
  FiUsers,
  FiCheck,
  FiX,
  FiSearch,
  FiUser,
  FiUserCheck,
  FiMail,
  FiCopy,
  FiMoreVertical,
  FiToggleLeft,
  FiToggleRight,
  FiAlertTriangle,
  FiInfo,
  FiExternalLink,
  FiSettings,
  FiChevronDown,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Panda } from "lucide-react";
import { YearBadge } from "../ui/YearBadge";
import { UserAvatar } from "../ui/UserAvatar";
import { Skeleton } from "../ui/Skeleton";
import { EmptyState } from "../ui/EmptyState";
import { Course, FriendsProfileVisibility, resolveFriendsProfileVisibility } from "@/lib/types";
import { PublicProfileView } from "@/components/FriendsProfile/PublicProfileView";
import {
  DEMO_PREVIEW_COURSES,
  DEMO_PREVIEW_USER,
} from "@/components/FriendsProfile/demoPreviewData";

type UserProfile = {
  uid: string;
  displayName?: string;
  photoURL?: string;
  majors: string[];
  graduationYear?: number;
};

type FriendRequest = {
  id: string;
  from: string;
  to: string;
  status: "pending" | "accepted" | "rejected";
  timestamp?: any;
};

type Friend = {
  id: string;
  users: string[]; // [userId, userId]
  createdAt?: any;
};

function getDisplayName(profile: UserProfile) {
  if (profile.displayName) return profile.displayName;
  return "Yale Student";
}

function getInitials(profile: UserProfile): string {
  const name = profile.displayName || "Y";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function CopyButton({ profileUrl }: { profileUrl: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-semibold text-pink-500 hover:text-pink-600 dark:hover:text-pink-200 underline hover:no-underline transition"
    >
      {copied ? (
        <>
          <span>Copied!</span>
          <FiCheck className="inline-block" />
        </>
      ) : (
        <>
          <span>Click to copy this link</span>
          <FiCopy className="inline-block" />
        </>
      )}
    </button>
  );
}

/* ─── Skeleton primitives (built on the shared shimmer primitive) ─── */
const FriendCardSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 border border-gray-200 dark:border-white/[0.06] shadow-neu">
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 w-9" rounded="rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="h-2.5 w-24" />
      </div>
    </div>
    <Skeleton className="h-7 w-24" />
  </div>
);

const RequestCardSkeleton = () => (
  <div className="flex items-center justify-between p-2.5 rounded-lg bg-gray-100/60 dark:bg-white/[0.03] border border-gray-200/60 dark:border-white/[0.06]">
    <div className="flex items-center gap-2">
      <Skeleton className="h-6 w-6" rounded="rounded-full" />
      <Skeleton className="h-3 w-28" />
    </div>
    <div className="flex gap-1.5">
      <Skeleton className="h-6 w-6" rounded="rounded-md" />
      <Skeleton className="h-6 w-6" rounded="rounded-md" />
    </div>
  </div>
);

/* ─── Stat card matching MajorStatCard design ─── */
function FriendStatCard({
  label,
  value,
  color = "text-gray-900 dark:text-white",
  tooltip,
}: {
  label: string;
  value: string | number;
  color?: string;
  tooltip?: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      className="p-3 rounded-xl bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200 dark:border-white/[0.06] hover:border-gray-300 dark:hover:border-white/[0.12] transition-all relative shadow-neu"
    >
      {tooltip && (
        <div className="absolute top-2 right-2 group">
          <FiInfo className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          <div className="absolute z-10 right-0 w-44 p-2 text-[11px] text-gray-700 dark:text-gray-300 bg-white dark:bg-[#0c0c0e]/95 backdrop-blur-sm rounded-lg border border-gray-200 dark:border-white/[0.08] shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
            {tooltip}
          </div>
        </div>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
      <p className={`text-lg font-medium mt-0.5 ${color}`}>{value}</p>
    </motion.div>
  );
}

/* ─── Section header ─── */
function SectionHeading({
  icon,
  label,
  count,
  accent = "text-gray-700 dark:text-gray-300",
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  accent?: string;
}) {
  return (
    <h3
      className={`text-xs font-semibold uppercase tracking-wider mb-2.5 flex items-center gap-1.5 ${accent}`}
    >
      {icon}
      {label}
      {count !== undefined && (
        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400 text-[10px] font-medium border border-gray-200 dark:border-white/[0.08]">
          {count}
        </span>
      )}
    </h3>
  );
}

type FriendsUserProfile = {
  majors: string[];
  graduationYear?: number;
  bio?: string;
};

interface FriendsTabProps {
  friendsEnabled: boolean;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  courses: Course[];
  userProfile: FriendsUserProfile | null;
}

export default function FriendsTab({
  friendsEnabled,
  onToggleFriends,
  courses,
  userProfile,
}: FriendsTabProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [isEnabling, setIsEnabling] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [userProfilesById, setUserProfilesById] = useState<Record<string, UserProfile>>({});
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setSearchTerm("");
        setShowSearchModal(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [hydrated, setHydrated] = useState({
    publicProfiles: false,
    friends: false,
    sent: false,
    incoming: false,
  });
  const ready =
    hydrated.publicProfiles && hydrated.friends && hydrated.sent && hydrated.incoming;

  useEffect(() => {
    if (!user) return;

    const publicProfilesUnsub = onSnapshot(
      query(collection(db, "friends_public_data"), where("enabled", "==", true)),
      (snapshot) => {
        const users: UserProfile[] = [];
        const byId: Record<string, UserProfile> = {};
        snapshot.forEach((d) => {
          const data = d.data();
          const p: UserProfile = {
            uid: d.id,
            displayName: data.displayName,
            photoURL: data.photoURL,
            majors: data.majors || [],
            graduationYear: data.graduationYear,
          };
          users.push(p);
          byId[d.id] = p;
        });
        setAllUsers(users);
        setUserProfilesById(byId);
        setHydrated((h) => ({ ...h, publicProfiles: true }));
      },
    );

    const friendsUnsub = onSnapshot(
      query(collection(db, "friends"), where("users", "array-contains", user.uid)),
      (snapshot) => {
        const frs: Friend[] = [];
        snapshot.forEach((d) => frs.push({ ...(d.data() as Friend), id: d.id }));
        setFriends(frs);
        setHydrated((h) => ({ ...h, friends: true }));
      },
    );

    const sentRequestsUnsub = onSnapshot(
      query(
        collection(db, "friend-requests"),
        where("from", "==", user.uid),
        where("status", "==", "pending"),
      ),
      (snapshot) => {
        const sent: FriendRequest[] = [];
        snapshot.forEach((d) =>
          sent.push({ id: d.id, ...(d.data() as Omit<FriendRequest, "id">) }),
        );
        setSentRequests(sent);
        setHydrated((h) => ({ ...h, sent: true }));
      },
    );

    const incomingRequestsUnsub = onSnapshot(
      query(
        collection(db, "friend-requests"),
        where("to", "==", user.uid),
        where("status", "==", "pending"),
      ),
      (snapshot) => {
        const inc: FriendRequest[] = [];
        snapshot.forEach((d) =>
          inc.push({ id: d.id, ...(d.data() as Omit<FriendRequest, "id">) }),
        );
        setIncomingRequests(inc);
        setHydrated((h) => ({ ...h, incoming: true }));
      },
    );

    return () => {
      publicProfilesUnsub();
      friendsUnsub();
      sentRequestsUnsub();
      incomingRequestsUnsub();
    };
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const profiles = friends
      .map((fr) => fr.users.find((id) => id !== user.uid))
      .filter(Boolean)
      .map(
        (id) =>
          userProfilesById[id as string] || {
            uid: id as string,
            majors: [],
          },
      ) as UserProfile[];
    setFriendProfiles(profiles);
  }, [friends, userProfilesById, user]);

  const sendFriendRequest = async (toId: string) => {
    if (!user) return;
    setShowSearchModal(false);
    setSearchTerm("");

    if (toId === user.uid) {
      toast.error("You can't send a friend request to yourself");
      return;
    }
    if (friends.some((fr) => fr.users.includes(toId))) {
      toast.error("You're already friends with this user");
      return;
    }
    if (sentRequests.some((req) => req.to === toId)) {
      toast.error("Friend request already sent");
      return;
    }
    if (incomingRequests.some((req) => req.from === toId)) {
      toast.error("This user has already sent you a friend request");
      return;
    }

    try {
      await addDoc(collection(db, "friend-requests"), {
        from: user.uid,
        to: toId,
        status: "pending",
        timestamp: serverTimestamp(),
      });
      toast.success("Friend request sent!");
    } catch (error) {
      console.error("Error sending friend request:", error);
      toast.error("Failed to send friend request");
    }
  };

  const acceptFriendRequest = async (req: FriendRequest) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/friends/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ requestId: req.id }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to accept friend request");
      }
      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to accept friend request"
      );
    }
  };

  const rejectFriendRequest = async (req: FriendRequest) => {
    try {
      await setDoc(doc(db, "friend-requests", req.id), { ...req, status: "rejected" });
      toast.success("Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to reject friend request");
    }
  };

  const removeFriend = async (friendId: string) => {
    if (!user) return;
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/friends/remove", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ friendId }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to remove friend");
      }
      toast.success("Friend removed");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to remove friend"
      );
    }
  };

  const cancelSentRequest = async (requestId: string) => {
    try {
      await deleteDoc(doc(db, "friend-requests", requestId));
      toast.success("Friend request cancelled");
    } catch (error) {
      console.error("Error cancelling friend request:", error);
      toast.error("Failed to cancel friend request");
    }
  };

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showAllIncoming, setShowAllIncoming] = useState(false);
  const [showAllSent, setShowAllSent] = useState(false);
  const [removeFriendTarget, setRemoveFriendTarget] = useState<{
    friend: Friend;
    profile: UserProfile;
  } | null>(null);
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [profileVisibility, setProfileVisibility] =
    useState<FriendsProfileVisibility>({});
  const [savingVisibility, setSavingVisibility] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "friends_public_data", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileVisibility(data.visibility || {});
      }
    });
    return () => unsub();
  }, [user]);

  const resolvedVisibility = resolveFriendsProfileVisibility(profileVisibility);

  const updateVisibility = async (patch: Partial<FriendsProfileVisibility>) => {
    if (!user) return;
    const next = { ...profileVisibility, ...patch };
    setProfileVisibility(next);
    setSavingVisibility(true);
    try {
      await setDoc(
        doc(db, "friends_public_data", user.uid),
        { visibility: next, enabled: true },
        { merge: true },
      );
    } catch (error) {
      console.error("Error saving visibility:", error);
      toast.error("Failed to save visibility settings");
    } finally {
      setSavingVisibility(false);
    }
  };


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

  /* ─── Unauthenticated state ─── */
  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto font-louize">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-medium text-gray-900 dark:text-white">
          Friends & Connections
        </h2>
        <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Please sign in to view your friends.
        </p>
      </div>
    );
  }

  /* ─── Feature disabled / opt-in prompt ─── */
  if (!friendsEnabled) {
    return (
      <div className="w-full max-w-3xl mx-auto font-louize">
        <div className="mb-6">
          <h2 className="text-2xl font-medium text-gray-900 dark:text-white">Friends</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            See how older students in your major built their path — courses and
            distributionals, never grades.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Demo preview */}
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

          {/* What's shared */}
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
            className="w-full px-6 py-3.5 bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white text-sm rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(236,72,153,0.3)]"
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

  /* ─── Main view ─── */
  return (
    <div className="w-full max-w-3xl mx-auto font-louize">
      {/* Purpose strip */}
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

      {/* Your public page */}
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

      {/* Actions row */}
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

      {/* Loading skeletons */}
      {!ready && (
        <div className="space-y-8">
          {/* Stat cards row */}
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

          {/* Request skeletons */}
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

          {/* Friend list skeletons */}
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

      {/* Hydrated content */}
      {ready && (
        <>
          {/* Stats row */}
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

          {/* Requests section */}
          {(incomingRequests.length > 0 || sentRequests.length > 0) && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6"
              >
                {/* Incoming */}
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

                {/* Sent */}
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

          {/* Add friend search modal */}
          <AnimatePresence>
            {showSearchModal && (
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
                  {/* Modal header */}
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
                      onClick={() => {
                        setSearchTerm("");
                        setShowSearchModal(false);
                      }}
                      className="p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition"
                    >
                      <FiX size={15} />
                    </button>
                  </div>

                  {/* Search input */}
                  <div className="relative mb-3">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-pink-400 w-3.5 h-3.5 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-gray-200 focus:outline-none focus:ring-1 focus:ring-pink-500/50 focus:border-pink-500/50 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      placeholder="Your best friend, or that upperclassman..."
                      autoFocus
                    />
                  </div>

                  {/* Results */}
                  <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 pr-0.5">
                    {searchTerm.length === 0 ? (
                      <NoFriendsResult />
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
                            onClick={() => sendFriendRequest(u.uid)}
                          >
                            <FiUserPlus size={11} />
                            Add
                          </button>
                        </motion.div>
                      ))
                    ) : (
                      <NoFriendsResult />
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Friends list */}
          <section>
            <SectionHeading
              icon={<FiUsers size={11} />}
              label="Your Friends"
              count={friendProfiles.length}
              accent="text-pink-600 dark:text-pink-400"
            />

            {/* Empty state */}
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

            {/* Friend cards */}
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
                        <FriendActionsDropdown friend={friend} profile={f} />
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </AnimatePresence>
          </section>
        </>
      )}

      {/* Remove friend confirmation modal */}
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

      {/* Disable confirmation modal */}
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

  /* ─── Inner helpers ─── */

  function NoFriendsResult() {
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

  function MoreOptionsDropdown({ onDisable }: { onDisable: () => void }) {
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
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/[0.06] text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
          aria-label="More options"
        >
          <FiMoreVertical size={16} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.97 }}
              className="absolute left-0 bottom-full mb-2 w-52 bg-white dark:bg-[#0c0c0e] backdrop-blur-2xl rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.2)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-20 border border-gray-200 dark:border-white/[0.08] overflow-hidden"
            >
              <button
                onClick={() => {
                  onDisable();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/15 transition-colors"
              >
                <FiToggleLeft size={14} />
                Disable Friends Feature
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  function FriendActionsDropdown({
    friend,
    profile,
  }: {
    friend: Friend;
    profile: UserProfile;
  }) {
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
                  setRemoveFriendTarget({ friend, profile });
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
}
