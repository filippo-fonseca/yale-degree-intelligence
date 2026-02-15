"use client";

import { useState } from "react";

interface UserAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}

/**
 * Renders a user avatar with fallback to initials when:
 * - photoURL is null/undefined/empty
 * - Image fails to load (invalid URL, 404, etc.)
 */
export function UserAvatar({
  photoURL,
  displayName,
  email,
  size = 36,
  className = "",
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false);

  // Get initials from displayName or email
  const getInitials = (): string => {
    if (displayName) {
      const parts = displayName.trim().split(" ");
      if (parts.length >= 2) {
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
      }
      return displayName.charAt(0).toUpperCase();
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "?";
  };

  const showImage = photoURL && !imageError;

  // Calculate font size based on avatar size
  const fontSize = Math.max(size / 2.5, 10);

  if (showImage) {
    return (
      <img
        src={photoURL}
        alt={displayName || email || "User"}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover border-2 border-gray-700/50 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-gradient-to-br from-pink-500 via-purple-500 to-violet-600 flex items-center justify-center text-white font-medium border-2 border-gray-700/50 shadow-[0_2px_8px_rgba(0,0,0,0.3)] ${className}`}
      style={{ width: size, height: size, fontSize }}
    >
      {getInitials()}
    </div>
  );
}
