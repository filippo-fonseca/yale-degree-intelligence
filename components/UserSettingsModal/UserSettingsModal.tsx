"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FiLogOut,
  FiMoreVertical,
  FiTrash2,
  FiX,
} from "react-icons/fi";
import Link from "next/link";
import { toast } from "react-hot-toast";
import { Info } from "lucide-react";
import { UserAvatar } from "../ui/UserAvatar";
import { YearBadge } from "../ui/YearBadge";
import { useIsAdmin } from "@/lib/useIsAdmin";
import type { UserSettingsModalProps } from "./settingsTypes";
import { useUserProfileForm } from "./useUserProfileForm";
import { SettingsProfileSection } from "./SettingsProfileSection";
import { SettingsAcademicSection } from "./SettingsAcademicSection";
import { SettingsConfirmModals } from "./SettingsConfirmModals";

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
  onReplayWelcome,
  onReplayTutorial,
}: UserSettingsModalProps) {
  const { isAdmin: isOwner } = useIsAdmin(user);
  const [isHoveringLogout, setIsHoveringLogout] = useState(false);

  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  const [isTogglingFriends, setIsTogglingFriends] = useState(false);
  const [showDisableFriendsConfirm, setShowDisableFriendsConfirm] =
    useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);

  const profileForm = useUserProfileForm(userProfile, onSave);
  const {
    localProfile,
    setLocalProfile,
    hasChangesSinceOpen,
    handleRevertAll,
    isReverting,
    duplicateMajorError,
    duplicateCertificateError,
    autoOpenCertificateIndex,
    autoOpenMajorIndex,
    isSaving,
    isEditingBio,
    setIsEditingBio,
    tempBio,
    setTempBio,
    isSavingBio,
    bioJustSaved,
    setBioJustSaved,
    bioCount,
    setBioCount,
    hasChanges,
    isDirty,
    hasDuplicateMajors,
    hasDuplicateCertificates,
    handleAddMajor,
    handleMajorChange,
    handleRemoveMajor,
    handleAddCertificate,
    handleCertificateChange,
    handleRemoveCertificate,
    handleSaveBio,
    handleCancelBio,
    handleSave,
  } = profileForm;

  /**
   * The only way out of Settings.
   *
   * The academic fields are the one thing here that is held locally, so
   * leaving with them dirty loses work. Clicking outside already asked; the
   * close button, Done, and Escape did not, and quietly threw the edit away.
   * They all come through here now.
   */
  const requestClose = useCallback(() => {
    if (hasChanges()) {
      setShowUnsavedConfirm(true);
      return;
    }
    onClose();
  }, [hasChanges, onClose]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-major-dropdown-portal="true"]')) return;
      if (target.closest('[data-certificate-dropdown-portal="true"]')) return;
      // A confirmation is already asking something. It owns the screen until
      // it is answered, and it closes on its own backdrop.
      if (showUnsavedConfirm || showDeleteConfirm || showDisableFriendsConfirm) {
        return;
      }
      if (modalRef.current && !modalRef.current.contains(target)) {
        requestClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [
    requestClose,
    showUnsavedConfirm,
    showDeleteConfirm,
    showDisableFriendsConfirm,
  ]);

  // Escape closes the innermost thing that is open, so it only reaches
  // Settings once the dropdowns and the confirmations have had their turn.
  // Each confirmation is a ModalShell and handles the key itself; on the
  // unsaved-changes one that means "keep editing", the safe answer.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (showDeleteConfirm || showDisableFriendsConfirm || showUnsavedConfirm) {
        return;
      }
      if (
        document.querySelector(
          '[data-major-dropdown-portal="true"], [data-certificate-dropdown-portal="true"]',
        )
      ) {
        return;
      }
      requestClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [
    requestClose,
    showDeleteConfirm,
    showDisableFriendsConfirm,
    showUnsavedConfirm,
  ]);

  const handleSaveAndClose = async () => {
    const saved = await handleSave();
    if (!saved) return;
    setShowUnsavedConfirm(false);
    onClose();
  };

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
      toast.error(
        error instanceof Error ? error.message : "Failed to delete account",
      );
      setIsDeleting(false);
    }
  };

  const handleEnableFriends = async () => {
    setIsTogglingFriends(true);
    try {
      await onToggleFriends(true);
    } finally {
      setIsTogglingFriends(false);
    }
  };

  const handleConfirmDisableFriends = async () => {
    setIsTogglingFriends(true);
    try {
      await onToggleFriends(false);
      setShowDisableFriendsConfirm(false);
    } finally {
      setIsTogglingFriends(false);
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
          onClick={requestClose}
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
            <SettingsProfileSection
              localProfile={localProfile}
              isEditingBio={isEditingBio}
              setIsEditingBio={setIsEditingBio}
              tempBio={tempBio}
              setTempBio={setTempBio}
              bioCount={bioCount}
              setBioCount={setBioCount}
              bioJustSaved={bioJustSaved}
              setBioJustSaved={setBioJustSaved}
              isSavingBio={isSavingBio}
              handleCancelBio={handleCancelBio}
              handleSaveBio={handleSaveBio}
              friendsEnabled={friendsEnabled}
              isTogglingFriends={isTogglingFriends}
              onRequestDisableFriends={() => setShowDisableFriendsConfirm(true)}
              onEnableFriends={handleEnableFriends}
            />

            <SettingsAcademicSection
              localProfile={localProfile}
              duplicateMajorError={duplicateMajorError}
              duplicateCertificateError={duplicateCertificateError}
              autoOpenCertificateIndex={autoOpenCertificateIndex}
              autoOpenMajorIndex={autoOpenMajorIndex}
              handleAddMajor={handleAddMajor}
              handleMajorChange={handleMajorChange}
              handleRemoveMajor={handleRemoveMajor}
              handleAddCertificate={handleAddCertificate}
              handleCertificateChange={handleCertificateChange}
              handleRemoveCertificate={handleRemoveCertificate}
              setLocalProfile={setLocalProfile}
              isDirty={isDirty}
              isSaving={isSaving}
              onSave={handleSave}
              canSave={
                isDirty && !hasDuplicateMajors() && !hasDuplicateCertificates()
              }
            />
          </div>
          {/* end two-column section grid */}

          {/* Footer links */}
          <div className="mt-4 flex items-center justify-center gap-1.5 relative">
            <Link
              href={`/user/${user.uid}`}
              target="_blank"
              className="cursor-pointer text-[11px] px-3 py-1.5 rounded-lg border border-black/[0.06] dark:border-white/[0.08] hover:border-pink-500/50 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200"
            >
              Open my page
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

          {/* Creator-only Dev tools (filippo.fonseca@yale.edu + filifonsecacagnazzo@gmail.com). */}
          {isOwner && (onReplayWelcome || onReplayTutorial) && (
            <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-50/60 dark:border-amber-400/20 dark:bg-amber-500/[0.06] px-3.5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-400">
                  Dev
                </span>
                <span className="text-[10px] font-medium text-amber-700/80 dark:text-amber-300/70">
                  Onboarding replay
                </span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {onReplayWelcome && (
                  <button
                    type="button"
                    onClick={onReplayWelcome}
                    className="cursor-pointer text-[11px] px-2.5 py-1.5 rounded-lg border border-amber-400/40 bg-white/70 dark:bg-white/[0.04] hover:border-amber-500/70 hover:bg-amber-100/60 dark:hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-all duration-200"
                  >
                    Replay welcome + tutorial (new-user v3)
                  </button>
                )}
                {onReplayTutorial && (
                  <button
                    type="button"
                    onClick={onReplayTutorial}
                    className="cursor-pointer text-[11px] px-2.5 py-1.5 rounded-lg border border-amber-400/40 bg-white/70 dark:bg-white/[0.04] hover:border-amber-500/70 hover:bg-amber-100/60 dark:hover:bg-amber-500/10 text-amber-700 dark:text-amber-300 transition-all duration-200"
                  >
                    Replay tutorial only
                  </button>
                )}
              </div>
              <p className="mt-2 text-[10px] leading-relaxed text-amber-700/70 dark:text-amber-300/60">
                Dev only. Resets onboarding flags. Does not delete plans or
                courses.
              </p>
            </div>
          )}

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
                        className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300 text-xs transition-all duration-200"
                      >
                        <FiTrash2 size={12} />
                        Delete Account
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* No Save here any more. The academic fields save from the
                  panel they live in, and everything else in Settings writes on
                  change, so a Save at the bottom claimed authority over
                  toggles it never touched. What is genuinely missing without
                  it is a way back, which is what Revert is: it restores the
                  profile to how Settings found it, including edits already
                  written to the server. */}
              {hasChangesSinceOpen() && (
                <button
                  type="button"
                  onClick={handleRevertAll}
                  disabled={isReverting}
                  title="Undo every change made since you opened Settings"
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-white px-4 py-2 font-sf text-sm font-medium text-gray-600 transition-colors hover:text-gray-900 disabled:opacity-50 dark:border-white/15 dark:bg-white/[0.06] dark:text-gray-300 dark:hover:text-white"
                >
                  {isReverting ? "Reverting..." : "Revert changes"}
                </button>
              )}
              <button
                type="button"
                onClick={requestClose}
                className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 font-sf text-sm font-medium text-white transition-colors hover:bg-gray-700 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
              >
                Done
              </button>
            </div>
          </div>

          <SettingsConfirmModals
            showDisableFriendsConfirm={showDisableFriendsConfirm}
            setShowDisableFriendsConfirm={setShowDisableFriendsConfirm}
            isTogglingFriends={isTogglingFriends}
            onConfirmDisableFriends={handleConfirmDisableFriends}
            showUnsavedConfirm={showUnsavedConfirm}
            setShowUnsavedConfirm={setShowUnsavedConfirm}
            onSaveAndClose={handleSaveAndClose}
            isSaving={isSaving}
            canSave={!hasDuplicateMajors() && !hasDuplicateCertificates()}
            onClose={onClose}
            showDeleteConfirm={showDeleteConfirm}
            setShowDeleteConfirm={setShowDeleteConfirm}
            isDeleting={isDeleting}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
      </motion.div>
    </div>
  );
}
