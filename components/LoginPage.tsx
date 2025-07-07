"use client";

import { useAuth } from "@/context/AuthContext";
import { Button } from "./ui/button";

export default function LoginPage() {
  const { signInWithGoogle, loading } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md dark:bg-gray-800">
        <h1 className="text-2xl font-bold text-center">
          Yale Document Processor
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-400">
          Please sign in with your Yale Google account to continue
        </p>
        <Button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Loading..." : "Sign in with Google"}
        </Button>
      </div>
    </div>
  );
}
