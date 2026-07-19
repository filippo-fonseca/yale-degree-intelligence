import { useEffect, useState } from "react";
import { MAJORS } from "@/lib/majors";
import type { UserProfile } from "./settingsTypes";

export const BIO_MAX = 200;

export function useUserProfileForm(
  userProfile: UserProfile | null,
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>,
) {
  const [localProfile, setLocalProfile] = useState<UserProfile | null>(null);
  const [duplicateMajorError, setDuplicateMajorError] = useState<string | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioJustSaved, setBioJustSaved] = useState(false);
  const [bioCount, setBioCount] = useState(0);

  useEffect(() => {
    if (userProfile) {
      setLocalProfile(userProfile);
      setTempBio(userProfile.bio || "");
      setBioCount((userProfile.bio || "").length);
    }
  }, [userProfile]);

  const getYearStatus = (graduationYear: number): string => {
    if (graduationYear >= 2031) return "High School";
    if (graduationYear === 2030) return "Freshman";
    if (graduationYear === 2029) return "Sophomore";
    if (graduationYear === 2028) return "Junior";
    if (graduationYear <= 2027) return "Senior";
    return "Unknown";
  };

  const hasChanges = () => {
    if (!userProfile || !localProfile) return false;
    return (
      JSON.stringify(userProfile.majors) !==
        JSON.stringify(localProfile.majors) ||
      userProfile.graduationYear !== localProfile.graduationYear
    );
  };

  const isDirty = hasChanges();

  const hasDuplicateMajors = () => {
    if (!localProfile) return false;
    const uniqueMajors = new Set(localProfile.majors);
    return uniqueMajors.size !== localProfile.majors.length;
  };

  const handleAddMajor = () => {
    if (!localProfile || localProfile.majors.length >= 2) return;
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

  const handleSaveBio = async () => {
    if (!localProfile) return;
    try {
      setIsSavingBio(true);
      setBioJustSaved(false);
      const trimmed = tempBio.trim();
      await onSave({ bio: trimmed });
      setLocalProfile({ ...localProfile, bio: trimmed });
      setBioJustSaved(true);
      setTimeout(() => setBioJustSaved(false), 1500);
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

  return {
    localProfile,
    setLocalProfile,
    duplicateMajorError,
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
    getYearStatus,
    hasChanges,
    isDirty,
    hasDuplicateMajors,
    handleAddMajor,
    handleMajorChange,
    handleRemoveMajor,
    handleSaveBio,
    handleCancelBio,
    handleSave,
  };
}
