import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Course } from "@/lib/types";
import {
  enableFriendsFeature,
  disableFriendsFeature,
} from "@/lib/syncFriendsPublicData";
import type { UserProfile } from "./types";

export function useFriendsFeature(
  user: User | null,
  courses: Course[],
  userProfile: UserProfile | null,
) {
  const [friendsEnabled, setFriendsEnabled] = useState(false);

  useEffect(() => {
    if (!user) {
      setFriendsEnabled(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, "friends_public_data", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          setFriendsEnabled(docSnap.data().enabled || false);
        } else {
          setFriendsEnabled(false);
        }
      },
      (error) => {
        console.error("Error subscribing to friends data:", error);
        setFriendsEnabled(false);
      },
    );
    return () => unsub();
  }, [user]);

  const handleToggleFriends = async (enabled: boolean) => {
    if (!user) return;

    try {
      if (enabled) {
        await enableFriendsFeature(user.uid, courses, userProfile, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        });
      } else {
        await disableFriendsFeature(user.uid);
      }
    } catch (error) {
      console.error("Error toggling friends feature:", error);
    }
  };

  return { friendsEnabled, handleToggleFriends };
}
