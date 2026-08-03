"use client";

import { useRef, useState } from "react";
import { FilePond, registerPlugin } from "react-filepond";
import "filepond/dist/filepond.min.css";
import "./filepond-custom.css";
import FilePondPluginFileValidateType from "filepond-plugin-file-validate-type";
import FilePondPluginFileValidateSize from "filepond-plugin-file-validate-size";
import { auth } from "@/config/firebase";
import CustomLoader from "./ui/CustomLoader";

registerPlugin(FilePondPluginFileValidateType, FilePondPluginFileValidateSize);

type FileUploadProps = {
  onSuccess: (extractedText: string) => Promise<void>;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) throw new Error("You must be signed in to upload a transcript");
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

export default function FileUpload({ onSuccess }: FileUploadProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * FilePond fires onupdatefiles on every change to the file list, and each
   * run costs a PDF parse plus a model call. `isProcessing` cannot guard this
   * on its own: two callbacks in the same tick both read the pre-update state
   * and both proceed. A ref is updated synchronously, so it actually holds.
   */
  const inFlightRef = useRef(false);
  /** Signature of the last file we parsed, so a re-fire is not a second call. */
  const lastHandledRef = useRef<string | null>(null);

  async function handleUpdateFiles(fileItems: any[]) {
    const file = fileItems?.[0]?.file;
    if (!file) {
      return;
    }

    if (inFlightRef.current) return;

    const signature = `${file.name}:${file.size}:${file.lastModified}`;
    if (lastHandledRef.current === signature) return;

    inFlightRef.current = true;

    try {
      setIsProcessing(true);
      setError(null);

      const authHeaders = await getAuthHeaders();
      const formData = new FormData();
      formData.append("filepond", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: authHeaders,
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
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
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

      // Only mark it handled once it succeeded, so a failed attempt can retry.
      lastHandledRef.current = signature;

      await onSuccess(result);
    } catch (error) {
      console.error("Error processing transcript:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An unknown error occurred while processing your transcript"
      );
    } finally {
      inFlightRef.current = false;
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
        onupdatefiles={handleUpdateFiles}
        acceptedFileTypes={["application/pdf"]}
        maxFileSize="5MB"
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
            Please ensure you're uploading a valid Yale unofficial transcript
            PDF from YHub.
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center mt-2">
        Supported formats: PDF (max 5MB)
      </div>
    </div>
  );
}
