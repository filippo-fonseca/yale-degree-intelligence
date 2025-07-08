"use client";

import { useState } from "react";
import { FilePond } from "react-filepond";
import "filepond/dist/filepond.min.css";

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

      // Step 1: Upload and parse PDF
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

      const { text, fileName } = await response.json();
      console.log("PDF parsed successfully:", fileName);

      console.log("THE RESPONSE: ", text);

      // Step 2: Extract course information
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

      if (extractError) {
        throw new Error(extractError);
      }

      if (!result) {
        throw new Error("No courses found in transcript");
      }

      console.log(
        "Courses extracted:",
        result.substring(0, 200) + (result.length > 200 ? "..." : "")
      );

      // Step 3: Process and store in Firestore
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

  return (
    <div className="space-y-4">
      <FilePond
        allowMultiple={false}
        onupdatefiles={handleUpload}
        labelIdle='Drag & drop your transcript or <span class="filepond--label-action">browse</span>'
        acceptedFileTypes={["application/pdf"]}
        // maxFileSize="5MB"
      />
      {isProcessing && (
        <div className="text-center text-sm text-gray-500">
          Processing transcript... (this may take a moment)
        </div>
      )}
      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          <strong>Error:</strong> {error}
          <br />
          <small className="text-gray-500">
            Please ensure you're uploading a valid Yale transcript PDF.
          </small>
        </div>
      )}
    </div>
  );
}
