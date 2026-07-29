"use client";

import { motion } from "framer-motion";
import FileUpload from "@/components/file-upload";

interface UpdateTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (extractedText: string) => Promise<void>;
}

export function UpdateTranscriptModal({
  open,
  onClose,
  onUploadSuccess,
}: UpdateTranscriptModalProps) {
  if (!open) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gray-100/70 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white dark:bg-gray-900/90 backdrop-blur-sm p-8 rounded-xl border border-gray-200 dark:border-gray-800 relative shadow-xl dark:shadow-none"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 text-gray-500 dark:text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        <h3 className="text-xl font-medium mb-4 text-gray-800 dark:text-gray-200">
          Update your transcript
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Upload a new transcript to update your course history. We&apos;ll only
          add new courses that aren&apos;t already in your record.
        </p>
        <div className="mb-5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/50">
          <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wider">
            How to get your transcript
          </p>
          <ol className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
            <li>
              1. Go to{" "}
              <a
                href="https://yub.yale.edu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 dark:text-pink-400 hover:underline underline-offset-2"
              >
                Yale Hub
              </a>{" "}
              and sign in
            </li>
            <li>
              2. Go to{" "}
              <span className="font-mono text-xs px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-200">
                Academics
              </span>{" "}
              →{" "}
              <span className="font-mono text-xs px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700/50 text-gray-800 dark:text-gray-200">
                Unofficial Transcript
              </span>
            </li>
            <li>
              3. Click{" "}
              <span className="font-medium text-blue-600 dark:text-blue-300">
                Print
              </span>
              , save as PDF, and upload it below
            </li>
          </ol>
        </div>
        <FileUpload onSuccess={onUploadSuccess} />
      </motion.div>
    </motion.div>
  );
}
