"use client";

import { useAuth } from "@/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  doc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  getDoc,
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
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import CompoundLogo from "@/components/ui/CompoundLogo";
import { toast } from "react-hot-toast";
import { Panda } from "lucide-react";

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

export default function FriendsTab() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [userProfilesById, setUserProfilesById] = useState<
    Record<string, UserProfile>
  >({});
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  // Set up real-time listeners
  useEffect(() => {
    if (!user) return;

    // 1. Users listener
    const usersUnsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const users: UserProfile[] = [];
      const byId: Record<string, UserProfile> = {};
      snapshot.forEach((doc) => {
        const data = doc.data() as UserProfile;
        const p = { ...data, uid: doc.id };
        users.push(p);
        byId[doc.id] = p;
      });
      setAllUsers(users);
      setUserProfilesById(byId);
    });

    // 2. Friends listener
    const friendsUnsub = onSnapshot(
      query(
        collection(db, "friends"),
        where("users", "array-contains", user.uid)
      ),
      (snapshot) => {
        const frs: Friend[] = [];
        snapshot.forEach((doc) => {
          frs.push({ ...(doc.data() as Friend), id: doc.id });
        });
        setFriends(frs);
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
        snapshot.forEach((doc) => {
          sent.push({
            id: doc.id,
            ...(doc.data() as Omit<FriendRequest, "id">),
          });
        });
        setSentRequests(sent);
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
        snapshot.forEach((doc) => {
          inc.push({
            id: doc.id,
            ...(doc.data() as Omit<FriendRequest, "id">),
          });
        });
        setIncomingRequests(inc);
      }
    );

    setLoading(false);

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
      .map((id) => userProfilesById[id!])
      .filter(Boolean);

    setFriendProfiles(profiles);
  }, [friends, userProfilesById, user]);

  // Send Friend Request
  const sendFriendRequest = async (toId: string) => {
    if (!user) return;

    //close modal
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
      const docRef = await addDoc(collection(db, "friend-requests"), {
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
      // 1. Mark request as accepted
      await setDoc(doc(db, "friend-requests", req.id), {
        ...req,
        status: "accepted",
      });

      // 2. Create friend record
      const users = [req.from, req.to].sort();
      await addDoc(collection(db, "friends"), {
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
      await deleteDoc(doc(db, "friends", friendId));
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

  return (
    <div className="w-full max-w-3xl mx-auto font-louize">
      <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200 mb-8">
        Friends & Connections
      </h2>

      {/* Loading state */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500"></div>
        </div>
      )}

      {/* Main content when not loading */}
      {!loading && (
        <>
          <div className="flex justify-end mb-6">
            <button
              className="px-4 py-2 bg-pink-700 text-white rounded-md hover:bg-pink-800 transition"
              onClick={() => setShowSearchModal(true)}
            >
              Add a friend
            </button>
          </div>

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
                      placeholder="Find students by name, email, major..."
                    />
                  </div>

                  <div className="space-y-2 max-h-[50vh]overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600">
                    {searchTerm.length === 0 ? (
                      <div className="flex flex-col items-center justify-center gap-4 text-gray-400 text-center py-10">
                        <Panda size={32} />
                        <div>
                          Can't find your friends? <CopyButton />
                          <br />
                          and{" "}
                          <span className="text-white">
                            text it to them!
                          </span>{" "}
                          You'll be helping them (and us)
                          <br />
                          out with our mission of making academic planning{" "}
                          <br />
                          easier and more accessible for all Yale students.
                        </div>
                      </div>
                    ) : filteredUsers.length > 0 ? (
                      filteredUsers.slice(0, 10).map((u) => (
                        <motion.div
                          key={u.uid}
                          className="flex items-center justify-between p-3 rounded-xl bg-gray-800 border border-gray-700 hover:border-pink-400 transition-all"
                          whileHover={{ scale: 1.01 }}
                        >
                          <div className="flex items-center gap-4">
                            <ProfilePic profile={u} size={36} />
                            <div>
                              <div className="font-medium text-gray-200">
                                {getDisplayName(u)}
                              </div>
                              <div className="text-sm text-gray-400">
                                {u.majors?.join(", ")} &middot;{" "}
                                {u.graduationYear &&
                                  `Class of ${u.graduationYear}`}
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
                      <div className="text-gray-500 text-sm text-center py-10">
                        No matching users found!
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 2. Friend Requests */}
          <section className="mb-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-medium text-pink-200 mb-2 flex items-center gap-2">
                <FiMail /> Incoming Requests ({incomingRequests.length})
              </h3>
              <div className="space-y-2">
                {incomingRequests.length === 0 && (
                  <div className="text-gray-400 text-sm">
                    No incoming requests.
                  </div>
                )}
                {incomingRequests.map((req) => {
                  const sender = userProfilesById[req.from];
                  if (!sender) return null;
                  return (
                    <motion.div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-4">
                        <ProfilePic profile={sender} size={32} />
                        <div>
                          <div className="font-medium text-gray-200">
                            {getDisplayName(sender)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {sender.majors?.join(", ")} &middot;{" "}
                            {sender.graduationYear &&
                              `Class of ${sender.graduationYear}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="bg-emerald-900/40 text-emerald-200 rounded-lg px-3 py-1.5 border border-emerald-800 hover:bg-emerald-700/60"
                          onClick={() => acceptFriendRequest(req)}
                          title="Accept"
                        >
                          <FiCheck />
                        </button>
                        <button
                          className="bg-red-900/40 text-red-200 rounded-lg px-3 py-1.5 border border-red-800 hover:bg-red-700/60"
                          onClick={() => rejectFriendRequest(req)}
                          title="Reject"
                        >
                          <FiX />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-pink-200 mb-2 flex items-center gap-2">
                <FiUserCheck /> Sent Requests ({sentRequests.length})
              </h3>
              <div className="space-y-2">
                {sentRequests.length === 0 && (
                  <div className="text-gray-400 text-sm">No sent requests.</div>
                )}
                {sentRequests.map((req) => {
                  const recipient = userProfilesById[req.to];
                  if (!recipient) return null;
                  return (
                    <motion.div
                      key={req.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800"
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex items-center gap-4">
                        <ProfilePic profile={recipient} size={32} />
                        <div>
                          <div className="font-medium text-gray-200">
                            {getDisplayName(recipient)}
                          </div>
                          <div className="text-xs text-gray-400">
                            {recipient.majors?.join(", ")} &middot;{" "}
                            {recipient.graduationYear &&
                              `Class of ${recipient.graduationYear}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          className="bg-red-900/40 text-red-200 rounded-lg px-3 py-1.5 border border-red-800 hover:bg-red-700/60"
                          onClick={() => cancelSentRequest(req.id)}
                          title="Cancel request"
                        >
                          <FiX />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* 3. Friends List */}
          <section>
            <h3 className="text-lg font-medium text-pink-200 mb-2 flex items-center gap-2">
              <FiUsers /> Your Friends ({friendProfiles.length})
            </h3>
            <div className="space-y-2">
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
                    className="flex items-center justify-between p-3 rounded-xl bg-gray-900/50 border border-gray-800 hover:border-purple-400 transition-all"
                    whileHover={{ scale: 1.015 }}
                  >
                    <div className="flex items-center gap-4">
                      <ProfilePic profile={f} size={36} />
                      <div>
                        <Link
                          href={`/user/${f.uid}`}
                          className="font-medium text-pink-200 hover:underline hover:text-pink-300"
                        >
                          {getDisplayName(f)}
                        </Link>
                        <div className="text-xs text-gray-400">
                          {f.majors?.join(", ")} &middot;{" "}
                          {f.graduationYear && `Class of ${f.graduationYear}`}
                        </div>
                      </div>
                    </div>
                    <button
                      className="flex items-center gap-1 px-3 py-1.5 bg-gray-800/60 text-gray-300 rounded-lg border border-gray-700 hover:bg-red-800 hover:text-white hover:border-red-600 transition"
                      onClick={() => friend.id && removeFriend(friend.id)}
                      title="Remove friend"
                    >
                      <FiX />
                      Remove
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
