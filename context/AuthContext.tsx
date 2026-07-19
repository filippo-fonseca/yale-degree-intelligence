"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider } from "@/config/firebase";
import { isAdminEmail } from "@/lib/admin";

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

function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  if (email.endsWith("@yale.edu")) return true;
  if (
    process.env.NODE_ENV === "development" &&
    isAdminEmail(email)
  ) {
    return true;
  }
  return false;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        if (isAllowedEmail(firebaseUser.email)) {
          setUser(firebaseUser);
        } else {
          logout();
          setUser(null);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (!isAllowedEmail(result.user.email)) {
        await logout();
        throw new Error("Only valid Yale email addresses are allowed. Sorry!! :)");
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
