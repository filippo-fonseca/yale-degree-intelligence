"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "./ui/MajorDropdown";
import { InfoCard } from "./ui/InfoCard";
import Link from "next/link";
import CompoundLogo from "./ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowRight, FiX } from "react-icons/fi";

interface MajorSelectionFlowProps {
  onComplete: () => void;
}

export default function MajorSelectionFlow({
  onComplete,
}: MajorSelectionFlowProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<
    "welcome" | "majors" | "bio" | "year" | "complete"
  >("welcome");
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [graduationYear, setGraduationYear] = useState<string>("2027");
  const [bio, setBio] = useState<string>("");
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

  const handleRemoveMajor = (index: number) => {
    if (selectedMajors.length <= 1) return;
    setSelectedMajors(selectedMajors.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!user || selectedMajors.length === 0 || !graduationYear) return;

    setIsSubmitting(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName,
        majors: selectedMajors,
        graduationYear: parseInt(graduationYear),
        bio: bio,
        updatedAt: new Date(),
        email: user.email,
        photoURL: user.photoURL,
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
        className="w-full max-w-xl bg-gray-900 rounded-xl border border-gray-800 p-6"
      >
        {step === "welcome" && (
          <div className="space-y-8">
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-400/30 border-r-purple-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <LogoIcon width={48} height={48} />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-center font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-300 mb-4">
              <CompoundLogo hideLogo animated size="lg" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                {
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      />
                    </svg>
                  ),
                  title: "Track Requirements",
                  desc: "Visualize your progress through major requirements",
                },
                {
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                  ),
                  title: "Smart AI Planning",
                  desc: "Get recommendations for optimal course selection",
                },
                {
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  ),
                  title: "Graduation Timeline",
                  desc: "See your projected path to graduation. Simply.",
                },
                {
                  icon: (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      className="w-6 h-6"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                  ),
                  title: "Peer Insights",
                  desc: "See how others in your major are planning (coming soon!)",
                },
              ].map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -5 }}
                  className="neumorphic-card p-4 rounded-xl bg-gray-900 border border-gray-800 hover:border-pink-500/30 transition-all duration-300 cursor-default"
                >
                  <div className="flex items-center space-x-3">
                    <div className="neumorphic-icon p-2 rounded-lg bg-gray-900 border border-gray-800 text-pink-400">
                      {feature.icon}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-200">
                        {feature.title}
                      </h3>
                      <p className="text-sm text-gray-400">{feature.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex items-center justify-center w-full pt-6"
              onClick={() => setStep("majors")}
            >
              <motion.button
                className="px-6 py-3 border border-pink-500 bg-pink-500/30 hover:bg-pink-500/40 backdrop-blur-md rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
              >
                I'm excited
                <FiArrowRight className="opacity-80" />
              </motion.button>
            </motion.div>
          </div>
        )}

        {step === "majors" && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-center text-gray-200">
              It's time to select your major(s).
            </h2>
            <p className="text-gray-400 text-center text-sm">
              You can select up to 2 majors (min 1, ofc). Don't worry if you
              don't even have a major rn - this can be changed later in
              settings. Pick the one(s) you are most interested in right now.
            </p>
            <InfoCard className="text-sm">
              Our goal is to support all majors & concentrations. If yours isn't
              there,{" "}
              <Link
                href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                className="text-white font-normal hover:underline"
              >
                tell us.
              </Link>
            </InfoCard>

            <div className="space-y-3">
              {selectedMajors.map((major, index) => (
                <div key={index} className="flex items-center gap-2">
                  <MajorDropdown
                    value={major}
                    onChange={(newMajor) => {
                      const newMajors = [...selectedMajors];
                      newMajors[index] = newMajor;
                      setSelectedMajors(newMajors);
                    }}
                    disabledOptions={selectedMajors.filter((m) => m !== major)}
                  />
                  {index > 0 && (
                    <button
                      onClick={() => handleRemoveMajor(index)}
                      className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-800 transition-colors"
                      title="Remove major"
                    >
                      <FiX size={18} />
                    </button>
                  )}
                </div>
              ))}

              {selectedMajors.length < 2 && (
                <button
                  onClick={() => {
                    // Find first major not already selected
                    const availableMajor = Object.keys(MAJORS).find(
                      (major) => !selectedMajors.includes(major)
                    );
                    if (availableMajor) {
                      setSelectedMajors([...selectedMajors, availableMajor]);
                    }
                  }}
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
                  Add major
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
                onClick={() => setStep("bio")}
                disabled={selectedMajors.length === 0}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  selectedMajors.length === 0
                    ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                    : "bg-pink-600 hover:bg-pink-700"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === "bio" && (
          <div className="space-y-6">
            <h2 className="text-xl font-medium text-center text-gray-200">
              Tell your friends about yourself.
            </h2>
            <p className="text-gray-400 text-center text-sm">
              This will be visible on your profile to your accepted friends.
              It's totally optional.
            </p>

            <div className="mt-4">
              <textarea
                autoFocus
                value={bio}
                onChange={(e) => {
                  // Remove newlines and limit to 200 characters
                  const filteredValue = e.target.value.replace(/[\r\n]/g, "");
                  setBio(filteredValue.slice(0, 200));
                }}
                placeholder="What are your interests? Future plans? Fun facts? We don't care. Anything."
                className="w-full h-32 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-200"
                maxLength={200}
                style={{ overflow: "hidden", resize: "none" }}
                onKeyDown={(e) => {
                  // Prevent Enter key from creating new lines
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
              <p className="text-xs text-gray-500 text-right mt-1">
                {bio.length}/200
              </p>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("majors")}
                className="py-2 px-4 text-gray-400 hover:text-gray-200"
              >
                Back
              </button>
              <button
                onClick={() => setStep("year")}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${"bg-pink-600 hover:bg-pink-700 text-white"}`}
              >
                {bio.length === 0 ? "Skip" : "Next"}
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
                autoFocus
                min={new Date().getFullYear()}
                max={new Date().getFullYear() + 10}
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-32 text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
                placeholder="2025"
              />
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("bio")}
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
                    : "bg-pink-600 hover:bg-pink-700"
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
