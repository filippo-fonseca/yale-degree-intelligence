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
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Panda } from "lucide-react";
import { YearBadge } from "../ui/YearBadge";
import { InfoCard } from "../ui/InfoCard";

type UserProfile = {
  uid: string;
  displayName?: string;
  email?: string;
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
  if (profile.email) return profile.email.split("@")[0];
  return "Yale Student";
}

function ProfilePic({
  profile,
  size = 36,
}: {
  profile: UserProfile;
  size?: number;
}) {
  return profile.photoURL ? (
    <img
      src={profile.photoURL}
      alt={getDisplayName(profile)}
      className={`rounded-full object-cover border-2 border-gray-700`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white font-medium border-2 border-gray-700"
      style={{ width: size, height: size, fontSize: size / 2 }}
    >
      {getDisplayName(profile).charAt(0).toUpperCase()}
    </div>
  );
}

function CopyButton() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 font-semibold text-pink-500 hover:text-pink-200 underline hover:no-underline transition"
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

/** ---------- Skeletons ---------- **/
const Skeleton = ({ className = "" }: { className?: string }) => (
  <div
    className={`animate-pulse bg-gray-800/60 border border-gray-700 rounded-lg ${className}`}
  />
);

const FriendRowSkeleton = () => (
  <div className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-800">
    <div className="flex gap-4">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-28" />
      </div>
    </div>
    <Skeleton className="h-8 w-32" />
  </div>
);

const RequestRowSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800">
    <div className="flex items-center gap-2">
      <Skeleton className="h-7 w-7 rounded-full" />
      <Skeleton className="h-4 w-28" />
    </div>
    <div className="flex gap-1">
      <Skeleton className="h-7 w-7 rounded-md" />
      <Skeleton className="h-7 w-7 rounded-md" />
    </div>
  </div>
);

interface FriendsTabProps {
  friendsEnabled: boolean;
  onToggleFriends: (enabled: boolean) => Promise<void>;
}

