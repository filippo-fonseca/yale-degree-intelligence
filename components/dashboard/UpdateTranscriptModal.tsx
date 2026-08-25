"use client";

import type { ReactNode } from "react";
import FileUpload from "@/components/file-upload";
import { ModalShell, ModalHeader } from "@/components/ui/ModalShell";

interface UpdateTranscriptModalProps {
  open: boolean;
  onClose: () => void;
  onUploadSuccess: (extractedText: string) => Promise<void>;
}

/** Inline literal, matching the first-run screen's YHub steps. */
function Key({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-black/[0.08] bg-[#fafafa] px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-300">
      {children}
    </span>
  );
}

export function UpdateTranscriptModal({
  open,
  onClose,
  onUploadSuccess,
}: UpdateTranscriptModalProps) {
  const steps: ReactNode[] = [
    <>
      Go to{" "}
      <a
        href="https://yub.yale.edu"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 underline underline-offset-2 transition-colors hover:text-pink-600 dark:text-white dark:hover:text-pink-300"
      >
        Yale Hub
      </a>{" "}
      and sign in
    </>,
    <>
      Go to <Key>Academics</Key> <span aria-hidden>→</span>{" "}
      <Key>Unofficial Transcript</Key>
    </>,
    <>
      Click <Key>Print</Key>, save as PDF, and upload it below
    </>,
  ];

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      label="update transcript"
      note="pdf, max 5mb"
    >
      <div className="p-5 sm:p-6">
        <ModalHeader title="Update your transcript">
          Upload a new transcript to update your course history. We&apos;ll only
          add new courses that aren&apos;t already in your record.
        </ModalHeader>

        <div className="mt-5 rounded-xl border border-black/[0.06] bg-[#fafafa] p-4 dark:border-white/[0.07] dark:bg-white/[0.03]">
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
            How to get your transcript
          </p>
          <ol className="mt-3 space-y-2">
            {steps.map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span
                  className="mt-0.5 shrink-0 font-mono text-[11px] text-gray-400 dark:text-gray-500"
                  aria-hidden="true"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p className="flex-1 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {step}
                </p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-4">
          <FileUpload onSuccess={onUploadSuccess} />
        </div>
      </div>
    </ModalShell>
  );
}
