"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
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
  /**
   * True from the moment a sign-in is accepted until the session it produced is
   * live. Firebase resolves the popup before `onAuthStateChanged` fires, so
   * without this the landing page renders again for a beat between the two,
   * which reads as the sign-in having failed.
   */
  authenticating: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authenticating: false,
  signInWithGoogle: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authenticating, setAuthenticating] = useState(false);
  // Read inside signInWithGoogle, where a stale `user` from the closure would
  // decide wrongly whether the session is already live.
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const logout = async () => {
    if (!isFirebaseConfigured) return;
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  // Effects run child-first, so by the time this one lands the dashboard has
  // already started loading its profile and courses and is showing the loader
  // itself. Dropping the flag here therefore hands the loader over rather than
  // uncovering a half-empty dashboard for a frame.
  useEffect(() => {
    if (user) setAuthenticating(false);
  }, [user]);

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
            setAuthenticating(false);
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
      // The account is good. Cover the gap until the auth listener delivers it,
      // unless it already has, in which case nothing would clear the flag.
      if (!userRef.current) setAuthenticating(true);
    } catch (error) {
      setAuthenticating(false);
      console.error("Error signing in with Google", error);
      if (error instanceof Error && error.message.includes("Yale email")) {
        throw error;
      }
      throw new Error("Sign-in failed. Please try again.");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, authenticating, signInWithGoogle, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
