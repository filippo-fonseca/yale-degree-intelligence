"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { MAJORS } from "@/lib/majors";
import { MajorDropdown } from "./ui/MajorDropdown";
import { InfoCard } from "./ui/InfoCard";
import Link from "next/link";
import CompoundLogo from "./ui/CompoundLogo";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowRight, FiX, FiCheck, FiChevronDown } from "react-icons/fi";
import { RiProgress3Fill } from "react-icons/ri";
import { HiSparkles } from "react-icons/hi2";
import { FaUsers, FaGraduationCap } from "react-icons/fa6";

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
  const [graduationYear, setGraduationYear] = useState<string>("2029");
  const [bio, setBio] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMajorsInfo, setShowMajorsInfo] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  // Detect mobile keyboard opening via visualViewport
  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;

    const viewport = window.visualViewport;
    const initialHeight = window.innerHeight;

    const handleResize = () => {
      // If viewport height is significantly smaller than window height, keyboard is likely open
      const heightDiff = initialHeight - viewport.height;
      setIsKeyboardOpen(heightDiff > 150);
    };

    viewport.addEventListener("resize", handleResize);
    return () => viewport.removeEventListener("resize", handleResize);
  }, []);

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

  const features = [
    {
      icon: <RiProgress3Fill className="w-5 h-5" />,
      title: "Track Requirements",
      desc: "Visualize your progress through major requirements",
      gradient: "from-pink-500/20 to-pink-600/10",
      border: "border-pink-500/20",
      iconColor: "text-pink-400",
    },
    {
      icon: <HiSparkles className="w-5 h-5" />,
      title: "Smart Planning",
      desc: "Get recommendations for optimal course selection",
      gradient: "from-purple-500/20 to-purple-600/10",
      border: "border-purple-500/20",
      iconColor: "text-purple-400",
    },
    {
      icon: <FaGraduationCap className="w-5 h-5" />,
      title: "Graduation Timeline",
      desc: "See your projected path to graduation. Simply.",
      gradient: "from-blue-500/20 to-blue-600/10",
      border: "border-blue-500/20",
      iconColor: "text-blue-400",
    },
    {
      icon: <FaUsers className="w-5 h-5" />,
      title: "Peer Insights",
      desc: "See what courses your friends are taking",
      gradient: "from-emerald-500/20 to-emerald-600/10",
      border: "border-emerald-500/20",
      iconColor: "text-emerald-400",
    },
  ];

  // Step indicator
  const steps = ["majors", "bio", "year"];
  const currentStepIndex = steps.indexOf(step);

  return (
    <div className={`fixed inset-0 bg-gray-950/95 backdrop-blur-md z-50 flex justify-center p-3 sm:p-4 overflow-y-auto transition-all duration-200 ${isKeyboardOpen ? "items-start pt-4" : "items-center"}`}>
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-blue-950/20 to-purple-950/20" />
        <div className="absolute top-1/4 -left-32 w-64 h-64 bg-pink-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="relative w-full max-w-xl bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-gray-950/80 rounded-2xl border border-white/[0.08] p-4 sm:p-6 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_80px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-1px_0_rgba(0,0,0,0.3)] backdrop-blur-2xl ring-1 ring-white/[0.05] max-h-[90vh] overflow-y-auto"
      >
        {/* Step Progress Indicator (only show after welcome) */}
        {step !== "welcome" && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                      i < currentStepIndex
                        ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-[0_2px_8px_rgba(16,185,129,0.3)]"
                        : i === currentStepIndex
                          ? "bg-gradient-to-br from-pink-500 to-purple-600 text-white shadow-[0_2px_8px_rgba(236,72,153,0.3)]"
                          : "bg-gray-800/60 text-gray-500 border border-gray-700/50"
                    }`}
                  >
                    {i < currentStepIndex ? <FiCheck size={14} /> : i + 1}
                  </motion.div>
                  {i < steps.length - 1 && (
                    <div
                      className={`w-12 h-0.5 mx-1 rounded-full transition-all duration-300 ${
                        i < currentStepIndex
                          ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                          : "bg-gray-800/60"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {step === "welcome" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Logo Section */}
            <div className="flex justify-center mb-2 sm:mb-4">
              <div className="relative w-16 h-16 sm:w-24 sm:h-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-pink-400/40 border-r-purple-400/40"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 border border-white/[0.08] shadow-[0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]">
                    <LogoIcon
                      width={28}
                      height={28}
                      className="sm:w-9 sm:h-9"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className="text-center flex flex-col items-center justify-center">
              <div className="hidden sm:block">
                <CompoundLogo hideLogo animated size="lg" />
              </div>
              <div className="sm:hidden">
                <CompoundLogo hideLogo animated size="md" />
              </div>
              <p className="text-gray-400 text-xs sm:text-sm mt-1.5 sm:mt-2">
                Your intelligent academic companion at Yale
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`p-2 sm:p-3.5 rounded-xl bg-gradient-to-br ${feature.gradient} border ${feature.border} backdrop-blur-sm shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_12px_rgba(0,0,0,0.2)] transition-all duration-300 cursor-default`}
                >
                  <div className="flex items-center sm:items-start gap-2 sm:gap-3">
                    <div
                      className={`p-1.5 sm:p-2 rounded-lg bg-gray-900/60 border border-white/[0.06] ${feature.iconColor} shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] shrink-0`}
                    >
                      <div className="w-3.5 h-3.5 sm:w-5 sm:h-5 flex items-center justify-center">
                        {feature.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[11px] sm:text-sm text-gray-200 leading-tight">
                        {feature.title}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 leading-relaxed hidden sm:block">
                        {feature.desc}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center pt-2 sm:pt-4"
            >
              <motion.button
                onClick={() => setStep("majors")}
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-purple-500/10 hover:bg-purple-500/20 rounded-xl text-purple-200 font-medium flex items-center gap-2 transition-all border border-purple-500/30 hover:border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(139,92,246,0.15)] text-sm sm:text-base"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
                <FiArrowRight className="opacity-80" />
              </motion.button>
            </motion.div>
          </motion.div>
        )}

        {step === "majors" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 sm:space-y-5"
          >
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200">
                Select your major(s)
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Pick up to 2. Not sure? Just choose what you're exploring.
              </p>
            </div>

            {/* Collapsible Info */}
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => setShowMajorsInfo((s) => !s)}
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs bg-gradient-to-br from-white/[0.06] to-transparent border border-white/[0.08] hover:border-pink-500/30 text-gray-400 hover:text-gray-200 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
              >
                <span>Why this doesn't lock you in</span>
                <motion.span
                  animate={{ rotate: showMajorsInfo ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FiChevronDown size={12} />
                </motion.span>
              </button>
            </div>

            <AnimatePresence initial={false}>
              {showMajorsInfo && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="mx-auto max-w-md rounded-xl border border-white/[0.06] bg-gradient-to-br from-gray-800/40 to-gray-900/40 backdrop-blur-sm text-gray-400 text-xs p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                >
                  <ul className="space-y-1.5">
                    <li className="flex items-start gap-2">
                      <FiCheck
                        className="text-emerald-400 mt-0.5 flex-shrink-0"
                        size={12}
                      />
                      <span>Changing majors takes ~5 seconds in Settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheck
                        className="text-emerald-400 mt-0.5 flex-shrink-0"
                        size={12}
                      />
                      <span>
                        All analytics update instantly when you switch
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <FiCheck
                        className="text-emerald-400 mt-0.5 flex-shrink-0"
                        size={12}
                      />
                      <span>
                        It's just to personalize planning while you explore
                      </span>
                    </li>
                  </ul>
                </motion.div>
              )}
            </AnimatePresence>

            <InfoCard className="text-xs">
              Our goal is to support all majors & concentrations. If yours isn't
              there,{" "}
              <Link
                href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                className="text-pink-300 font-medium hover:underline"
              >
                tell us.
              </Link>
            </InfoCard>

            {/* Major Selection */}
            <div className="space-y-3">
              {selectedMajors.map((major, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2"
                >
                  <div className="flex-1">
                    <MajorDropdown
                      value={major}
                      onChange={(newMajor) => {
                        const newMajors = [...selectedMajors];
                        newMajors[index] = newMajor;
                        setSelectedMajors(newMajors);
                      }}
                      disabledOptions={selectedMajors.filter(
                        (m) => m !== major,
                      )}
                    />
                  </div>
                  {index > 0 && (
                    <button
                      onClick={() => handleRemoveMajor(index)}
                      className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
                      title="Remove major"
                    >
                      <FiX size={16} />
                    </button>
                  )}
                </motion.div>
              ))}

              {selectedMajors.length < 2 && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => {
                    const availableMajor = Object.keys(MAJORS).find(
                      (major) => !selectedMajors.includes(major),
                    );
                    if (availableMajor) {
                      setSelectedMajors([...selectedMajors, availableMajor]);
                    }
                  }}
                  disabled={selectedMajors.length >= 2}
                  className="w-full py-2.5 px-4 rounded-xl border border-dashed border-gray-700/60 hover:border-pink-500/40 bg-gradient-to-br from-white/[0.02] to-transparent hover:from-pink-500/5 text-gray-500 hover:text-gray-300 flex items-center justify-center gap-1.5 transition-all"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
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
                  Add another major
                </motion.button>
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <button
                onClick={() => setStep("welcome")}
                className="py-2 px-4 text-gray-500 hover:text-gray-300 transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep("bio")}
                disabled={selectedMajors.length === 0}
                className={`py-2.5 px-5 rounded-xl font-medium text-sm transition-all ${
                  selectedMajors.length === 0
                    ? "bg-gray-800/60 text-gray-600 cursor-not-allowed border border-gray-700/40"
                    : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(139,92,246,0.15)]"
                }`}
              >
                Continue
              </button>
            </div>
          </motion.div>
        )}

        {step === "bio" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 sm:space-y-5"
          >
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200">
                Tell friends about yourself
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                Visible to accepted friends only. Optional.
              </p>
            </div>

            <div>
              <textarea
                autoFocus
                value={bio}
                onChange={(e) => {
                  const filteredValue = e.target.value.replace(/[\r\n]/g, "");
                  setBio(filteredValue.slice(0, 200));
                }}
                placeholder="Interests, plans, fun facts..."
                className="w-full h-24 sm:h-28 bg-gray-900 border border-gray-700/60 hover:border-gray-600/60 focus:border-pink-500/50 rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 focus:outline-none focus:ring-1 focus:ring-pink-500/30 text-gray-200 placeholder:text-gray-600 text-sm resize-none transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                maxLength={200}
                style={{ overflow: "hidden" }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                  }
                }}
              />
              <div className="flex justify-end mt-1">
                <span
                  className={`text-xs ${bio.length > 180 ? "text-orange-400" : "text-gray-600"}`}
                >
                  {bio.length}/200
                </span>
              </div>
            </div>

            <div className="flex justify-between pt-2 sm:pt-4">
              <button
                onClick={() => setStep("majors")}
                className="py-2 px-3 sm:px-4 text-gray-500 hover:text-gray-300 transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={() => setStep("year")}
                className="py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl font-medium text-sm bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border border-purple-500/30 hover:border-purple-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(139,92,246,0.15)] transition-all"
              >
                {bio.length === 0 ? "Skip" : "Continue"}
              </button>
            </div>
          </motion.div>
        )}

        {step === "year" && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="text-center">
              <h2 className="text-lg sm:text-xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-pink-200 to-purple-200">
                Graduation Year
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mt-1">
                When do you expect to graduate?
              </p>
            </div>

            <div className="flex justify-center">
              <div className="relative">
                <select
                  autoFocus
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                  className="bg-gray-900/80 border border-white/[0.08] hover:border-white/[0.12] focus:border-pink-500/50 rounded-xl px-5 sm:px-6 py-3 sm:py-4 w-32 sm:w-36 text-center text-xl sm:text-2xl font-medium focus:outline-none focus:ring-1 focus:ring-pink-500/30 text-gray-100 transition-all shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),0_4px_12px_rgba(0,0,0,0.2)] appearance-none cursor-pointer"
                  style={{ textAlignLast: "center" }}
                >
                  {[2026, 2027, 2028, 2029, 2030].map((year) => (
                    <option key={year} value={year.toString()}>
                      {year}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <FiChevronDown size={16} />
                </div>
                <div className="absolute -bottom-6 sm:-bottom-7 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] sm:text-xs text-gray-400 px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] whitespace-nowrap">
                    {parseInt(graduationYear) === 2029 && "Freshman"}
                    {parseInt(graduationYear) === 2028 && "Sophomore"}
                    {parseInt(graduationYear) === 2027 && "Junior"}
                    {parseInt(graduationYear) === 2026 && "Senior"}
                    {![2026, 2027, 2028, 2029].includes(
                      parseInt(graduationYear),
                    ) && `Class of ${graduationYear}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6 sm:pt-8">
              <button
                onClick={() => setStep("bio")}
                className="py-2 px-3 sm:px-4 text-gray-500 hover:text-gray-300 transition-colors text-sm"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={!graduationYear || isSubmitting}
                className={`py-2 sm:py-2.5 px-4 sm:px-5 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                  !graduationYear || isSubmitting
                    ? "bg-gray-800/60 text-gray-600 cursor-not-allowed border border-gray-700/40"
                    : "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(16,185,129,0.2)]"
                }`}
              >
                {isSubmitting ? (
                  <>
                    <span className="animate-spin h-4 w-4 border-2 border-emerald-300/30 border-t-emerald-300 rounded-full" />
                    Saving...
                  </>
                ) : (
                  <>
                    <span className="hidden sm:inline">Complete Setup</span>
                    <span className="sm:hidden">Complete</span>
                    <FiCheck size={16} />
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