export default function FriendsTab({
  friendsEnabled,
  onToggleFriends,
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
  const [userProfilesById, setUserProfilesById] = useState<
    Record<string, UserProfile>
  >({});
  // add friends modal:
  const modalRef = useRef<HTMLDivElement>(null);

  // 2️Handle clicks outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setSearchTerm("");
        setShowSearchModal(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Hydration flags to prevent flashing zeros/empties
  const [hydrated, setHydrated] = useState({
    users: false,
    friends: false,
    sent: false,
    incoming: false,
  });
  const ready =
    hydrated.users && hydrated.friends && hydrated.sent && hydrated.incoming;

  // Set up real-time listeners
  useEffect(() => {
    if (!user) return;

    // 1. Users listener
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const users: UserProfile[] = [];
      const byId: Record<string, UserProfile> = {};
      snapshot.forEach((d) => {
        const data = d.data() as UserProfile;
        const p = { ...data, uid: d.id };
        users.push(p);
        byId[d.id] = p;
      });
      setAllUsers(users);
      setUserProfilesById(byId);
      setHydrated((h) => ({ ...h, users: true }));
    });

    // 2. Friends listener
    const friendsUnsub = onSnapshot(
      query(
        collection(db, "friends"),
        where("users", "array-contains", user.uid)
      ),
      (snapshot) => {
        const frs: Friend[] = [];
        snapshot.forEach((d) => {
          frs.push({ ...(d.data() as Friend), id: d.id });
        });
        setFriends(frs);
        setHydrated((h) => ({ ...h, friends: true }));
      }
    );

    // 3. Sent requests listener
    const sentRequestsUnsub = onSnapshot(
      query(
        collection(db, "friend-requests"),
        where("from", "==", user.uid),
        where("status", "==", "pending")
      ),
      (snapshot) => {
        const sent: FriendRequest[] = [];
        snapshot.forEach((d) => {
          sent.push({
            id: d.id,
            ...(d.data() as Omit<FriendRequest, "id">),
          });
        });
        setSentRequests(sent);
        setHydrated((h) => ({ ...h, sent: true }));
      }
    );

    // 4. Incoming requests listener
    const incomingRequestsUnsub = onSnapshot(
      query(
        collection(db, "friend-requests"),
        where("to", "==", user.uid),
        where("status", "==", "pending")
      ),
      (snapshot) => {
        const inc: FriendRequest[] = [];
        snapshot.forEach((d) => {
          inc.push({
            id: d.id,
            ...(d.data() as Omit<FriendRequest, "id">),
          });
        });
        setIncomingRequests(inc);
        setHydrated((h) => ({ ...h, incoming: true }));
      }
    );

    return () => {
      usersUnsub();
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
      .map((id) => userProfilesById[id as string])
      .filter(Boolean) as UserProfile[];

    setFriendProfiles(profiles);
  }, [friends, userProfilesById, user]);

  // Send Friend Request
  const sendFriendRequest = async (toId: string) => {
    if (!user) return;

    // close modal + clear search
    setShowSearchModal(false);
    setSearchTerm("");

    // Don't allow sending to self or if already friends/requested
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

  // Accept Friend Request
  const acceptFriendRequest = async (req: FriendRequest) => {
    try {
      await setDoc(doc(db, "friend-requests", req.id), {
        ...req,
        status: "accepted",
      });

      const users = [req.from, req.to].sort();

      // Create the friends document
      await addDoc(collection(db, "friends"), {
        users,
        createdAt: serverTimestamp(),
      });

      // Also create friends_lookup for security rules
      const lookupId = `${users[0]}_${users[1]}`;
      await setDoc(doc(db, "friends_lookup", lookupId), {
        users,
        createdAt: serverTimestamp(),
      });

      toast.success("Friend request accepted!");
    } catch (error) {
      console.error("Error accepting friend request:", error);
      toast.error("Failed to accept friend request");
    }
  };

  // Reject Friend Request
  const rejectFriendRequest = async (req: FriendRequest) => {
    try {
      await setDoc(doc(db, "friend-requests", req.id), {
        ...req,
        status: "rejected",
      });
      toast.success("Friend request rejected");
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      toast.error("Failed to reject friend request");
    }
  };

  // Remove Friend
  const removeFriend = async (friendId: string) => {
    try {
      // Get the friend document to find the user IDs
      const friendDoc = friends.find((f) => f.id === friendId);
      if (friendDoc) {
        const users = [...friendDoc.users].sort();
        const lookupId = `${users[0]}_${users[1]}`;

        // Delete both friends and friends_lookup documents
        await deleteDoc(doc(db, "friends", friendId));
        await deleteDoc(doc(db, "friends_lookup", lookupId));
      } else {
        await deleteDoc(doc(db, "friends", friendId));
      }

      toast.success("Friend removed");
    } catch (error) {
      console.error("Error removing friend:", error);
      toast.error("Failed to remove friend");
    }
  };

  // Cancel Sent Request
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

  // UI Filtering
  const filteredUsers = allUsers.filter(
    (u) =>
      u.uid !== user?.uid &&
      !friends.some((fr) => fr.users.includes(u.uid)) &&
      !sentRequests.some((req) => req.to === u.uid) &&
      !incomingRequests.some((req) => req.from === u.uid) &&
      (u.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.majors.join(" ").toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (!user) {
    return (
      <div className="w-full max-w-3xl mx-auto font-louize">
        <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
          Friends & Connections
        </h2>
        <div className="mt-6 text-gray-300">
          Please sign in to view friends.
        </div>
      </div>
    );
  }

  // Show enable prompt when friends feature is disabled
  if (!friendsEnabled) {
    return (
      <div className="w-full max-w-3xl mx-auto font-louize">
        <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-6">
          Friends & Connections
        </h2>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 px-8 rounded-xl bg-gray-900/50 border border-gray-800"
        >
          <div className="p-4 rounded-full bg-pink-500/10 border border-pink-500/30 mb-6">
            <FiUsers className="w-12 h-12 text-pink-400" />
          </div>

          <h3 className="text-2xl font-medium text-gray-100 mb-3 text-center">
            Enable Friends Feature
          </h3>

          <p className="text-gray-400 text-center max-w-md mb-6">
            Connect with other Yale students to see what courses they've taken
            and get inspiration for your own academic journey. Your grades are{" "}
            <strong className="text-gray-300">never shared</strong> - only
            course codes, semesters, and credits.
          </p>

          <div className="bg-gray-800/50 rounded-lg p-4 mb-6 max-w-md border border-gray-700">
            <h4 className="text-sm font-medium text-gray-300 mb-2">
              What gets shared with friends:
            </h4>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Course codes (e.g., CPSC 201)</li>
              <li>• Semesters and years taken</li>
              <li>• Credit counts</li>
              <li>• Your major and graduation year</li>
            </ul>
            <p className="text-xs text-emerald-400 mt-3">
              Your grades and GPA are NEVER shared.
            </p>
          </div>

          <button
            onClick={async () => {
              setIsEnabling(true);
              try {
                await onToggleFriends(true);
                toast.success("Friends feature enabled!");
              } catch (error) {
                toast.error("Failed to enable friends feature");
              } finally {
                setIsEnabling(false);
              }
            }}
            disabled={isEnabling}
            className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isEnabling ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                Enabling...
              </>
            ) : (
              <>
                <FiToggleRight size={20} />
                Enable Friends Feature
              </>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto font-louize">
      <div className="flex items-center justify-between w-full mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
            Friends & Connections
          </h2>
          <MoreOptionsDropdown onDisable={() => setShowDisableConfirm(true)} />
        </div>
        <button
          className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-lg transition flex items-center gap-2 text-sm font-medium"
          onClick={() => setShowSearchModal(true)}
        >
          <FiUserPlus size={16} /> Add Friend
        </button>
      </div>

      <InfoCard className="mb-6" autoHide previewText="Why add friends?">
        The friends feature lets you see what classes your friends (or other
        Yale students you know) have taken.
        <br />
        <br />
        It’s useful if you're curious about someone in your year or just want to
        explore different academic paths, but we see it as <i>
          most powerful
        </i>{" "}
        when used to connect with people in your <strong>major</strong>,
        especially older students or a student in your year who has perhaps
        planned better (😅), for example, who have already walked the path
        you're striving to follow.
        <br />
        <br />
        See what courses they took, how they structured their academic journey,
        and get inspiration or guidance for planning your own (all while keeping
        it kinda fun and social).
        <br />
        <br />
        NOTE: Sensitive/private info and statistics such as your GPA are NEVER
        made public, not even to your friends. Only you can see them. In fact,
        they're processed locally on your device, so we don't even store them on
        our database.
      </InfoCard>

      {/* ---------- Loading skeletons (no more "0" flash) ---------- */}
      {!ready && (
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="md:w-1/3">
              <Skeleton className="h-6 w-48 mb-2" />
              <div className="space-y-2">
                <RequestRowSkeleton />
                <RequestRowSkeleton />
              </div>
            </div>
            <div className="md:w-1/3">
              <Skeleton className="h-6 w-40 mb-2" />
              <div className="space-y-2">
                <RequestRowSkeleton />
                <RequestRowSkeleton />
              </div>
            </div>
          </div>

          <section>
            <Skeleton className="h-6 w-56 mb-4" />
            <div className="space-y-3">
              <FriendRowSkeleton />
              <FriendRowSkeleton />
              <FriendRowSkeleton />
            </div>
          </section>
        </div>
      )}

      {/* ---------- Main content once hydrated ---------- */}
      {ready && (
        <>
          {/* Requests Section - only show if there are any */}
          {(incomingRequests.length > 0 || sentRequests.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Incoming Requests */}
              {incomingRequests.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <FiMail size={14} /> Incoming Requests ({incomingRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {incomingRequests.slice(0, 3).map((req) => {
                      const sender = userProfilesById[req.from];
                      if (!sender) return null;
                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <ProfilePic profile={sender} size={24} />
                            <span className="text-sm text-gray-200 truncate">
                              {getDisplayName(sender)}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              className="p-1.5 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/40 transition"
                              onClick={() => acceptFriendRequest(req)}
                              title="Accept"
                            >
                              <FiCheck size={12} />
                            </button>
                            <button
                              className="p-1.5 rounded bg-red-600/20 text-red-400 hover:bg-red-600/40 transition"
                              onClick={() => rejectFriendRequest(req)}
                              title="Reject"
                            >
                              <FiX size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {incomingRequests.length > 3 && (
                      <p className="text-xs text-gray-500 pt-1">
                        +{incomingRequests.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Sent Requests */}
              {sentRequests.length > 0 && (
                <div className="p-4 rounded-xl bg-gray-900/30 border border-gray-800">
                  <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                    <FiUserCheck size={14} /> Sent Requests ({sentRequests.length})
                  </h3>
                  <div className="space-y-2">
                    {sentRequests.slice(0, 3).map((req) => {
                      const recipient = userProfilesById[req.to];
                      if (!recipient) return null;
                      return (
                        <div
                          key={req.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-gray-800/50"
                        >
                          <div className="flex items-center gap-2">
                            <ProfilePic profile={recipient} size={24} />
                            <span className="text-sm text-gray-200 truncate">
                              {getDisplayName(recipient)}
                            </span>
                          </div>
                          <button
                            className="p-1.5 rounded bg-gray-700/50 text-gray-400 hover:bg-red-600/30 hover:text-red-400 transition"
                            onClick={() => cancelSentRequest(req.id)}
                            title="Cancel"
                          >
                            <FiX size={12} />
                          </button>
                        </div>
                      );
                    })}
                    {sentRequests.length > 3 && (
                      <p className="text-xs text-gray-500 pt-1">
                        +{sentRequests.length - 3} more
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Friend Search Modal */}
          <AnimatePresence>
            {showSearchModal && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="bg-gray-900 p-6 rounded-lg shadow-xl max-w-2xl w-full h-[400px] flex flex-col"
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.95, opacity: 0 }}
                  ref={modalRef}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-white">
                      Add a friend on DegreeIntelligence
                    </h3>
                    <button
                      onClick={() => {
                        setSearchTerm("");
                        setShowSearchModal(false);
                      }}
                      className="text-gray-400 hover:text-red-400 transition"
                    >
                      <FiX size={20} />
                    </button>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <FiSearch className="text-pink-500 w-5 h-5" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 w-full text-gray-200 focus:outline-none focus:ring-3 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Your best friend, or perhaps that upperclassman that gives you amazing advice..."
                    />
                  </div>

                  <div className="space-y-2 max-h-[50vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {searchTerm.length === 0 ? (
                      <NoFriendsResult />
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.slice(0, 10).map((u) => (
                        <motion.div
                          key={u.uid}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-pink-400 transition-all"
                          whileHover={{ scale: 0.99 }}
                        >
                          <div className="flex items-center gap-4">
                            <ProfilePic profile={u} size={36} />
                            <div>
                              <div className="font-medium text-gray-200">
                                {getDisplayName(u)}
                              </div>
                              <div className="text-sm text-gray-400">
                                {u.majors?.join(", ")} &middot;{" "}
                                {u.graduationYear && (
                                  <YearBadge
                                    graduationYear={u.graduationYear}
                                    noPadding
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            className="flex items-center gap-1 px-3 py-1.5 bg-pink-900/60 text-pink-200 rounded-lg border border-pink-800 hover:bg-pink-800 hover:text-white transition"
                            onClick={() => sendFriendRequest(u.uid)}
                          >
                            <FiUserPlus />
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

          {/* Friends List Section */}
          <section>
            <h3 className="text-lg font-medium text-pink-200 mb-4 flex items-center gap-2">
              <FiUsers /> Your Friends ({friendProfiles.length})
            </h3>
            <div className="space-y-3">
              {friendProfiles.length === 0 && (
                <div className="text-gray-400 text-sm">
                  No friends yet. Go add some above!
                </div>
              )}
              {friendProfiles.map((f) => {
                const friend = friends.find((fr) => fr.users.includes(f.uid));
                if (!friend) return null;

                return (
                  <motion.div
                    key={f.uid}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple-400 transition-all"
                    whileHover={{ scale: 1.015 }}
                  >
                    <div className="flex gap-4">
                      <ProfilePic profile={f} size={40} />
                      <div>
                        <div className="font-medium text-pink-200">
                          {getDisplayName(f)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {f.majors?.join(", ")} &middot;{" "}
                          {f.graduationYear && (
                            <div className="mt-1">
                              <YearBadge
                                graduationYear={f.graduationYear}
                                noPadding
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Link
                        href={`/user/${f.uid}`}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/60 text-gray-300 rounded-lg border border-gray-700 hover:bg-pink-500 hover:text-white transition"
                      >
                        <FiUser className="inline-block" />
                        Open Profile
                      </Link>
                      <FriendActionsDropdown friend={friend} profile={f} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>

                  </>
      )}

      {/* Disable Confirmation Modal */}
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
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 max-w-sm w-full shadow-xl"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-full">
                  <FiAlertTriangle className="text-red-500" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-100">
                  Disable Friends Feature?
                </h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">
                This will <strong className="text-red-400">remove all your friends</strong>,
                pending requests, and hide your courses from others. You can re-enable
                the feature later, but you'll need to add friends again.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDisableConfirm(false)}
                  disabled={isDisabling}
                  className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800/50 text-gray-200 text-sm disabled:opacity-50"
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
                    } catch (error) {
                      toast.error("Failed to disable friends feature");
                    } finally {
                      setIsDisabling(false);
                    }
                  }}
                  disabled={isDisabling}
                  className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-50 flex items-center gap-1.5"
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

  function NoFriendsResult() {
    return (
      <div className="flex flex-col items-center justify-center gap-4 text-gray-400 text-center py-10">
        <Panda size={32} />
        <div>
          Can't find your friends? <CopyButton />
          <br />
          and <span className="text-white">text it to them!</span> You'll be
          helping them (and us)
          <br />
          out with our mission of making academic planning <br />
          easier and more accessible for all Yale students.
        </div>
      </div>
    );
  }

  function MoreOptionsDropdown({ onDisable }: { onDisable: () => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-gray-200 transition"
          aria-label="More options"
        >
          <FiMoreVertical size={18} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 bottom-full mb-2 w-48 bg-gray-800 rounded-lg shadow-lg z-10 border border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => {
                  onDisable();
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-900/30 transition-colors"
              >
                <FiToggleLeft size={16} />
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

    // Close dropdown when clicking outside
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-full hover:bg-gray-700 transition"
          aria-label="Friend actions"
        >
          <FiMoreVertical />
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-md shadow-lg z-10 border border-gray-700"
            >
              <div className="py-1">
                <Link
                  href={`/user/${profile.uid}`}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-200 hover:bg-gray-700"
                  onClick={() => setIsOpen(false)}
                >
                  <FiUser className="inline-block" />
                  View Profile
                </Link>
                <button
                  onClick={() => {
                    if (friend.id) removeFriend(friend.id);
                    setIsOpen(false);
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-red-300 hover:bg-red-900/30"
                >
                  <FiX />
                  Remove Friend
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
}
