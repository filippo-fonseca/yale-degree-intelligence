"use client";

import { useEffect, useState } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { User } from "firebase/auth";
import { Friend, FriendRequest, UserProfile } from "./friendsTypes";

export function useFriendsData(user: User | null) {
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendProfiles, setFriendProfiles] = useState<UserProfile[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [userProfilesById, setUserProfilesById] = useState<Record<string, UserProfile>>({});
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

  return {
    allUsers,
    friends,
    friendProfiles,
    sentRequests,
    incomingRequests,
    userProfilesById,
    ready,
  };
}
