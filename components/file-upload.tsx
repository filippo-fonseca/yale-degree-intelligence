"use client";

import { useState } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import "./filepond-custom.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import CustomLoader from "./ui/CustomLoader";
import Link from "next/link";

registerPlugin(FilePondPluginFileValidateType);

type FileUploadProps = {
  onSuccess: (extractedText: string) => Promise<void>;
};

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload(fileItems: any[]) {
    try {
      setIsProcessing(true);
      setError(null);

      if (!fileItems || fileItems.length === 0) {
        throw new Error("No file selected");
      }

      const formData = new FormData();
      formData.append("filepond", fileItems[0].file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Upload failed with status ${response.status}`
        );
      }

      const { text } = await response.json();

      const extractRes = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!extractRes.ok) {
        const errorData = await extractRes.json().catch(() => ({}));
        throw new Error(
          errorData.error ||
            `Extraction failed with status ${extractRes.status}`
        );
      }

      const { result, error: extractError } = await extractRes.json();

      if (extractError) throw new Error(extractError);
      if (!result) throw new Error("No courses found in transcript");

      await onSuccess(result);
    } catch (error) {
      console.error("Error processing transcript:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing your transcript"
      );
    } finally {
      setIsProcessing(false);
    }
  }

  if (isProcessing) {
    return <CustomLoader fullScreen={false} />;
  }

  return (
    <div className="space-y-4">
      <FilePond
        allowMultiple={false}
        onupdatefiles={handleUpload}
        acceptedFileTypes={["application/pdf"]}
        credits={false}
        labelIdle='
          <div class="filepond--label-icon filepond--label-action">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
        '
        stylePanelLayout="compact"
      />
      <div className="filepond--label-text">
        Drag & drop your transcript or{" "}
        <span className="text-pink-500">click above to browse.</span>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-400 bg-red-900/30 rounded-lg border border-red-800/50">
          <div className="font-medium">Error processing transcript</div>
          <div className="mt-1">{error}</div>
          <div className="text-xs text-red-500/70 mt-2">
            Please ensure you're uploading a valid Yale transcript PDF.
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center mt-2">
        Supported formats: PDF (max 5MB)
      </div>
    </div>
  );
}
