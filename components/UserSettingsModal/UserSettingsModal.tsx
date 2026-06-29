"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  FiLogOut,
  FiEdit2,
  FiMoreVertical,
  FiTrash2,
  FiChevronDown,
  FiX,
  FiSun,
  FiMoon,
  FiCopy,
  FiCheck,
  FiRefreshCw,
} from "react-icons/fi";
import { User } from "firebase/auth";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "../ui/MajorDropdown";
import { YearBadge } from "../ui/YearBadge";
import Link from "next/link";
import { Info } from "lucide-react";
import { UserAvatar } from "../ui/UserAvatar";
import { useTheme } from "@/context/ThemeContext";
import {
  getDanKeyStatus,
  saveDanKey,
  deleteDanKey,
  type DanKeyStatus,
} from "@/lib/dan/client";
import {
  getMcpStatus,
  generateMcpToken,
  revokeMcpToken,
  type McpTokenStatus,
} from "@/lib/mcp/client";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  bio?: string;
  updatedAt: Date;
  danWriteActionsEnabled?: boolean;
}

interface UserSettingsModalProps {
  user: User;
  userProfile: UserProfile | null;
  friendsEnabled: boolean;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  onToggleFriends: (enabled: boolean) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
  onReplayTour?: () => void;
}

export default function UserSettingsModal({
  user,
  userProfile,
  friendsEnabled,
  onClose,
  onSave,
  onToggleFriends,
  onLogout,
  onDeleteAccount,
  onReplayTour,
}: UserSettingsModalProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [isHoveringLogout, setIsHoveringLogout] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [duplicateMajorError, setDuplicateMajorError] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  // Bio edit flow
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioJustSaved, setBioJustSaved] = useState(false);
  const [bioCount, setBioCount] = useState(0);

  // More menu and delete account
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Friends feature toggle
  const [isTogglingFriends, setIsTogglingFriends] = useState(false);
  const [showDisableFriendsConfirm, setShowDisableFriendsConfirm] =
    useState(false);

  // Dan AI advisor — API key
  const [danKeyStatus, setDanKeyStatus] = useState<DanKeyStatus>({
    connected: false,
  });
  const [danKeyInput, setDanKeyInput] = useState("");
  const [isDanConnecting, setIsDanConnecting] = useState(false);
  const [danConnectError, setDanConnectError] = useState<string | null>(null);
  const [danJustConnected, setDanJustConnected] = useState(false);
  const [isDanRemoving, setIsDanRemoving] = useState(false);

  // Dan AI advisor — write-actions toggle
  const [danWriteActions, setDanWriteActions] = useState(
    userProfile?.danWriteActionsEnabled ?? false,
  );
  const [isTogglingDanWrite, setIsTogglingDanWrite] = useState(false);

  // MCP server — per-user token management
  const [mcpStatus, setMcpStatus] = useState<McpTokenStatus>({
    connected: false,
  });
  const [mcpToken, setMcpToken] = useState<string | null>(null);
  const [isMcpGenerating, setIsMcpGenerating] = useState(false);
  const [isMcpRevoking, setIsMcpRevoking] = useState(false);
  const [mcpCopiedField, setMcpCopiedField] = useState<string | null>(null);
  const [showMcpInstructions, setShowMcpInstructions] = useState(false);

  const mcpEndpoint =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/mcp`
      : "/api/mcp";

  const modalRef = useRef<HTMLDivElement>(null);

  const BIO_MAX = 200;

  // Initialize local profile state
  useEffect(() => {
    if (userProfile) {
      setLocalProfile(userProfile);
      setTempBio(userProfile.bio || "");
      setBioCount((userProfile.bio || "").length);
    }
  }, [userProfile]);

  // Fetch Dan key status on mount
  useEffect(() => {
    getDanKeyStatus().then(setDanKeyStatus).catch(() => {});
  }, []);

  // Fetch MCP token status on mount
  useEffect(() => {
    getMcpStatus().then(setMcpStatus).catch(() => {});
  }, []);

  // Close modal when clicking outside (but ignore portaled dropdowns)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-major-dropdown-portal="true"]')) return;
      if (modalRef.current && !modalRef.current.contains(target)) onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        moreMenuRef.current &&
        !moreMenuRef.current.contains(event.target as Node)
      ) {
        setShowMoreMenu(false);
      }
    };
    if (showMoreMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMoreMenu]);

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      await onDeleteAccount();
    } catch (error) {
      console.error("Failed to delete account:", error);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const getYearStatus = (graduationYear: number): string => {
    // Direct mapping based on graduation year
    if (graduationYear >= 2031) return "High School";
    if (graduationYear === 2030) return "Freshman";
    if (graduationYear === 2029) return "Sophomore";
    if (graduationYear === 2028) return "Junior";
    if (graduationYear <= 2027) return "Senior";
    return "Unknown";
  };

  // Exclude bio from hasChanges so bio saving is independent
  const hasChanges = () => {
    if (!userProfile || !localProfile) return false;
    return (
      JSON.stringify(userProfile.majors) !==
        JSON.stringify(localProfile.majors) ||
      userProfile.graduationYear !== localProfile.graduationYear
    );
  };

  const hasDuplicateMajors = () => {
    if (!localProfile) return false;
    const uniqueMajors = new Set(localProfile.majors);
    return uniqueMajors.size !== localProfile.majors.length;
  };

  const handleAddMajor = () => {
    if (!localProfile || localProfile.majors.length >= 3) return;
    const availableMajor = Object.keys(MAJORS).find(
      (major) => !localProfile.majors.includes(major),
    );
    if (availableMajor) {
      setLocalProfile({
        ...localProfile,
        majors: [...localProfile.majors, availableMajor],
      });
      setDuplicateMajorError(null);
    }
  };

  const handleMajorChange = (index: number, newMajor: string) => {
    if (!localProfile) return;
    if (
      localProfile.majors.includes(newMajor) &&
      localProfile.majors[index] !== newMajor
    ) {
      setDuplicateMajorError("You can't select the same major twice");
      return;
    }
    setDuplicateMajorError(null);
    const newMajors = [...localProfile.majors];
    newMajors[index] = newMajor;
    setLocalProfile({ ...localProfile, majors: newMajors });
  };

  const handleRemoveMajor = (index: number) => {
    if (!localProfile || localProfile.majors.length <= 1) return;
    const newMajors = [...localProfile.majors];
    newMajors.splice(index, 1);
    setLocalProfile({ ...localProfile, majors: newMajors });
    setDuplicateMajorError(null);
  };

  // Save bio immediately (does not affect hasChanges()); KEEP EDIT MODE
  const handleSaveBio = async () => {
    if (!localProfile) return;
    try {
      setIsSavingBio(true);
      setBioJustSaved(false);
      const trimmed = tempBio.trim();
      await onSave({ bio: trimmed });
      setLocalProfile({ ...localProfile, bio: trimmed }); // sync local
      // stay in edit mode; show "Saved" on button for a moment
      setBioJustSaved(true);
      setTimeout(() => setBioJustSaved(false), 1500);
      // update counter to trimmed value
      setBioCount(trimmed.length);
    } finally {
      setIsSavingBio(false);
    }
  };

  const handleCancelBio = () => {
    if (!localProfile) return;
    setTempBio(localProfile.bio || "");
    setBioCount((localProfile.bio || "").length);
    setIsEditingBio(false);
    setBioJustSaved(false);
  };

  const handleSave = async () => {
    if (hasDuplicateMajors()) {
      setDuplicateMajorError("Please remove duplicate majors before saving");
      return;
    }
    if (!localProfile) return;
    try {
      setIsSaving(true);
      await onSave({
        majors: localProfile.majors,
        graduationYear: localProfile.graduationYear,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDanConnect = async () => {
    const trimmed = danKeyInput.trim();
    if (!trimmed) return;
    setIsDanConnecting(true);
    setDanConnectError(null);
    try {
      const result = await saveDanKey(trimmed);
      if (result.ok) {
        setDanKeyInput("");
        setDanJustConnected(true);
        setTimeout(() => setDanJustConnected(false), 2000);
        const status = await getDanKeyStatus();
        setDanKeyStatus(status);
      } else {
        setDanConnectError(result.error);
      }
    } finally {
      setIsDanConnecting(false);
    }
  };

  const handleDanRemove = async () => {
    setIsDanRemoving(true);
    try {
      await deleteDanKey();
      const status = await getDanKeyStatus();
      setDanKeyStatus(status);
    } finally {
      setIsDanRemoving(false);
    }
  };

  const handleMcpGenerate = async () => {
    setIsMcpGenerating(true);
    try {
      const token = await generateMcpToken();
      setMcpToken(token);
      setShowMcpInstructions(true);
      setMcpStatus(await getMcpStatus());
    } catch (e) {
      console.error("Failed to generate MCP token:", e);
    } finally {
      setIsMcpGenerating(false);
    }
  };

  const handleMcpRevoke = async () => {
    setIsMcpRevoking(true);
    try {
      await revokeMcpToken();
      setMcpToken(null);
      setShowMcpInstructions(false);
      setMcpStatus({ connected: false });
    } finally {
      setIsMcpRevoking(false);
    }
  };

  const copyMcp = (field: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setMcpCopiedField(field);
    setTimeout(() => setMcpCopiedField(null), 1500);
  };

  const handleToggleDanWrite = async () => {
    const next = !danWriteActions;
    setDanWriteActions(next);
    setIsTogglingDanWrite(true);
    try {
      await onSave({ danWriteActionsEnabled: next });
    } finally {
      setIsTogglingDanWrite(false);
    }
  };

  if (!localProfile) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-3 overflow-y-auto">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, y: 15, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-3xl bg-white/95 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/90 dark:via-gray-900/80 dark:to-gray-950/90 rounded-2xl border border-black/[0.06] dark:border-white/[0.08] shadow-[0_24px_80px_rgba(0,0,0,0.18)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.5),0_0_120px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3)] backdrop-blur-2xl ring-1 ring-black/[0.04] dark:ring-white/[0.05] overflow-visible"
      >
        <button
          onClick={onClose}
          aria-label="Close settings"
          className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all"
        >
          <FiX size={18} />
        </button>
        <div className="p-5 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-5">
            <UserAvatar
              photoURL={user.photoURL}
              displayName={user.displayName}
              email={user.email}
              size={52}
              className="shadow-[0_4px_16px_rgba(0,0,0,0.4)] ring-1 ring-purple-500/20 border-white/20 shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {user.displayName || "User"}
                </h2>
                {localProfile.graduationYear && (
                  <YearBadge graduationYear={localProfile.graduationYear} />
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">
                {user.email}
              </p>
            </div>
          </div>

          {/* Two-column section grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                    onClick={handleCancelBio}
                    disabled={isSavingBio}
                    className="px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 disabled:opacity-70 transition-all duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBio}
                    disabled={isSavingBio}
                    className={`px-2 py-1 text-[11px] rounded-lg text-white disabled:opacity-70 transition-all duration-200 ${
                      bioJustSaved
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                        : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
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
                      setShowDisableFriendsConfirm(true);
                    } else {
                      setIsTogglingFriends(true);
                      try {
                        await onToggleFriends(true);
                      } finally {
                        setIsTogglingFriends(false);
                      }
                    }
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer transition-colors bg-gray-300 dark:bg-gray-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.22)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] peer-focus:ring-2 peer-focus:ring-pink-500/40 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.45)] after:transition-transform peer-checked:after:translate-x-5"></div>
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

          {/* Disable Friends Confirmation Modal */}
          <AnimatePresence>
            {showDisableFriendsConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !isTogglingFriends) {
                    setShowDisableFriendsConfirm(false);
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 border border-gray-200 dark:border-white/[0.1] rounded-2xl p-4 max-w-xs w-full shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl border border-red-500/20">
                      <FiTrash2 className="text-red-400" size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Disable Friends?
                    </h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                    This will{" "}
                    <strong className="text-red-400">remove all friends</strong>{" "}
                    and hide your courses.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDisableFriendsConfirm(false)}
                      disabled={isTogglingFriends}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] text-gray-700 dark:text-gray-300 text-xs disabled:opacity-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => {
                        setIsTogglingFriends(true);
                        try {
                          await onToggleFriends(false);
                          setShowDisableFriendsConfirm(false);
                        } finally {
                          setIsTogglingFriends(false);
                        }
                      }}
                      disabled={isTogglingFriends}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs disabled:opacity-50 flex items-center gap-1.5 transition-all duration-200"
                    >
                      {isTogglingFriends ? (
                        <>
                          <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
                          ...
                        </>
                      ) : (
                        "Disable"
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Dan AI Advisor (spans full width) */}
          <div className="lg:col-span-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                Dan AI advisor
              </span>
            </div>

            {/* API key connection */}
            <div className="px-3 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06]">
              {danKeyStatus.connected ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] text-gray-700 dark:text-gray-300">
                      Connected &bull; key ending ••••{danKeyStatus.last4}
                    </span>
                  </div>
                  <button
                    onClick={handleDanRemove}
                    disabled={isDanRemoving}
                    className="px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-red-400/50 hover:bg-red-500/[0.06] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-all duration-200"
                  >
                    {isDanRemoving ? (
                      <span className="flex items-center gap-1">
                        <span className="animate-spin h-2.5 w-2.5 border-2 border-current/30 border-t-current rounded-full" />
                        Removing…
                      </span>
                    ) : (
                      "Remove"
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <input
                      type="password"
                      value={danKeyInput}
                      onChange={(e) => {
                        setDanKeyInput(e.target.value);
                        if (danConnectError) setDanConnectError(null);
                        if (danJustConnected) setDanJustConnected(false);
                      }}
                      placeholder="sk-ant-..."
                      className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/50 text-gray-900 dark:text-gray-200 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-xs transition-all duration-200"
                    />
                    <button
                      onClick={handleDanConnect}
                      disabled={isDanConnecting || !danKeyInput.trim()}
                      className={`px-2.5 py-1.5 text-[11px] rounded-lg text-white disabled:opacity-50 flex items-center gap-1 transition-all duration-200 ${
                        danJustConnected
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                          : "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                      }`}
                    >
                      {isDanConnecting ? (
                        <>
                          <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
                          Connecting…
                        </>
                      ) : danJustConnected ? (
                        "Connected"
                      ) : (
                        "Connect"
                      )}
                    </button>
                  </div>
                  {danConnectError && (
                    <p className="text-[10px] text-red-400">{danConnectError}</p>
                  )}
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                    Dan runs on your own Anthropic key. Get one at{" "}
                    <a
                      href="https://console.anthropic.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      console.anthropic.com
                    </a>
                    .
                  </p>
                </div>
              )}
            </div>

            {/* Write-actions toggle */}
            <div className="flex items-center justify-between px-3 py-2.5">
              <div className="flex-1 mr-2">
                <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                  Let Dan make changes
                </span>
                <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                  Off by default. When on, Dan can add or remove courses, and will always ask before each change.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={danWriteActions}
                  disabled={isTogglingDanWrite}
                  onChange={handleToggleDanWrite}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 rounded-full peer transition-colors bg-gray-300 dark:bg-gray-600 shadow-[inset_0_1px_3px_rgba(0,0,0,0.22)] dark:shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)] peer-focus:ring-2 peer-focus:ring-pink-500/40 peer-checked:bg-gradient-to-r peer-checked:from-pink-500 peer-checked:to-purple-600 peer-disabled:opacity-50 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_3px_rgba(0,0,0,0.45)] after:transition-transform peer-checked:after:translate-x-5"></div>
              </label>
            </div>
          </div>

          {/* MCP server (spans full width) */}
          <div className="lg:col-span-2 rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.06]">
              <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
                MCP server
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500/15 to-purple-600/15 text-purple-600 dark:text-purple-300 border border-purple-500/20">
                Beta
              </span>
            </div>

            <div className="px-3 py-2.5 space-y-2.5">
              <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-snug">
                Connect Claude (or any MCP client) to your DegreeIntelligence
                account. Generate a token, add it to your client, and Claude can
                read your majors, courses, requirement progress, and the catalog
                to plan with you. Read-only and scoped to your account.
              </p>

              {/* Status row */}
              {mcpStatus.connected ? (
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span className="text-[11px] text-gray-700 dark:text-gray-300">
                      Token active{" "}
                      {mcpStatus.last4 && (
                        <span className="text-gray-400 dark:text-gray-500">
                          (••••{mcpStatus.last4})
                        </span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleMcpGenerate}
                      disabled={isMcpGenerating}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 disabled:opacity-50 transition-all duration-200"
                    >
                      <FiRefreshCw
                        size={11}
                        className={isMcpGenerating ? "animate-spin" : ""}
                      />
                      {isMcpGenerating ? "Rotating…" : "Rotate"}
                    </button>
                    <button
                      onClick={handleMcpRevoke}
                      disabled={isMcpRevoking}
                      className="px-2 py-1 text-[11px] rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-red-400/50 hover:bg-red-500/[0.06] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50 transition-all duration-200"
                    >
                      {isMcpRevoking ? "Revoking…" : "Revoke"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleMcpGenerate}
                  disabled={isMcpGenerating}
                  className="px-2.5 py-1.5 text-[11px] rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 flex items-center gap-1 transition-all duration-200"
                >
                  {isMcpGenerating ? (
                    <>
                      <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
                      Generating…
                    </>
                  ) : (
                    "Generate token"
                  )}
                </button>
              )}

              {/* One-time token reveal */}
              {mcpToken && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-2.5 py-2 space-y-1.5">
                  <p className="text-[10px] text-amber-700 dark:text-amber-400 leading-snug">
                    Copy this token now. For your security it won't be shown
                    again. You can rotate it anytime.
                  </p>
                  <div className="flex items-center gap-1.5">
                    <code className="flex-1 min-w-0 truncate text-[10px] font-mono bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                      {mcpToken}
                    </code>
                    <button
                      onClick={() => copyMcp("token", mcpToken)}
                      className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                    >
                      {mcpCopiedField === "token" ? (
                        <FiCheck size={11} className="text-emerald-500" />
                      ) : (
                        <FiCopy size={11} />
                      )}
                      {mcpCopiedField === "token" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {/* Connection instructions */}
              {mcpStatus.connected && (
                <div>
                  <button
                    onClick={() => setShowMcpInstructions((v) => !v)}
                    className="text-[10px] text-pink-500 hover:text-pink-400 dark:text-pink-400 dark:hover:text-pink-300 transition-colors"
                  >
                    {showMcpInstructions ? "Hide" : "Show"} connection
                    instructions
                  </button>

                  {showMcpInstructions && (
                    <div className="mt-2 space-y-2">
                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          Endpoint
                        </span>
                        <div className="flex items-center gap-1.5">
                          <code className="flex-1 min-w-0 truncate text-[10px] font-mono bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                            {mcpEndpoint}
                          </code>
                          <button
                            onClick={() => copyMcp("endpoint", mcpEndpoint)}
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                          >
                            {mcpCopiedField === "endpoint" ? (
                              <FiCheck size={11} className="text-emerald-500" />
                            ) : (
                              <FiCopy size={11} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          Claude Code (CLI)
                        </span>
                        <div className="flex items-start gap-1.5">
                          <code className="flex-1 min-w-0 text-[10px] font-mono whitespace-pre-wrap break-all bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                            {`claude mcp add --transport http degree-intelligence ${mcpEndpoint} --header "Authorization: Bearer YOUR_TOKEN"`}
                          </code>
                          <button
                            onClick={() =>
                              copyMcp(
                                "cli",
                                `claude mcp add --transport http degree-intelligence ${mcpEndpoint} --header "Authorization: Bearer YOUR_TOKEN"`,
                              )
                            }
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                          >
                            {mcpCopiedField === "cli" ? (
                              <FiCheck size={11} className="text-emerald-500" />
                            ) : (
                              <FiCopy size={11} />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">
                          Claude Desktop (config)
                        </span>
                        <div className="flex items-start gap-1.5">
                          <code className="flex-1 min-w-0 text-[10px] font-mono whitespace-pre-wrap break-all bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/[0.08] rounded-md px-2 py-1.5 text-gray-800 dark:text-gray-200">
                            {`{
  "mcpServers": {
    "degree-intelligence": {
      "command": "npx",
      "args": ["mcp-remote", "${mcpEndpoint}", "--header", "Authorization: Bearer YOUR_TOKEN"]
    }
  }
}`}
                          </code>
                          <button
                            onClick={() =>
                              copyMcp(
                                "desktop",
                                `{\n  "mcpServers": {\n    "degree-intelligence": {\n      "command": "npx",\n      "args": ["mcp-remote", "${mcpEndpoint}", "--header", "Authorization: Bearer YOUR_TOKEN"]\n    }\n  }\n}`,
                              )
                            }
                            className="shrink-0 inline-flex items-center gap-1 px-2 py-1.5 text-[11px] rounded-md border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 transition-all duration-200"
                          >
                            {mcpCopiedField === "desktop" ? (
                              <FiCheck size={11} className="text-emerald-500" />
                            ) : (
                              <FiCopy size={11} />
                            )}
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">
                        Replace YOUR_TOKEN with the token above. Keep it secret:
                        anyone with it can read your degree data.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Majors */}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm px-3 py-2.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Majors
            </label>
            {duplicateMajorError && (
              <div className="mb-1 text-[10px] text-red-400">
                {duplicateMajorError}
              </div>
            )}
            <div className="space-y-1.5">
              {localProfile.majors.map((major, index) => (
                <div key={index} className="relative z-[60] overflow-visible">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1">
                      <MajorDropdown
                        value={major}
                        onChange={(newMajor) =>
                          handleMajorChange(index, newMajor)
                        }
                        disabledOptions={localProfile.majors.filter(
                          (m) => m !== major,
                        )}
                      />
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => handleRemoveMajor(index)}
                        className="text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-colors text-xs"
                        title="Remove major"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {localProfile.majors.length < 2 && (
                <button
                  onClick={handleAddMajor}
                  className="text-[11px] text-pink-400 hover:text-pink-300 flex items-center gap-1"
                  disabled={
                    Object.keys(MAJORS).length === localProfile.majors.length
                  }
                >
                  + Add another major
                </button>
              )}
            </div>
          </div>

          {/* Year */}
          <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm px-3 py-2.5">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Graduation Year
            </label>
            <div className="relative">
              <select
                value={localProfile.graduationYear}
                onChange={(e) =>
                  setLocalProfile({
                    ...localProfile,
                    graduationYear: parseInt(e.target.value),
                  })
                }
                className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/50 text-gray-900 dark:text-gray-200 text-xs transition-all duration-200 appearance-none cursor-pointer"
              >
                {[2027, 2028, 2029, 2030, 2031].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
                <FiChevronDown size={14} />
              </div>
            </div>
          </div>
          </div>
          {/* end two-column section grid */}

          {/* Footer links */}
          <div className="mt-4 flex items-center justify-center gap-1.5 relative">
            <Link
              href={`/user/${user.uid}`}
              className="cursor-pointer text-[11px] px-3 py-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            >
              View public profile
            </Link>
            {onReplayTour && (
              <button
                onClick={onReplayTour}
                className="cursor-pointer text-[11px] px-3 py-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
              >
                Replay tutorial
              </button>
            )}
            <div className="relative group">
              <Info className="h-3 w-3 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer" />
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-800 text-gray-100 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[70] pointer-events-none border border-gray-700">
                Friends only
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-3">
            <div className="flex items-center gap-1.5">
              <motion.button
                onHoverStart={() => setIsHoveringLogout(true)}
                onHoverEnd={() => setIsHoveringLogout(false)}
                onClick={onLogout}
                className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-xs transition-all duration-200"
              >
                <span>Sign out</span>
                <motion.div
                  animate={isHoveringLogout ? { x: 1 } : { x: 0 }}
                  transition={{ type: "spring", stiffness: 500 }}
                >
                  <FiLogOut size={12} />
                </motion.div>
              </motion.button>

              {/* More menu */}
              <div className="relative" ref={moreMenuRef}>
                <button
                  onClick={() => setShowMoreMenu(!showMoreMenu)}
                  className="p-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-all duration-200"
                  title="More options"
                >
                  <FiMoreVertical size={14} />
                </button>

                <AnimatePresence>
                  {showMoreMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -5, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -5, scale: 0.95 }}
                      className="absolute bottom-full left-0 mb-1.5 w-36 bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-800/95 dark:to-gray-900/95 border border-gray-200 dark:border-white/[0.1] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.18)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.4)] backdrop-blur-xl overflow-hidden z-[80]"
                    >
                      <button
                        onClick={() => {
                          setShowMoreMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs transition-all duration-200"
                      >
                        <FiTrash2 size={12} />
                        Delete Account
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300 text-xs transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges() || hasDuplicateMajors()}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                  hasChanges() && !hasDuplicateMajors() && !isSaving
                    ? "bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white"
                    : "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 cursor-not-allowed border border-black/[0.05] dark:border-white/[0.05]"
                }`}
              >
                {isSaving ? "..." : "Save"}
              </button>
            </div>
          </div>

          {/* Delete Account Confirmation Modal */}
          <AnimatePresence>
            {showDeleteConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4"
                onClick={(e) => {
                  if (e.target === e.currentTarget && !isDeleting) {
                    setShowDeleteConfirm(false);
                  }
                }}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                  className="bg-white dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/95 dark:via-gray-900/90 dark:to-gray-950/95 border border-gray-200 dark:border-white/[0.1] rounded-2xl p-4 max-w-xs w-full shadow-[0_16px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 bg-gradient-to-br from-red-500/20 to-red-600/10 rounded-xl border border-red-500/20">
                      <FiTrash2 className="text-red-400" size={16} />
                    </div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      Delete Account
                    </h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">
                    Permanently remove all data including courses, friends, and
                    conversations. Cannot be undone.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.08] hover:border-gray-300 dark:hover:border-white/[0.15] text-gray-700 dark:text-gray-300 text-xs disabled:opacity-50 transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white text-xs disabled:opacity-50 flex items-center gap-1.5 transition-all duration-200"
                    >
                      {isDeleting ? (
                        <>
                          <span className="animate-spin h-2.5 w-2.5 border-2 border-white/30 border-t-white rounded-full" />
                          ...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
