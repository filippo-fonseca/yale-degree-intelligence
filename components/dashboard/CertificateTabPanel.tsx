"use client";

import type { User } from "firebase/auth";
import { motion } from "framer-motion";
import { FiPlus } from "react-icons/fi";
import { RiAwardFill } from "react-icons/ri";
import { Course } from "@/lib/types";
import { CERTIFICATES } from "@/lib/certificates";
import type { CertificateProgress } from "@/lib/certificates";
import { CertificateProgressView } from "./dynamicTabs";
import type { UserProfile } from "./types";

interface CertificateTabPanelProps {
  user: User;
  userProfile: UserProfile | null;
  courses: Course[];
  selectedCertificate: string;
  onSelectCertificate: (certificate: string) => void;
  getCertificateProgress: () => CertificateProgress | null;
  onRequirementChange: () => void;
  onOpenSettings: () => void;
}

export function CertificateTabPanel({
  user,
  userProfile,
  courses,
  selectedCertificate,
  onSelectCertificate,
  getCertificateProgress,
  onRequirementChange,
  onOpenSettings,
}: CertificateTabPanelProps) {
  const certificates = userProfile?.certificates ?? [];
  const progress = getCertificateProgress();

  return (
    <motion.div
      key="certificate"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {user && userProfile && (
        <div className="mb-6">
          <h2 className="text-3xl font-medium text-gray-900 dark:text-white">
            {certificates.length > 0
              ? `Your certificate progress, ${user?.displayName?.split(" ")[0]}.`
              : `Certificates are optional. Add yours anytime.`}
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            Track Yale College certificates alongside your major. Courses
            counted toward a certificate cannot also count toward your major(s).
          </p>
        </div>
      )}

      {/* From one certificate, not two: with a single one the row is what
          carries the "add another" affordance, and a lone chip also tells you
          which certificate the progress below belongs to. */}
      {userProfile && certificates.length >= 1 && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wider">
            Viewing Progress For
          </label>
          <div className="flex flex-wrap items-center gap-1.5">
            {certificates.map((certificate) => (
              <button
                key={certificate}
                onClick={() => onSelectCertificate(certificate)}
                className={`px-3 py-1.5 rounded-xl text-sm transition-all duration-200 ${
                  selectedCertificate === certificate
                    ? "bg-teal-600 text-white border border-teal-600 shadow-[0_2px_8px_rgba(20,184,166,0.25)]"
                    : "bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-800/60 hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800/50 hover:text-gray-800 dark:hover:text-gray-300"
                }`}
              >
                {CERTIFICATES[certificate] || certificate}
              </button>
            ))}
            {certificates.length < 3 && (
              <button
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 rounded-xl border border-dashed border-black/[0.14] px-3 py-1.5 text-sm text-gray-500 transition-colors hover:border-teal-500/50 hover:text-gray-900 dark:border-white/[0.14] dark:text-gray-400 dark:hover:border-teal-500/50 dark:hover:text-white"
                title="Add a certificate in Settings"
              >
                <FiPlus size={13} />
                Add {certificates.length === 0 ? "a" : "another"} certificate
              </button>
            )}
          </div>
        </div>
      )}

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-teal-300/50 dark:border-teal-800/50 bg-teal-50/40 dark:bg-teal-950/20 px-6">
          <RiAwardFill className="text-teal-500 mb-3" size={36} />
          <p className="text-gray-700 dark:text-gray-200 text-lg font-medium">
            No certificates yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-md">
            Add up to three Yale College certificates in Settings. We&apos;ll
            track requirement progress the same way we do for majors, including
            manual fulfill and skip.
          </p>
          <button
            onClick={onOpenSettings}
            className="mt-5 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm hover:bg-teal-700 transition-colors"
          >
            Add certificates in Settings
          </button>
        </div>
      ) : progress ? (
        <CertificateProgressView
          selectedCertificate={selectedCertificate}
          progress={progress}
          onRequirementChange={onRequirementChange}
          courses={courses}
          userMajors={userProfile?.majors ?? []}
          userCertificates={certificates}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-lg">
            {!selectedCertificate
              ? "Please select a certificate to view your progress."
              : "Loading your certificate progress..."}
          </p>
        </div>
      )}
    </motion.div>
  );
}
