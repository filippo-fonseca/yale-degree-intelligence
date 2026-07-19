"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/config/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

export function useDistributionalPreferences() {
  const { user } = useAuth();
  const [autoAllocate, setAutoAllocate] = useState(true);
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // Load the user's saved allocation preferences once.
  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!active || !snap.exists()) return;
        const data = snap.data() as {
          distributionalAutoAllocate?: boolean;
          distributionalAllocations?: Record<string, string>;
        };
        if (typeof data.distributionalAutoAllocate === "boolean")
          setAutoAllocate(data.distributionalAutoAllocate);
        if (data.distributionalAllocations)
          setOverrides(data.distributionalAllocations);
      } catch {
        // non-fatal: fall back to auto allocation
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  const persist = (
    nextAuto: boolean,
    nextOverrides: Record<string, string>,
  ) => {
    if (!user) return;
    setDoc(
      doc(db, "users", user.uid),
      {
        distributionalAutoAllocate: nextAuto,
        distributionalAllocations: nextOverrides,
      },
      { merge: true },
    ).catch(() => {
      // non-fatal: UI state is already updated optimistically
    });
  };

  const setAuto = (next: boolean) => {
    setAutoAllocate(next);
    persist(next, overrides);
  };

  const reassign = (courseCode: string, reqCode: string) => {
    const next = { ...overrides, [courseCode]: reqCode };
    setOverrides(next);
    persist(autoAllocate, next);
  };

  return {
    autoAllocate,
    overrides,
    setAuto,
    reassign,
  };
}
