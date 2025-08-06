"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FiLogOut, FiEdit2 } from "react-icons/fi";
import { User } from "firebase/auth";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "../ui/MajorDropdown";
import { YearBadge } from "../ui/YearBadge";
import Link from "next/link";
import { InfoCard } from "../ui/InfoCard";
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
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(
    null
  );

  // Initialize local profile state
  useEffect(() => {
    if (userProfile) {
      setLocalProfile(userProfile);
      setTempBio(userProfile.bio || "");
    }
  }, [userProfile]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const handleToggleDropdown = (index: number) => {
    setActiveDropdownIndex(activeDropdownIndex === index ? null : index);
  };

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

  const hasChanges = () => {
    if (!userProfile || !localProfile) return false;
    return (
      JSON.stringify(userProfile.majors) !==
        JSON.stringify(localProfile.majors) ||
      userProfile.graduationYear !== localProfile.graduationYear ||
      userProfile.bio !== localProfile.bio
    );
  };

  const hasDuplicateMajors = () => {
    if (!localProfile) return false;
    const uniqueMajors = new Set(localProfile.majors);
    return uniqueMajors.size !== localProfile.majors.length;
  };

  const handleAddMajor = () => {
    if (localProfile && localProfile?.majors.length >= 3) return;

    const availableMajor = Object.keys(MAJORS).find(
      (major) => !localProfile?.majors.includes(major)
    );

    if (availableMajor && localProfile) {
      setLocalProfile({
        ...localProfile,
        majors: [...localProfile.majors, availableMajor],
      });
      setDuplicateMajorError(null);
    }
  };

  const handleMajorChange = (index: number, newMajor: string) => {
    if (!localProfile) {
      return;
    }
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
    setLocalProfile({
      ...localProfile,
      majors: newMajors,
    });
  };

  const handleRemoveMajor = (index: number) => {
    if (!localProfile || localProfile.majors.length <= 1) return;

    const newMajors = [...localProfile.majors];
    newMajors.splice(index, 1);
    setLocalProfile({
      ...localProfile,
      majors: newMajors,
    });
    setDuplicateMajorError(null);
  };

  const handleSaveBio = () => {
    if (!localProfile) return;
    setLocalProfile({
      ...localProfile,
      bio: tempBio,
    });
    setIsEditingBio(false);
  };

  const handleSave = async () => {
    if (hasDuplicateMajors()) {
      setDuplicateMajorError("Please remove duplicate majors before saving");
      return;
    }

    if (!localProfile) return;

    await onSave({
      majors: localProfile.majors,
      graduationYear: localProfile.graduationYear,
      bio: localProfile.bio,
    });
  };

  if (!localProfile) return null;

  return (
    <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-6"
      >
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-16 h-16 rounded-full object-cover border-2 border-gray-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium border-2 border-gray-700">
                {user.displayName?.charAt(0) ||
                  user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="text-xl font-medium text-center text-gray-200">
            {user.displayName || "User"}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{user.email}</p>

          {/* Bio Section */}
          {!isEditingBio ? (
            <div className="mt-3 w-full text-center relative group">
              {localProfile.bio ? (
                <p className="text-gray-300 text-sm px-4 py-2 rounded-lg bg-gray-800/50">
                  {localProfile.bio}
                </p>
              ) : (
                <p className="text-gray-500 text-sm italic">No bio yet</p>
              )}
              <button
                onClick={() => setIsEditingBio(true)}
                className="absolute right-1 top-1 p-2 text-gray-200 hover:text-white bg-pink-500 rounded-full hover:bg-pink-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FiEdit2 size={14} />
              </button>
            </div>
          ) : (
            <div className="mt-3 w-full">
              <textarea
                autoFocus
                value={tempBio}
                onChange={(e) => setTempBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-200 resize-none"
                maxLength={200}
                rows={3}
              />
              <div className="flex justify-end mt-2 space-x-2">
                <button
                  onClick={() => setIsEditingBio(false)}
                  className="px-3 py-1 text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveBio}
                  className="px-3 py-1 text-sm bg-pink-600 hover:bg-pink-700 rounded-lg"
                >
                  Set bio
                </button>
              </div>
            </div>
          )}

          {/* Graduation Year Badge */}
          {localProfile.graduationYear && (
            <div className="mt-3">
              <YearBadge graduationYear={localProfile.graduationYear} />
            </div>
          )}
          <div className="mt-4 flex items-center justify-center gap-2 relative">
            <Link
              href={`/user/${user.uid}`}
              className="cursor-pointer text-xs px-4 py-2 rounded-lg border border-gray-800 hover:border-pink-500 hover:bg-gray-900/50 transition-all text-center"
            >
              View your public profile
            </Link>

            <div className="relative group">
              <Info className="h-4 w-4 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" />
              <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none">
                This is only visible to friends you’ve added on
                DegreeIntelligence.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Majors
            </label>
            {duplicateMajorError && (
              <div className="mb-2 text-sm text-red-400">
                {duplicateMajorError}
              </div>
            )}
            <div className="space-y-2">
              {localProfile.majors.map((major, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <MajorDropdown
                    value={major}
                    onChange={(newMajor) => handleMajorChange(index, newMajor)}
                    disabledOptions={localProfile.majors.filter(
                      (m) => m !== major
                    )}
                  />
                  {index > 0 && (
                    <button
                      onClick={() => handleRemoveMajor(index)}
                      className="text-red-400 hover:text-red-300 p-2"
                      title="Remove major"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              {localProfile.majors.length < 2 && (
                <button
                  onClick={handleAddMajor}
                  className="text-sm text-pink-400 hover:text-pink-300 flex items-center"
                  disabled={
                    Object.keys(MAJORS).length === localProfile.majors.length
                  }
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add another major
                </button>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Graduation Year
            </label>
            <input
              type="number"
              min={new Date().getFullYear()}
              max={new Date().getFullYear() + 4}
              value={localProfile.graduationYear}
              onChange={(e) =>
                setLocalProfile({
                  ...localProfile,
                  graduationYear: parseInt(e.target.value),
                })
              }
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
          </div>
        </div>

        <div className="flex justify-between mt-6">
          <div>
            <motion.button
              onHoverStart={() => setIsHoveringLogout(true)}
              onHoverEnd={() => setIsHoveringLogout(false)}
              onClick={onLogout}
              className="flex items-center justify-center space-x-2 px-4 py-2 rounded-lg hover:bg-gray-900/50 transition-all border border-gray-800 hover:border-gray-700"
            >
              <span>Sign out</span>
              <motion.div
                animate={isHoveringLogout ? { x: 2 } : { x: 0 }}
                transition={{ type: "spring", stiffness: 500 }}
              >
                <FiLogOut size={14} />
              </motion.div>
            </motion.button>
          </div>
          <div className="flex gap-3 items-center justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-gray-700 hover:bg-gray-800/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges() || hasDuplicateMajors()}
              className={`px-4 py-2 rounded-lg transition-colors ${
                hasChanges() && !hasDuplicateMajors()
                  ? "bg-pink-600 hover:bg-pink-700"
                  : "bg-gray-800 text-gray-500 cursor-not-allowed"
              }`}
            >
              Save Changes
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
