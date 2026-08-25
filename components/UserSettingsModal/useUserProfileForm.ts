import { useEffect, useRef, useState } from "react";
import { MAJORS } from "@/lib/majors";
import { CERTIFICATES } from "@/lib/certificates";
import type { EditableProfile, UserProfile } from "./settingsTypes";

export const BIO_MAX = 200;

export function useUserProfileForm(
  userProfile: UserProfile | null,
  onSave: (updatedProfile: Partial<UserProfile>) => Promise<void>,
) {
  const [localProfile, setLocalProfile] = useState<EditableProfile | null>(
    null,
  );
  const [duplicateMajorError, setDuplicateMajorError] = useState<string | null>(
    null,
  );
  const [duplicateCertificateError, setDuplicateCertificateError] = useState<
    string | null
  >(null);
  const [autoOpenCertificateIndex, setAutoOpenCertificateIndex] = useState<
    number | null
  >(null);
  // Adding a row and then having to click it to choose is two clicks for one
  // intention. The new row opens its own menu, the way certificates already do.
  const [autoOpenMajorIndex, setAutoOpenMajorIndex] = useState<number | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [isSavingBio, setIsSavingBio] = useState(false);
  const [bioJustSaved, setBioJustSaved] = useState(false);
  const [bioCount, setBioCount] = useState(0);

  /**
   * The profile as it stood when Settings opened.
   *
   * Most of this panel writes the moment you touch it: the bio saves on its
   * own button, the toggles save on flip. So "discard" cannot mean "drop the
   * unsaved edits", because by then there usually are none. Revert has to be
   * able to put back what was already written, which means remembering the
   * state we started from rather than diffing against the live document.
   *
   * Captured once per mount. The modal unmounts when closed, so every open
   * starts a fresh baseline.
   */
  const openSnapshot = useRef<EditableProfile | null>(null);
  const [isReverting, setIsReverting] = useState(false);

  useEffect(() => {
    if (userProfile) {
      const next = {
        ...userProfile,
        certificates: userProfile.certificates ?? [],
      };
      if (!openSnapshot.current) openSnapshot.current = next;
      setLocalProfile(next);
      setTempBio(userProfile.bio || "");
      setBioCount((userProfile.bio || "").length);
    }
  }, [userProfile]);

  /**
   * Anything different from the baseline, saved or not: the academic fields
   * held locally, and the bio, which has already been written by the time it
   * differs.
   */
  const hasChangesSinceOpen = () => {
    const base = openSnapshot.current;
    if (!base || !localProfile) return false;
    return (
      JSON.stringify(base.majors) !== JSON.stringify(localProfile.majors) ||
      JSON.stringify(base.certificates ?? []) !==
        JSON.stringify(localProfile.certificates) ||
      base.graduationYear !== localProfile.graduationYear ||
      (base.bio || "") !== (userProfile?.bio || "")
    );
  };

  /** Put the profile back exactly as Settings found it, and persist that. */
  const handleRevertAll = async () => {
    const base = openSnapshot.current;
    if (!base) return;
    try {
      setIsReverting(true);
      await onSave({
        majors: base.majors,
        certificates: base.certificates ?? [],
        graduationYear: base.graduationYear,
        bio: base.bio || "",
      });
      setLocalProfile({ ...base, certificates: base.certificates ?? [] });
      setTempBio(base.bio || "");
      setBioCount((base.bio || "").length);
      setIsEditingBio(false);
      setDuplicateMajorError(null);
      setDuplicateCertificateError(null);
    } finally {
      setIsReverting(false);
    }
  };

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
      JSON.stringify(userProfile.certificates ?? []) !==
        JSON.stringify(localProfile.certificates) ||
      userProfile.graduationYear !== localProfile.graduationYear
    );
  };

  const isDirty = hasChanges();

  const hasDuplicateMajors = () => {
    if (!localProfile) return false;
    const uniqueMajors = new Set(localProfile.majors);
    return uniqueMajors.size !== localProfile.majors.length;
  };

  const hasDuplicateCertificates = () => {
    if (!localProfile) return false;
    const uniqueCertificates = new Set(localProfile.certificates);
    return uniqueCertificates.size !== localProfile.certificates.length;
  };

  const handleAddMajor = () => {
    if (!localProfile || localProfile.majors.length >= 2) return;
    const availableMajor = Object.keys(MAJORS).find(
      (major) => !localProfile.majors.includes(major),
    );
    if (availableMajor) {
      const newIndex = localProfile.majors.length;
      setLocalProfile({
        ...localProfile,
        majors: [...localProfile.majors, availableMajor],
      });
      setAutoOpenMajorIndex(newIndex);
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
    setAutoOpenMajorIndex(null);
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

  const handleAddCertificate = () => {
    if (!localProfile || localProfile.certificates.length >= 3) return;
    const availableCertificate = Object.keys(CERTIFICATES).find(
      (cert) => !localProfile.certificates.includes(cert),
    );
    if (availableCertificate) {
      const newIndex = localProfile.certificates.length;
      setLocalProfile({
        ...localProfile,
        certificates: [...localProfile.certificates, availableCertificate],
      });
      setDuplicateCertificateError(null);
      setAutoOpenCertificateIndex(newIndex);
    }
  };

  const handleCertificateChange = (index: number, newCertificate: string) => {
    if (!localProfile) return;
    if (
      localProfile.certificates.includes(newCertificate) &&
      localProfile.certificates[index] !== newCertificate
    ) {
      setDuplicateCertificateError(
        "You can't select the same certificate twice",
      );
      return;
    }
    setDuplicateCertificateError(null);
    const newCertificates = [...localProfile.certificates];
    newCertificates[index] = newCertificate;
    setLocalProfile({ ...localProfile, certificates: newCertificates });
    setAutoOpenCertificateIndex(null);
  };

  const handleRemoveCertificate = (index: number) => {
    if (!localProfile) return;
    const newCertificates = [...localProfile.certificates];
    newCertificates.splice(index, 1);
    setLocalProfile({ ...localProfile, certificates: newCertificates });
    setDuplicateCertificateError(null);
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
    if (hasDuplicateCertificates()) {
      setDuplicateCertificateError(
        "Please remove duplicate certificates before saving",
      );
      return;
    }
    if (!localProfile) return;
    try {
      setIsSaving(true);
      await onSave({
        majors: localProfile.majors,
        certificates: localProfile.certificates,
        graduationYear: localProfile.graduationYear,
      });
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
    getYearStatus,
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
  };
}
