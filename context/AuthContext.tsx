"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/config/firebase";
import { isYaleEmail } from "@/lib/allowedEmail";

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Yale addresses are a rule, so the browser can decide immediately.
        // Anything else might be a configured operator, and the operator list is
        // deliberately server-side, so ask rather than shipping the list here.
        // Either way this is only about ending the session early: every API
        // route re-checks the token itself.
        if (isYaleEmail(firebaseUser.email)) {
          setUser(firebaseUser);
        } else {
          void (async () => {
            try {
              const token = await firebaseUser.getIdToken();
              const res = await fetch("/api/me", {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                setUser(firebaseUser);
                return;
              }
            } catch {
              // Fall through to sign-out: failing closed is right here.
            }
            logout();
            setUser(null);
          })();
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    if (!isFirebaseConfigured) {
      throw new Error("Firebase is not configured");
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // Same split as the listener above: Yale is decidable here, anything else
      // has to be confirmed by the server, which owns the operator list.
      if (!isYaleEmail(result.user.email)) {
        const token = await result.user.getIdToken();
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          await logout();
          throw new Error(
            "Only valid Yale email addresses are allowed. Sorry!! :)",
          );
        }
      }
    } catch (error) {
      console.error("Error signing in with Google", error);
      if (error instanceof Error && error.message.includes("Yale email")) {
        throw error;
      }
      throw new Error("Sign-in failed. Please try again.");
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
