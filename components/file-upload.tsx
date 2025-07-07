"use client";

import { useState } from "react";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";
import { useAuth } from "@/context/AuthContext";

export default function FileUpload() {
  const [rawText, setRawText] = useState("");
  const [extracted, setExtracted] = useState("");
  const { user, logout } = useAuth();

  async function handleUpload(fileItems: any[]) {
    const formData = new FormData();
    formData.append("filepond", fileItems[0].file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    setRawText(data.text);

    const extractRes = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: data.text }),
    });

    const extractData = await extractRes.json();
    setExtracted(extractData.result);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm">Logged in as: {user?.email}</p>
        </div>
        <button
          onClick={logout}
          className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          Logout
        </button>
      </div>
      <FilePond allowMultiple={false} onupdatefiles={handleUpload} />
      {extracted && (
        <div className="whitespace-pre-wrap p-4 border rounded bg-gray-100 dark:bg-gray-800 text-sm text-black dark:text-white">
          {extracted}
        </div>
      )}
    </div>
  );
}
