"use client";

import type { ReactNode } from "react";
import FileUpload from "@/components/file-upload";
import { AcademicDataDisclaimerCard } from "@/components/disclaimers/AcademicDataDisclaimer";
import { ShinyButton } from "@/components/ui/shiny-button";
import { GhostButton } from "@/components/ui/ghost-button";

/**
 * The first screen of My courses, before anything has been imported.
 *
 * Same v3 vocabulary as the setup flow and the what's-new modal: the two
 * panels are windows with a mono status line, the steps are numbered in mono
 * rather than in filled pink circles, and the two actions are the shiny pill
 * and the ghost pill instead of a tinted emerald box beside a tinted pink one.
 * Every word of the copy is unchanged.
 */

interface OnboardingStateProps {
  userName: string | null;
  isBrandNew: boolean;
  onManualEntry: () => void;
  onUploadSuccess: (text: string) => Promise<void>;
  onOpenSimulator?: () => void;
}

/** The window shell both panels sit in. */
function Panel({
  label,
  note,
  children,
  className = "",
  ...rest
}: {
  label: string;
  note?: string;
  children: ReactNode;
  className?: string;
  [key: string]: unknown;
}) {
  return (
    <div
      className={`w-full max-w-xl overflow-hidden rounded-2xl border border-black/[0.08] bg-white dark:border-white/[0.09] dark:bg-[#101013] ${className}`}
      {...rest}
    >
      <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
        <span>{label}</span>
        {note && <span>{note}</span>}
      </div>
      <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.08]" />
      {children}
    </div>
  );
}

/** Inline literal, for the bits of YHub you have to click by name. */
function Key({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-black/[0.08] bg-[#fafafa] px-1.5 py-0.5 font-mono text-xs text-gray-700 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-300">
      {children}
    </span>
  );
}

export function OnboardingState({
  userName,
  isBrandNew,
  onManualEntry,
  onUploadSuccess,
  onOpenSimulator,
}: OnboardingStateProps) {
  const firstName = userName?.split(" ")[0] ?? "there";

  const steps: ReactNode[] = [
    <>
      Go to{" "}
      <a
        href="https://yub.yale.edu"
        target="_blank"
        rel="noopener noreferrer"
        className="text-gray-900 underline underline-offset-2 transition-colors hover:text-pink-600 dark:text-white dark:hover:text-pink-300"
      >
        Yale Hub (yub.yale.edu)
      </a>{" "}
      and sign in with CAS
    </>,
    <>
      Navigate to <Key>Academics</Key> <span aria-hidden>→</span>{" "}
      <Key>Unofficial Transcript - Undergraduate</Key>
    </>,
    <>
      Click <Key>Print</Key>, save as PDF, then upload it here
      {isBrandNew
        ? ". In-progress courses with no grades are supported."
        : "."}
    </>,
  ];

  return (
    <div className="flex flex-col items-center justify-center py-8 font-louize">
      <div className="mb-6 max-w-xl text-center">
        <h2 className="text-balance text-[1.6rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[1.9rem]/[1.25]">
          {isBrandNew
            ? `Welcome to Yale, ${firstName}.`
            : `Let's get your courses loaded, ${firstName}.`}
        </h2>
        <p className="mx-auto mt-3 max-w-[58ch] font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {isBrandNew ? (
            <>
              We know you&apos;ve just gotten to Yale as a Class of 2030 frosh
              (welcome!). No worries; you do{" "}
              <span className="font-medium text-gray-900 dark:text-gray-200">
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
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 font-sf">
            {onOpenSimulator && (
              <ShinyButton size="sm" withArrow onClick={onOpenSimulator}>
                Open the Simulator
              </ShinyButton>
            )}
            <GhostButton onClick={onManualEntry}>
              Add courses manually
            </GhostButton>
          </div>
        )}
      </div>

      <Panel
        label={isBrandNew ? "import from yhub" : "get your transcript"}
        note={isBrandNew ? "no grades needed" : undefined}
        className="mb-3"
      >
        <div className="p-5">
          {isBrandNew && (
            <p className="mb-4 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
              You already registered for fall courses, so your unofficial
              transcript is on YHub now, even though every course still shows as
              in progress. We parse those in-progress courses so My Courses and
              the Simulator can start mapping your path right away.
            </p>
          )}

          <ol className="space-y-3">
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
      </Panel>

      <Panel
        label="upload"
        note="pdf, max 5mb"
        id="upload-transcript"
        data-tour="courses-upload-dropzone"
      >
        <div className="p-5">
          <FileUpload onSuccess={onUploadSuccess} />
        </div>
      </Panel>

      <div className="mt-3 w-full max-w-xl text-center">
        <p className="font-sf text-sm text-gray-500 dark:text-gray-400">
          Prefer to type in your courses manually?{" "}
          <button
            onClick={onManualEntry}
            data-tour="courses-empty-manual-add"
            className="text-gray-900 underline underline-offset-2 transition-colors hover:text-pink-600 dark:text-white dark:hover:text-pink-300"
          >
            Click here
          </button>
          .
        </p>
      </div>

      <AcademicDataDisclaimerCard
        showIcon
        className="mt-5 w-full max-w-xl"
        lead="By uploading or writing in your courses and grades, you voluntarily share that academic data with DegreeIntelligence."
      />
    </div>
  );
}
