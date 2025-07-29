// components/MajorSelectionFlow.tsx
"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "./ui/MajorDropdown";

interface MajorSelectionFlowProps {
  onComplete: () => void;
}

export default function MajorSelectionFlow({
  onComplete,
}: MajorSelectionFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<"welcome" | "majors" | "year" | "complete">(
    "welcome"
  );
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMajorToggle = (majorCode: string) => {
    setSelectedMajors((prev) => {
      if (prev.includes(majorCode)) {
        return prev.filter((m) => m !== majorCode);
      } else if (prev.length < 2) {
        return [...prev, majorCode];
      }
      return prev;
    });
  };

  const handleSubmit = async () => {
    if (!user || selectedMajors.length === 0 || !graduationYear) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        majors: selectedMajors,
        graduationYear: parseInt(graduationYear),
        updatedAt: new Date(),
      });
      onComplete();
    } catch (error) {
      console.error("Error saving user data:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-gray-900 rounded-xl border border-gray-800 p-6"
      >
        {step === "welcome" && (
          <div className="space-y-6">
            <h2 className="text-2xl font-medium text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Welcome to Yale DegreeIntelligence.
            </h2>
            <p className="text-gray-400 text-center">
              No need for Google Sheets anymore. Let's get started by setting up
              your academic profile.
            </p>
            <div className="pt-4">
              <button
                onClick={() => setStep("majors")}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
              >
                I'm excited
              </button>
            </div>
          </div>
        )}

        {step === "majors" && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-center text-gray-200">
              Select Your Major(s)
            </h2>
            <p className="text-gray-400 text-center text-sm">
              You can select up to 2 majors. These can be changed later in
              settings.
            </p>

            <div className="space-y-3">
              {selectedMajors.map((major, index) => (
                <MajorDropdown
                  key={index}
                  value={major}
                  onChange={(newMajor) => {
                    const newMajors = [...selectedMajors];
                    newMajors[index] = newMajor;
                    setSelectedMajors(newMajors);
                  }}
                  disabledOptions={selectedMajors.filter((m) => m !== major)}
                />
              ))}

              {selectedMajors.length < 2 && (
                <button
                  onClick={() =>
                    setSelectedMajors([
                      ...selectedMajors,
                      Object.keys(MAJORS)[0],
                    ])
                  }
                  disabled={selectedMajors.length >= 2}
                  className="w-full py-2 px-4 rounded-lg border border-gray-700 hover:bg-gray-800/50 text-gray-400 hover:text-gray-200 flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                  Add Major
                </button>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("welcome")}
                className="py-2 px-4 text-gray-400 hover:text-gray-200"
              >
                Back
              </button>
              <button
                onClick={() => setStep("year")}
                disabled={selectedMajors.length === 0}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedMajors.length === 0
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "year" && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-center text-gray-200">
              Expected Graduation Year
            </h2>

            <div className="flex justify-center">
              <input
                type="number"
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 10}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-32 text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="2025"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("majors")}
                className="py-2 px-4 text-gray-400 hover:text-gray-200"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!graduationYear || isSubmitting}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  !graduationYear || isSubmitting
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSubmitting ? "Saving..." : "Complete Setup"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
