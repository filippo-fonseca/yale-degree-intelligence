import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserProfile } from "@/components/FriendsTab/friendsTypes";

export type FriendNotification = {
  /** Stable per event: the friend-request doc id plus the event kind. */
  id: string;
  type: "request" | "accepted";
  /** The other student: the sender for a request, the accepter for an accept. */
  otherUid: string;
  at: Timestamp | null;
};

/**
 * Friend-activity notifications, derived live from `friend-requests` rather
 * than a notifications collection: an incoming pending request is "X sent you
 * a friend request", and one of your sent requests flipping to accepted is
 * "X accepted your friend request". Rejections stay silent by design, and no
 * new Firestore collection or security rule is involved.
 *
 * Unread state is a `notificationsLastSeenAt` timestamp on the owner-only
 * `users/{uid}` doc, so it follows the account across devices.
 */
export function useFriendNotifications(
  user: User | null,
  friendsEnabled: boolean,
) {
  const [incoming, setIncoming] = useState<FriendNotification[]>([]);
  const [accepted, setAccepted] = useState<FriendNotification[]>([]);
  const [lastSeenAt, setLastSeenAt] = useState<Timestamp | null>(null);
  const [lastSeenLoaded, setLastSeenLoaded] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  const fetchedProfileUids = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !friendsEnabled) {
      setIncoming([]);
      setAccepted([]);
      return;
    }

    const unsubIncoming = onSnapshot(
      query(
        collection(db, "friend-requests"),
        where("to", "==", user.uid),
        where("status", "==", "pending"),
      ),
      (snap) => {
        setIncoming(
          snap.docs.map((d) => ({
            id: `${d.id}:request`,
            type: "request" as const,
            otherUid: d.data().from as string,
            at: (d.data().timestamp as Timestamp | undefined) ?? null,
          })),
        );
      },
      (error) => console.error("Error subscribing to friend requests:", error),
    );

    const unsubAccepted = onSnapshot(
      query(
        collection(db, "friend-requests"),
        where("from", "==", user.uid),
        where("status", "==", "accepted"),
      ),
      (snap) => {
        setAccepted(
          snap.docs.map((d) => ({
            id: `${d.id}:accepted`,
            type: "accepted" as const,
            otherUid: d.data().to as string,
            // Older accepted requests predate respondedAt; their send time is
            // the best remaining ordering signal.
            at:
              (d.data().respondedAt as Timestamp | undefined) ??
              (d.data().timestamp as Timestamp | undefined) ??
              null,
          })),
        );
      },
      (error) => console.error("Error subscribing to accepts:", error),
    );

    return () => {
      unsubIncoming();
      unsubAccepted();
    };
  }, [user, friendsEnabled]);

  useEffect(() => {
    if (!user) {
      setLastSeenAt(null);
      setLastSeenLoaded(false);
      return;
    }
    let cancelled = false;
    getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (cancelled) return;
        setLastSeenAt(
          (snap.data()?.notificationsLastSeenAt as Timestamp | undefined) ??
            null,
        );
      })
      .catch((error) =>
        console.error("Error reading notificationsLastSeenAt:", error),
      )
      .finally(() => {
        if (!cancelled) setLastSeenLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  const notifications = useMemo(
    () =>
      [...incoming, ...accepted].sort(
        (a, b) => (b.at?.toMillis() ?? 0) - (a.at?.toMillis() ?? 0),
      ),
    [incoming, accepted],
  );

  // Names and photos come from friends_directory, the one collection any
  // Yale-authed user may read; users/{otherUid} is owner-only.
  useEffect(() => {
    if (!user) return;
    const missing = notifications
      .map((n) => n.otherUid)
      .filter((uid) => !fetchedProfileUids.current.has(uid));
    if (missing.length === 0) return;
    missing.forEach((uid) => fetchedProfileUids.current.add(uid));
    for (const uid of missing) {
      getDoc(doc(db, "friends_directory", uid))
        .then((snap) => {
          if (!snap.exists()) return;
          const data = snap.data();
          setProfiles((prev) => ({
            ...prev,
            [uid]: {
              uid,
              displayName: data.displayName ?? undefined,
              photoURL: data.photoURL ?? undefined,
              majors: data.majors ?? [],
              graduationYear: data.graduationYear ?? undefined,
            },
          }));
        })
        .catch(() => {
          // A missing or unreadable directory entry just falls back to the
          // "Yale Student" label.
        });
    }
  }, [notifications, user]);

  // Unread only once lastSeenAt has actually loaded, so the badge doesn't
  // flash a count on every page load before the read marker arrives.
  const unreadCount = useMemo(() => {
    if (!lastSeenLoaded) return 0;
    if (!lastSeenAt) return notifications.length;
    return notifications.filter(
      (n) => (n.at?.toMillis() ?? 0) > lastSeenAt.toMillis(),
    ).length;
  }, [notifications, lastSeenAt, lastSeenLoaded]);

  const markAllSeen = async () => {
    if (!user) return;
    // Optimistic: anything currently listed reads as seen immediately.
    setLastSeenAt(Timestamp.now());
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { notificationsLastSeenAt: serverTimestamp() },
        { merge: true },
      );
    } catch (error) {
      console.error("Error marking notifications seen:", error);
    }
  };

  return { notifications, unreadCount, profiles, markAllSeen };
}
