import { Course } from "@/lib/types";

export type UserProfile = {
  uid: string;
  displayName?: string;
  photoURL?: string;
  majors: string[];
  graduationYear?: number;
};

export type FriendRequest = {
  id: string;
  from: string;
  to: string;
  status: "pending" | "accepted" | "rejected";
  timestamp?: any;
};

export type Friend = {
  id: string;
  users: string[]; // [userId, userId]
  createdAt?: any;
};

export type FriendsUserProfile = {
  majors: string[];
  graduationYear?: number;
  bio?: string;
};

export interface FriendsTabProps {
  friendsEnabled: boolean;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  courses: Course[];
  userProfile: FriendsUserProfile | null;
}

export function getDisplayName(profile: UserProfile) {
  if (profile.displayName) return profile.displayName;
  return "Yale Student";
}

export function getInitials(profile: UserProfile): string {
  const name = profile.displayName || "Y";
  const parts = name.trim().split(" ");
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}
