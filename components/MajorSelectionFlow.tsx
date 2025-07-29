// components/MajorSelectionFlow.tsx
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
import { FiArrowRight } from "react-icons/fi";

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
        className="w-full max-w-xl bg-gray-900 rounded-xl border border-gray-800 p-6"
      >
        {step === "welcome" && (
          <div className="space-y-8">
            {/* <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-300 to-purple-300 pb-2">
                Welcome to
              </h2>
              <CompoundLogo />
              <p className="text-gray-300 mt-2">
                Your intelligent academic companion
              </p>
            </motion.div> */}
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
              {/* Feature Cards */}
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
                  // transition={{ delay: 0.2 + index * 0.1 }}
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
              {/* <button
                onClick={() => setStep("majors")}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-pink-600 hover:from-pink-500 hover:to-pink-500 font-medium transition-all duration-300 shadow-lg hover:shadow-pink-500/20 flex items-center justify-center space-x-2"
              >
                <span>Get Started</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </button> */}
            </motion.div>
          </div>
        )}

        {step === "majors" && (
          <div className="space-y-4">
            <h2 className="text-xl font-medium text-center text-gray-200">
              It's time to select your major(s).
            </h2>
            <p className="text-gray-400 text-center text-sm">
              You can select up to 2 majors (min 1, ofc). This can be changed
              later in settings.
            </p>
            <InfoCard className="text-sm">
              Our goal is to support all majors. If yours isn't there,{" "}
              <Link
                href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                className="text-white font-normal hover:underline"
              >
                tell us.
              </Link>
            </InfoCard>

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
                onClick={() => setStep("year")}
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
                className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 w-32 text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-pink-500"
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
