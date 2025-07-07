"use client";

import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import FileUpload from "@/components/file-upload";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div>Loading...</div>
      </main>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="w-96">
        <FileUpload />
      </div>
    </main>
  );
}
