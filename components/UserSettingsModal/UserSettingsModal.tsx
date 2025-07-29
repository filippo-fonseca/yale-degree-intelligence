"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { FiLogOut } from "react-icons/fi";
import { User } from "firebase/auth";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "../ui/MajorDropdown";

interface UserProfile {
  majors: string[];
  graduationYear: number;
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
  const modalRef = useRef<HTMLDivElement>(null);

  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(
    null
  );

  const handleToggleDropdown = (index: number) => {
    setActiveDropdownIndex(activeDropdownIndex === index ? null : index);
  };

  // Initialize local profile state
  useEffect(() => {
    if (userProfile) {
      setLocalProfile(userProfile);
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

  if (!localProfile) return null;

  const getYearStatus = (graduationYear: number): string => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0 = Jan, 8 = Sep

    // Academic year starts in September
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

  // Check if there are any changes compared to the original profile
  const hasChanges = () => {
    if (!userProfile || !localProfile) return false;
    return (
      JSON.stringify(userProfile.majors) !==
        JSON.stringify(localProfile.majors) ||
      userProfile.graduationYear !== localProfile.graduationYear
    );
  };

  // Check for duplicate majors
  const hasDuplicateMajors = () => {
    if (!localProfile) return false;
    const uniqueMajors = new Set(localProfile.majors);
    return uniqueMajors.size !== localProfile.majors.length;
  };

  // Handle adding a new major
  const handleAddMajor = () => {
    if (localProfile.majors.length >= 3) return; // Limit to 3 majors

    // Find first major not already selected
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

  // Handle major change
  const handleMajorChange = (index: number, newMajor: string) => {
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

  // Handle major removal
  const handleRemoveMajor = (index: number) => {
    if (localProfile.majors.length <= 1) return; // Must have at least one major

    const newMajors = [...localProfile.majors];
    newMajors.splice(index, 1);
    setLocalProfile({
      ...localProfile,
      majors: newMajors,
    });
    setDuplicateMajorError(null);
  };

  // Handle save
  const handleSave = async () => {
    if (hasDuplicateMajors()) {
      setDuplicateMajorError("Please remove duplicate majors before saving");
      return;
    }

    await onSave({
      majors: localProfile.majors,
      graduationYear: localProfile.graduationYear,
    });
  };

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
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-medium border-2 border-gray-700">
                {user.displayName?.charAt(0) ||
                  user.email?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <h2 className="text-xl font-medium text-center text-gray-200">
            {user.displayName || "User"}
          </h2>
          <p className="text-gray-400 text-sm mt-1">{user.email}</p>

          {/* Graduation Year Badge */}
          {localProfile.graduationYear && (
            <div className="mt-3 flex items-center">
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full flex items-center">
                <span
                  className={`w-2 h-2 rounded-full mr-1.5 ${
                    getYearStatus(localProfile.graduationYear) === "Freshman"
                      ? "bg-green-400"
                      : getYearStatus(localProfile.graduationYear) ===
                        "Sophomore"
                      ? "bg-blue-400"
                      : getYearStatus(localProfile.graduationYear) === "Junior"
                      ? "bg-yellow-400"
                      : "bg-purple-400"
                  }`}
                ></span>
                <span className="text-gray-300">
                  {getYearStatus(localProfile.graduationYear)} • Class of{" "}
                  {localProfile.graduationYear}
                </span>
              </span>
            </div>
          )}
          <motion.button
            onHoverStart={() => setIsHoveringLogout(true)}
            onHoverEnd={() => setIsHoveringLogout(false)}
            onClick={onLogout}
            className="flex items-center justify-center space-x-2 text-xs px-4 py-2 rounded-lg hover:bg-gray-900/50 transition-all border border-gray-800 hover:border-gray-700 mt-4"
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
              {localProfile.majors.length < 3 && (
                <button
                  onClick={handleAddMajor}
                  className="text-sm text-blue-400 hover:text-blue-300 flex items-center"
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
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
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
                ? "bg-blue-600 hover:bg-blue-700"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}
