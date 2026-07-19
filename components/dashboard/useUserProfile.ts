import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import type { UserProfile } from "./types";

export function useUserProfile(user: User | null) {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [selectedMajor, setSelectedMajor] = useState<string>("");
  const [showMajorSelection, setShowMajorSelection] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfileLoading(false);
      setUserProfile(null);
      return;
    }

    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserProfile;
          setUserProfile(data);
          setSelectedMajor((current) => {
            const majors = data.majors || [];
            if (!current || !majors.includes(current)) {
              return majors[0] || "";
            }
            return current;
          });
          setShowMajorSelection(false);
        } else {
          setUserProfile(null);
          setShowMajorSelection(true);
        }
        setProfileLoading(false);
      },
      (error) => {
        console.error("Error subscribing to user profile:", error);
        setProfileLoading(false);
      },
    );
    return () => unsub();
  }, [user]);

  const isBrandNew = userProfile?.graduationYear === 2030;

  const handleProfileUpdate = async (updatedProfile: Partial<UserProfile>) => {
    if (!user) return;

    try {
      let isFirstWrite = false;
      if (!userProfile) {
        const existingSnap = await getDoc(doc(db, "users", user.uid));
        isFirstWrite = !existingSnap.exists();
      }

      await setDoc(
        doc(db, "users", user.uid),
        {
          ...userProfile,
          ...updatedProfile,
          updatedAt: new Date(),
          ...(isFirstWrite ? { createdAt: new Date() } : {}),
        },
        { merge: true },
      );

      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
        if (updatedProfile.majors) {
          setSelectedMajor(updatedProfile.majors[0] || "");
        }
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const handleTogglePrereqOverride = async (code: string) => {
    if (!user) return;
    const current = userProfile?.prereqOverrides || [];
    const next = current.includes(code)
      ? current.filter((c) => c !== code)
      : [...current, code];
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { prereqOverrides: next, updatedAt: new Date() },
        { merge: true },
      );
    } catch (error) {
      console.error("Error updating prerequisite overrides:", error);
    }
  };

  return {
    userProfile,
    profileLoading,
    selectedMajor,
    setSelectedMajor,
    showMajorSelection,
    setShowMajorSelection,
    isBrandNew,
    handleProfileUpdate,
    handleTogglePrereqOverride,
  };
}
