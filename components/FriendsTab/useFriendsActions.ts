"use client";

import { useEffect, useState } from "react";
import {
  collection,
  addDoc,
  setDoc,
  doc,
  deleteDoc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { User } from "firebase/auth";
import { toast } from "react-hot-toast";
import { FriendsProfileVisibility, resolveFriendsProfileVisibility } from "@/lib/types";
import { Friend, FriendRequest } from "./friendsTypes";

type UseFriendsActionsParams = {
  user: User | null;
  friends: Friend[];
  sentRequests: FriendRequest[];
  incomingRequests: FriendRequest[];
};

export function useFriendsActions({
  user,
  friends,
  sentRequests,
  incomingRequests,
}: UseFriendsActionsParams) {
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

  const sendFriendRequest = async (
    toId: string,
    onClose?: () => void,
  ) => {
    if (!user) return;
    onClose?.();

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
        error instanceof Error ? error.message : "Failed to accept friend request",
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
        error instanceof Error ? error.message : "Failed to remove friend",
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

  return {
    profileVisibility,
    resolvedVisibility,
    savingVisibility,
    updateVisibility,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    cancelSentRequest,
  };
}
