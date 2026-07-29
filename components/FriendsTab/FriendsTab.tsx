"use client";

import { useAuth } from "@/context/AuthContext";
import { FriendsTabProps } from "./friendsTypes";
import { useFriendsData } from "./useFriendsData";
import { useFriendsActions } from "./useFriendsActions";
import { FriendsOptInPrompt } from "./FriendsOptInPrompt";
import { FriendsMainView } from "./FriendsMainView";

export default function FriendsTab({
  friendsEnabled,
  onToggleFriends,
  courses,
  userProfile,
}: FriendsTabProps) {
  const { user } = useAuth();

  const {
    allUsers,
    friends,
    friendProfiles,
    sentRequests,
    incomingRequests,
    userProfilesById,
    ready,
  } = useFriendsData(user);

  const {
    profileVisibility,
    resolvedVisibility,
    savingVisibility,
    updateVisibility,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    cancelSentRequest,
  } = useFriendsActions({
    user,
    friends,
    sentRequests,
    incomingRequests,
  });

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

  if (!friendsEnabled) {
    return <FriendsOptInPrompt onToggleFriends={onToggleFriends} />;
  }

  return (
    <FriendsMainView
      user={user}
      courses={courses}
      userProfile={userProfile}
      onToggleFriends={onToggleFriends}
      allUsers={allUsers}
      friends={friends}
      friendProfiles={friendProfiles}
      sentRequests={sentRequests}
      incomingRequests={incomingRequests}
      userProfilesById={userProfilesById}
      ready={ready}
      profileVisibility={profileVisibility}
      resolvedVisibility={resolvedVisibility}
      savingVisibility={savingVisibility}
      updateVisibility={updateVisibility}
      sendFriendRequest={sendFriendRequest}
      acceptFriendRequest={acceptFriendRequest}
      rejectFriendRequest={rejectFriendRequest}
      removeFriend={removeFriend}
      cancelSentRequest={cancelSentRequest}
    />
  );
}
