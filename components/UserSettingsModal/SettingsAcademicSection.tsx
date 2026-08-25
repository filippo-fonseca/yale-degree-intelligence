"use client";

import type { Dispatch, SetStateAction } from "react";
import { FiChevronDown } from "react-icons/fi";
import { MAJORS } from "@/lib/majors";
import { CERTIFICATES } from "@/lib/certificates";
import { MajorDropdown } from "../ui/MajorDropdown";
import { CertificateDropdown } from "../ui/CertificateDropdown";
import type { EditableProfile } from "./settingsTypes";

interface SettingsAcademicSectionProps {
  localProfile: EditableProfile;
  duplicateMajorError: string | null;
  duplicateCertificateError: string | null;
  autoOpenCertificateIndex: number | null;
  autoOpenMajorIndex: number | null;
  handleAddMajor: () => void;
  handleMajorChange: (index: number, newMajor: string) => void;
  handleRemoveMajor: (index: number) => void;
  handleAddCertificate: () => void;
  handleCertificateChange: (index: number, newCertificate: string) => void;
  handleRemoveCertificate: (index: number) => void;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void;
  canSave: boolean;
  setLocalProfile: Dispatch<SetStateAction<EditableProfile | null>>;
}

export function SettingsAcademicSection({
  localProfile,
  duplicateMajorError,
  duplicateCertificateError,
  autoOpenCertificateIndex,
  autoOpenMajorIndex,
  handleAddMajor,
  handleMajorChange,
  handleRemoveMajor,
  handleAddCertificate,
  handleCertificateChange,
  handleRemoveCertificate,
  setLocalProfile,
  isDirty,
  isSaving,
  onSave,
  canSave,
}: SettingsAcademicSectionProps) {
  return (
    <>
      {/* Majors */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm px-3 py-2.5">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Majors
        </label>
        {duplicateMajorError && (
          <div className="mb-1 text-[10px] text-red-400">
            {duplicateMajorError}
          </div>
        )}
        <div className="space-y-1.5">
          {localProfile.majors.map((major, index) => (
            <div key={index} className="relative z-[60] overflow-visible">
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <MajorDropdown
                    value={major}
                    defaultOpen={autoOpenMajorIndex === index}
                    onChange={(newMajor) => handleMajorChange(index, newMajor)}
                    disabledOptions={localProfile.majors.filter(
                      (m) => m !== major,
                    )}
                  />
                </div>
                {index > 0 && (
                  <button
                    onClick={() => handleRemoveMajor(index)}
                    className="text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-colors text-xs"
                    title="Remove major"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
          {localProfile.majors.length < 2 && (
            <button
              onClick={handleAddMajor}
              className="text-[11px] text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 flex items-center gap-1"
              disabled={
                Object.keys(MAJORS).length === localProfile.majors.length
              }
            >
              + Add another major
            </button>
          )}
        </div>
      </div>

      {/* Certificates */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm px-3 py-2.5">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Certificates
        </label>
        <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-1.5">
          Optional. Courses counted for a certificate cannot also count toward
          majors.
        </p>
        {duplicateCertificateError && (
          <div className="mb-1 text-[10px] text-red-400">
            {duplicateCertificateError}
          </div>
        )}
        <div className="space-y-1.5">
          {localProfile.certificates.map((certificate, index) => (
            <div key={index} className="relative z-[60] overflow-visible">
              <div className="flex items-center gap-1.5">
                <div className="flex-1">
                  <CertificateDropdown
                    value={certificate}
                    onChange={(newCertificate) =>
                      handleCertificateChange(index, newCertificate)
                    }
                    disabledOptions={localProfile.certificates.filter(
                      (c) => c !== certificate,
                    )}
                    defaultOpen={autoOpenCertificateIndex === index}
                    userMajors={localProfile.majors}
                  />
                </div>
                <button
                  onClick={() => handleRemoveCertificate(index)}
                  className="text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-red-400/10 transition-colors text-xs"
                  title="Remove certificate"
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          {localProfile.certificates.length < 3 && (
            <button
              onClick={handleAddCertificate}
              className="text-[11px] text-teal-500 hover:text-teal-400 flex items-center gap-1"
              disabled={
                Object.keys(CERTIFICATES).length ===
                localProfile.certificates.length
              }
            >
              + Add certificate
            </button>
          )}
        </div>
      </div>

      {/* Year */}
      <div className="rounded-xl border border-black/[0.06] dark:border-white/[0.08] bg-gray-50 dark:bg-transparent dark:bg-gradient-to-br dark:from-white/[0.06] dark:via-transparent dark:to-black/10 shadow-sm dark:shadow-[0_2px_12px_rgba(0,0,0,0.2)] backdrop-blur-sm px-3 py-2.5">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          Graduation Year
        </label>
        <div className="relative">
          <select
            value={localProfile.graduationYear}
            onChange={(e) =>
              setLocalProfile({
                ...localProfile,
                graduationYear: parseInt(e.target.value),
              })
            }
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pink-500/40 focus:border-pink-500/50 text-gray-900 dark:text-gray-200 text-xs transition-all duration-200 appearance-none cursor-pointer"
          >
            {[2027, 2028, 2029, 2030, 2031].map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500 dark:text-gray-400">
            <FiChevronDown size={14} />
          </div>
        </div>
      </div>
      {/* The save lives with the fields it saves, the way the bio's does.
          Everything else in Settings writes on change, so a button at the
          bottom of the panel implied the toggles above it were unsaved too. */}
      {isDirty && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-3 py-2.5">
          <span className="font-sf text-xs text-amber-700 dark:text-amber-300">
            Unsaved changes to your majors, certificates, or year.
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={!canSave || isSaving}
            className="shrink-0 rounded-full bg-gray-900 px-3.5 py-1.5 font-sf text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
          >
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </>
  );
}
