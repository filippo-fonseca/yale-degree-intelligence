"use client";

import Link from "next/link";

export function PrivacyDisclaimer() {
  return (
    <div className="mt-10 p-4 rounded-xl bg-gradient-to-br from-gray-100/80 via-gray-50/60 to-gray-100/80 dark:from-gray-900/40 dark:via-gray-900/30 dark:to-gray-950/40 border border-gray-200/80 dark:border-gray-800/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed">
        <span className="font-medium text-gray-600 dark:text-gray-400">
          By using DegreeIntelligence, you voluntarily share your grades.
        </span>{" "}
        Your transcript PDF is sent to our server for parsing and is{" "}
        <span className="text-emerald-600 dark:text-emerald-400/80">
          not stored
        </span>{" "}
        after extraction. Course text may be sent to OpenAI to extract your
        courses. We store your course and grade data in our database (private
        only to your account) to provide you with insights, progress tracking,
        and recommendations for your major. By uploading academic information,
        you confirm that you are providing your own data and consent to its
        storage and processing for academic planning purposes.{" "}
        <Link
          href="/terms"
          target="_blank"
          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2"
        >
          Read our full terms
        </Link>
        .
      </p>
      <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-2 leading-relaxed">
        DegreeIntelligence is{" "}
        <span className="font-medium">not affiliated</span> in any way, shape,
        or form with Yale University, Yale College, or DegreeAudit. We are
        simply a free, student-built personal project that we wanted to share
        with the community because we genuinely found it helpful for ourselves.
      </p>
    </div>
  );
}
