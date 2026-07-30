"use client";

import { Printer, MonitorCog, PenLine } from "lucide-react";
import FileUpload from "@/components/file-upload";
import { AcademicDataDisclaimerCard } from "@/components/disclaimers/AcademicDataDisclaimer";

interface OnboardingStateProps {
  userName: string | null;
  isBrandNew: boolean;
  onManualEntry: () => void;
  onUploadSuccess: (text: string) => Promise<void>;
  onOpenSimulator?: () => void;
}

export function OnboardingState({
  userName,
  isBrandNew,
  onManualEntry,
  onUploadSuccess,
  onOpenSimulator,
}: OnboardingStateProps) {
  const firstName = userName?.split(" ")[0] ?? "there";

  return (
    <div className="flex flex-col items-center justify-center py-8">
      {/* Header */}
      <div className="text-center mb-6 max-w-xl">
        <h2 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
          {isBrandNew
            ? `Welcome to Yale, ${firstName}.`
            : `Let's get your courses loaded, ${firstName}.`}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
          {isBrandNew ? (
            <>
              We know you&apos;ve just gotten to Yale as a Class of 2030 frosh
              (welcome!). No worries; you do{" "}
              <span className="font-medium text-gray-700 dark:text-gray-300">
                not need grades
              </span>{" "}
              to start using DegreeIntelligence and upload your transcript.
              Since you&apos;ve already registered for fall courses, your
              unofficial transcript is ready on YHub right now; import it even
              though everything is still in progress with no grades, or jump
              into the Simulator to map your trajectory. We&apos;ll show what
              you&apos;re taking and fill grades in when they post.
            </>
          ) : (
            "Upload your unofficial transcript to see your academic journey. We won't store the PDF file."
          )}
        </p>
        {isBrandNew && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {onOpenSimulator && (
              <button
                type="button"
                onClick={onOpenSimulator}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 transition-colors"
              >
                <MonitorCog size={14} />
                Open the Simulator
              </button>
            )}
            <button
              type="button"
              onClick={onManualEntry}
              className="inline-flex items-center gap-2 rounded-xl border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-sm font-medium text-pink-700 dark:text-pink-300 hover:bg-pink-500/15 transition-colors"
            >
              <PenLine size={14} />
              Add courses manually
            </button>
          </div>
        )}
      </div>

      {/* Tutorial Steps */}
      <div className="w-full max-w-xl mb-6">
        <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50/90 via-white/80 to-gray-100/90 dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60 backdrop-blur-md border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_16px_rgba(0,0,0,0.25)]">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-pink-500/10 border border-pink-500/20">
              <Printer size={14} className="text-pink-400" />
            </span>
            {isBrandNew
              ? "How to import from YHub (no grades is totally fine)"
              : "How to get your transcript"}
          </h3>
          {isBrandNew && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 leading-relaxed">
              You already registered for fall courses, so your unofficial
              transcript is on YHub now, even though every course still shows
              as in progress. We parse those in-progress courses so My Courses
              and the Simulator can start mapping your path right away.
            </p>
          )}
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
                  Yale Hub (yub.yale.edu)
                </a>{" "}
                and sign in with CAS
              </>,
              <>
                Navigate to{" "}
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/50 text-gray-800 dark:text-gray-200 font-mono text-xs">
                  Academics
                </span>{" "}
                →{" "}
                <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-700/50 text-gray-800 dark:text-gray-200 font-mono text-xs">
                  Unofficial Transcript — Undergraduate
                </span>
              </>,
              <>
                Click{" "}
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 border border-blue-500/30 text-blue-600 dark:text-blue-300 font-medium text-xs">
                  Print
                </span>{" "}
                , save as PDF, then upload it here
                {isBrandNew
                  ? ". In-progress courses with no grades are supported."
                  : "."}
              </>,
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-pink-600 font-sf text-xs font-semibold leading-none text-white shadow-[0_2px_8px_rgba(236,72,153,0.35)]"
                  aria-hidden="true"
                >
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
        data-tour="courses-upload-dropzone"
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
            data-tour="courses-empty-manual-add"
            className="text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 underline underline-offset-2 transition-colors"
          >
            Click here
          </button>
          .
        </p>
      </div>

      <AcademicDataDisclaimerCard
        showIcon
        className="w-full max-w-xl mt-5"
        lead="By uploading or writing in your courses and grades, you voluntarily share that academic data with DegreeIntelligence."
      />
    </div>
  );
}
