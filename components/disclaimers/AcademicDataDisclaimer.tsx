"use client";

import Link from "next/link";

/**
 * Shared privacy / affiliation copy used on My Courses upload empty state
 * and after courses are loaded. Keep these surfaces in sync.
 */
export function AcademicDataDisclaimerText({
  lead = "By uploading or writing in your courses and grades, you voluntarily share that academic data with DegreeIntelligence.",
}: {
  lead?: string;
}) {
  return (
    <>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
        <span className="font-medium text-gray-700 dark:text-gray-300">
          {lead}
        </span>{" "}
        Your transcript PDF (if you upload one) is sent to our server for
        parsing and is{" "}
        <span className="text-emerald-600 dark:text-emerald-400">
          not stored
        </span>{" "}
        after extraction. Course text may be sent to OpenAI to extract your
        courses.{" "}
        <span className="font-medium text-gray-700 dark:text-gray-300">
          Your course and grade data are stored on our servers
        </span>{" "}
        (private only to your account) so we can show progress, insights, and
        planning tools. By adding academic information, you confirm that you
        are providing your own data and consent to its storage and processing
        for academic planning purposes.{" "}
        <Link
          href="/terms"
          target="_blank"
          className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline underline-offset-2"
        >
          Read our full terms
        </Link>
        .
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
        DegreeIntelligence is{" "}
        <span className="font-medium">not affiliated</span> in any way, shape,
        or form with Yale University, Yale College, or DegreeAudit. This is a
        fun, open, student-built tool we made because we use it ourselves and
        wanted to share it with the Yale community. We stand to make no money
        from this — in fact we lose money running it — and we will never charge
        a dime for it.
      </p>
    </>
  );
}

export function AcademicDataDisclaimerCard({
  showIcon = false,
  className = "",
  lead,
}: {
  showIcon?: boolean;
  className?: string;
  lead?: string;
}) {
  return (
    <div
      className={`p-4 rounded-xl bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/80 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-gray-950/40 border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] ${className}`}
    >
      {showIcon ? (
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
            <AcademicDataDisclaimerText lead={lead} />
          </div>
        </div>
      ) : (
        <AcademicDataDisclaimerText lead={lead} />
      )}
    </div>
  );
}
