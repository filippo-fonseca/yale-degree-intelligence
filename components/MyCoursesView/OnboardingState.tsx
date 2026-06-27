"use client";

import { Printer } from "lucide-react";
import Link from "next/link";
import FileUpload from "@/components/file-upload";

interface OnboardingStateProps {
  userName: string | null;
  isBrandNew: boolean;
  onManualEntry: () => void;
  onUploadSuccess: (text: string) => Promise<void>;
}

export function OnboardingState({
  userName,
  isBrandNew,
  onManualEntry,
  onUploadSuccess,
}: OnboardingStateProps) {
  const firstName = userName?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
          Let's get your courses loaded, {firstName}.
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          {isBrandNew
            ? "After registration, we'll parse your classes and fill in grades when they post."
            : "Upload your unofficial transcript to see your academic journey. We won't store the file."}
        </p>
      </div>

      {/* Tutorial Steps */}
      <div className="w-full max-w-xl mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50/90 via-white/80 to-gray-100/90 dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <Printer size={14} className="text-pink-400" />
            </span>
            How to get your transcript
          </h3>
          <div className="space-y-3">
            {[
              <>
                Go to{" "}
                <a
                  href="https://yub.yale.edu"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 underline underline-offset-2"
                >
                  Yale Hub
                </a>{" "}
                and sign in
              </>,
              <>
                Navigate to{" "}
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/50 text-gray-800 dark:text-gray-200 font-mono text-xs">
                  Academics
                </span>{" "}
                →{" "}
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/50 text-gray-800 dark:text-gray-200 font-mono text-xs">
                  Unofficial Transcript
                </span>
              </>,
              <>
                Click{" "}
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-medium text-xs">
                  Print
                </span>{" "}
                and save as PDF. Then upload it here.
              </>,
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white text-xs font-medium shadow-[0_2px_8px_rgba(236,72,153,0.3)]">
                  {i + 1}
                </div>
                <div className="flex-1 pt-0.5">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div
        id="upload-transcript"
        className="w-full max-w-xl p-6 rounded-xl bg-gradient-to-br from-gray-50/90 via-white/80 to-gray-100/90 dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]"
      >
        <FileUpload onSuccess={onUploadSuccess} />
      </div>

      {/* Manual Entry Option */}
      <div className="w-full max-w-xl mt-3 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Prefer to type in your courses manually?{" "}
          <button
            onClick={onManualEntry}
            className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 underline underline-offset-2 transition-colors"
          >
            Click here
          </button>
          .
        </p>
      </div>

      {/* Privacy disclaimer */}
      <div className="w-full max-w-xl mt-5 p-4 rounded-xl bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/80 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-gray-950/40 border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 shrink-0 mt-0.5">
            <svg
              className="w-3.5 h-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                By uploading, you voluntarily share your grades.
              </span>{" "}
              Your transcript PDF is processed locally and is{" "}
              <span className="text-emerald-600 dark:text-emerald-400">
                never stored
              </span>{" "}
              on our servers. However, we store your course and grade data in our
              database (private only to your profile) to provide insights and
              recommendations for your major. By uploading academic information,
              you confirm that you are providing your own data and consent to its
              storage and processing for academic planning purposes.{" "}
              <Link
                href="/terms"
                target="_blank"
                className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
              >
                Read our full terms
              </Link>
              .
            </p>
            <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
              DegreeIntelligence is{" "}
              <span className="font-medium">not affiliated</span> in any way,
              shape, or form with Yale University, Yale College, or DegreeAudit.
              We are simply a free, student-built personal project that we wanted
              to share with the community because we genuinely found it helpful
              for ourselves.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
