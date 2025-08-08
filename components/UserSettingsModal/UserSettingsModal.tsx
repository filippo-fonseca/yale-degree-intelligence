"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FiLogOut, FiEdit2 } from "react-icons/fi";
import { User } from "firebase/auth";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "../ui/MajorDropdown";
import { YearBadge } from "../ui/YearBadge";
import Link from "next/link";
import { Info } from "lucide-react";

interface UserProfile {
  majors: string[];
  graduationYear: number;
  bio?: string;
  updatedAt: Date;
}

interface UserSettingsModalProps {
  user: User;
  userProfile: UserProfile | null;
  onClose: () => void;
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>;
  onLogout: () => void;
}

export default function UserSettingsModal({
  user,
  userProfile,
  onClose,
  onSave,
  onLogout,
}: UserSettingsModalProps) {
  const [isHoveringLogout, setIsHoveringLogout] = useState(false);
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [duplicateMajorError, setDuplicateMajorError] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  // Bio edit flow
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioJustSaved, setBioJustSaved] = useState(false);
  const [bioCount, setBioCount] = useState(0);

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

  const getYearStatus = (graduationYear: number): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const academicYear = currentMonth >= 8 ? currentYear + 1 : currentYear;
    const yearsRemaining = graduationYear - academicYear;

    if (yearsRemaining > 4) return "High School";
    if (yearsRemaining === 4) return "Freshman";
    if (yearsRemaining === 3) return "Sophomore";
    if (yearsRemaining === 2) return "Junior";
    if (yearsRemaining === 1) return "Senior";
    if (yearsRemaining <= 0) return "Graduated";
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
      (major) => !localProfile.majors.includes(major)
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

  if (!localProfile) return null;

  return (
    <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 shadow-xl overflow-visible"
      >
        <div className="p-5 max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="flex flex-col items-center mb-4">
            <div className="relative mb-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-14 h-14 rounded-full object-cover border border-gray-700"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-lg font-medium border border-gray-700">
                  {user.displayName?.charAt(0) ||
                    user.email?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <h2 className="text-lg font-semibold text-center text-gray-100">
              {user.displayName || "User"}
            </h2>
            <p className="text-gray-400 text-sm mt-0.5">{user.email}</p>
            {localProfile.graduationYear && (
              <div className="mt-1.5">
                <YearBadge graduationYear={localProfile.graduationYear} />
              </div>
            )}
          </div>

          {/* Bio */}
          <div className="mb-4 rounded-lg border border-gray-800 bg-gray-900/60">
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800">
              <span className="text-sm font-medium text-gray-300">Bio</span>
              {!isEditingBio && (
                <button
                  onClick={() => setIsEditingBio(true)}
                  className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded border border-gray-700 hover:border-pink-500 hover:bg-gray-900/60 text-gray-300 transition-colors"
                  title="Edit bio"
                >
                  <FiEdit2 className="h-3.5 w-3.5" />
                  Edit
                </button>
              )}
            </div>
            {!isEditingBio ? (
              <div className="px-3 py-2">
                {localProfile.bio ? (
                  <p className="text-gray-300 text-sm leading-snug">
                    {localProfile.bio}
                  </p>
                ) : (
                  <p className="text-gray-500 text-sm italic">No bio yet</p>
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
                      // once user types again, clear the saved indicator
                      if (bioJustSaved) setBioJustSaved(false);
                    }}
                    placeholder="Tell us about yourself..."
                    maxLength={BIO_MAX}
                    rows={3}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 pr-12 focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-200 placeholder:text-gray-500 text-sm resize-none"
                  />
                  <div className="absolute bottom-1.5 right-3 text-xs text-gray-500">
                    {bioCount}/{BIO_MAX}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={handleCancelBio}
                    disabled={isSavingBio}
                    className="px-2.5 py-1 text-xs rounded border border-gray-700 hover:bg-gray-800/60 text-gray-300 disabled:opacity-70"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBio}
                    disabled={isSavingBio}
                    className={`px-2.5 py-1 text-xs rounded text-white disabled:opacity-70 ${
                      bioJustSaved
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-pink-600 hover:bg-pink-700"
                    }`}
                  >
                    {isSavingBio
                      ? "Saving..."
                      : bioJustSaved
                      ? "Saved"
                      : "Set bio"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Majors */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Majors
            </label>
            {duplicateMajorError && (
              <div className="mb-1 text-xs text-red-400">
                {duplicateMajorError}
              </div>
            )}
            <div className="space-y-2">
              {localProfile.majors.map((major, index) => (
                <div key={index} className="relative z-[60] overflow-visible">
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <MajorDropdown
                        value={major}
                        onChange={(newMajor) =>
                          handleMajorChange(index, newMajor)
                        }
                        disabledOptions={localProfile.majors.filter(
                          (m) => m !== major
                        )}
                      />
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => handleRemoveMajor(index)}
                        className="text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-red-400/10 transition-colors text-sm"
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
                  className="text-xs text-pink-400 hover:text-pink-300 flex items-center gap-1"
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
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Graduation Year
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 6}
              value={localProfile.graduationYear}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  graduationYear: Number.isNaN(parseInt(e.target.value))
                    ? localProfile.graduationYear
                    : parseInt(e.target.value),
                })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500 text-gray-200 text-sm"
            />
          </div>

          {/* Footer links */}
          <div className="mt-2 flex items-center justify-center gap-2 relative">
            <Link
              href={`/user/${user.uid}`}
              className="cursor-pointer text-xs px-3 py-1.5 rounded border border-gray-800 hover:border-pink-500 hover:bg-gray-900/50 text-gray-300"
            >
              View profile
            </Link>
            <div className="relative group">
              <Info className="h-3.5 w-3.5 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" />
              <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-[11px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-[70] pointer-events-none border border-gray-700">
                Visible to friends only
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between mt-4">
            <motion.button
              onHoverStart={() => setIsHoveringLogout(true)}
              onHoverEnd={() => setIsHoveringLogout(false)}
              onClick={onLogout}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-gray-800 hover:border-gray-700 text-gray-200 text-sm"
            >
              <span>Sign out</span>
              <motion.div
                animate={isHoveringLogout ? { x: 1 } : { x: 0 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <FiLogOut size={14} />
              </motion.div>
            </motion.button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded border border-gray-700 hover:bg-gray-800/50 text-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !hasChanges() || hasDuplicateMajors()}
                className={`px-3 py-1.5 rounded text-sm ${
                  hasChanges() && !hasDuplicateMajors() && !isSaving
                    ? "bg-pink-600 hover:bg-pink-700 text-white"
                    : "bg-gray-800 text-gray-500 cursor-not-allowed"
                }`}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
