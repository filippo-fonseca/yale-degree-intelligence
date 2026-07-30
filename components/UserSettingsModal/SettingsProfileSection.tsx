"use client";

import { FiEdit2, FiSun, FiMoon } from "react-icons/fi";
import { useTheme } from "@/context/ThemeContext";
import { BIO_MAX } from "./useUserProfileForm";
import type { UserProfile } from "./settingsTypes";

interface SettingsProfileSectionProps {
  localProfile: UserProfile;
  isEditingBio: boolean;
  setIsEditingBio: (value: boolean) => void;
  tempBio: string;
  setTempBio: (value: string) => void;
  bioCount: number;
  setBioCount: (value: number) => void;
  bioJustSaved: boolean;
  setBioJustSaved: (value: boolean) => void;
  isSavingBio: boolean;
  handleCancelBio: () => void;
  handleSaveBio: () => Promise<void>;
  friendsEnabled: boolean;
  isTogglingFriends: boolean;
  onRequestDisableFriends: () => void;
  onEnableFriends: () => Promise<void>;
}

export function SettingsProfileSection({
  localProfile,
  isEditingBio,
  setIsEditingBio,
  tempBio,
  setTempBio,
  bioCount,
  setBioCount,
  bioJustSaved,
  setBioJustSaved,
  isSavingBio,
  handleCancelBio,
  handleSaveBio,
  friendsEnabled,
  isTogglingFriends,
  onRequestDisableFriends,
  onEnableFriends,
}: SettingsProfileSectionProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <>
      {/* Bio */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
          <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
            Bio
          </span>
          {!isEditingBio && (
            <button
              onClick={() => setIsEditingBio(true)}
              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
              title="Edit bio"
            >
              <FiEdit2 className="h-3 w-3" />
              Edit
            </button>
          )}
        </div>
        {!isEditingBio ? (
          <div className="px-3 py-2">
            {localProfile.bio ? (
              <p className="text-gray-700 dark:text-gray-300 text-xs leading-snug">
                {localProfile.bio}
              </p>
            ) : (
              <p className="text-gray-400 dark:text-gray-500 text-xs italic">
                No bio yet
              </p>
            )}
          </div>
        ) : (
          <div className="px-3 py-2 space-y-2">
            <div className="relative">
              <textarea
                autoFocus
                value={tempBio}
                onChange={(e) => {
                  setTempBio(e.target.value);
                  setBioCount(e.target.value.length);
                  if (bioJustSaved) setBioJustSaved(false);
                }}
                placeholder="Tell us about yourself..."
                maxLength={BIO_MAX}
                rows={2}
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/50 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs resize-none transition-all duration-200"
              />
              <div className="absolute bottom-1 right-2 text-[10px] text-gray-400 dark:text-gray-500">
                {bioCount}/{BIO_MAX}
              </div>
            </div>
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={handleCancelBio}
                disabled={isSavingBio}
                className="di-btn-secondary !px-2 !py-1 !text-[11px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={isSavingBio}
                className={`!px-2.5 !py-1 !text-[11px] ${
                  bioJustSaved ? "di-btn-success" : "di-btn-primary"
                }`}
              >
                {isSavingBio ? "..." : bioJustSaved ? "Saved" : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Appearance + Friends (stacked, paired against Bio) */}
      <div className="flex flex-col gap-3">
        {/* Appearance / Theme (icon button, matches app header) */}
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div>
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Appearance
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {isDark ? "Dark mode" : "Light mode"}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              title={
                resolvedTheme === "dark"
                  ? "Switch to light mode"
                  : "Switch to dark mode"
              }
              aria-label="Toggle theme"
              className="p-1.5 lg:p-2 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all border border-black/[0.06] dark:border-white/[0.08] hover:border-black/[0.09] dark:hover:border-white/[0.12] text-gray-600 dark:text-gray-300"
            >
              <span className="flex h-7 w-7 items-center justify-center">
                {resolvedTheme === "dark" ? (
                  <FiSun size={18} />
                ) : (
                  <FiMoon size={18} />
                )}
              </span>
            </button>
          </div>
        </div>

        {/* Friends Feature Toggle */}
        <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm">
          <div className="flex items-center justify-between px-3 py-2.5">
            <div className="flex-1 mr-2">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Friends Feature
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                Let friends see your courses (grades are always hidden, ofc).
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={friendsEnabled}
                disabled={isTogglingFriends}
                onChange={async (e) => {
                  if (!e.target.checked && friendsEnabled) {
                    onRequestDisableFriends();
                  } else {
                    await onEnableFriends();
                  }
                }}
                className="sr-only peer"
              />
              <div className="w-11 h-6 rounded-full peer transition-colors bg-gray-300 dark:bg-gray-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.22)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] peer-focus:ring-2 peer-focus:ring-pink-500/40 peer-checked:bg-pink-600 dark:peer-checked:bg-gradient-to-r dark:peer-checked:from-pink-500 dark:peer-checked:to-purple-600 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.45)] after:transition-transform peer-checked:after:translate-x-5"></div>
            </label>
          </div>
          {friendsEnabled && (
            <div className="px-3 pb-2 -mt-1">
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400">
                Course list is visible to friends.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
