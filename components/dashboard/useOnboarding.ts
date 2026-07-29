import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import type { UserProfile } from "./types";

export function useOnboarding(user: User | null, userProfile: UserProfile | null) {
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [onboardChecked, setOnboardChecked] = useState(false);

  useEffect(() => {
    if (onboardChecked || !user || !userProfile) return;
    setOnboardChecked(true);
    if (!userProfile.hasSeenV3Welcome) {
      setWelcomeOpen(true);
    } else if (!userProfile.hasSeenTutorial) {
      setTourOpen(true);
    }
  }, [user, userProfile, onboardChecked]);

  return {
    welcomeOpen,
    setWelcomeOpen,
    tourOpen,
    setTourOpen,
  };
}
