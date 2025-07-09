// src/components/LoginPage.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-6 neumorphic-card rounded-xl">
        <h1 className="text-2xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
          Yale Document Processor
        </h1>
        <p className="text-center text-gray-400">
          Please sign in with your Yale Google account to continue
        </p>
        <Button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full neumorphic-btn-active bg-gradient-to-br from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700 text-white"
        >
          {loading ? "Loading..." : "Sign in with Google"}
        </Button>
      </div>
    </div>
  );
}
