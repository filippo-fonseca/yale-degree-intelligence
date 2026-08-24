"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useEffect, type ReactNode } from "react";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { MAJORS } from "@/lib/majors";
import { CERTIFICATES } from "@/lib/certificates";
import { MajorDropdown } from "./ui/MajorDropdown";
import { CertificateDropdown } from "./ui/CertificateDropdown";
import { ShinyButton } from "./ui/shiny-button";
import { GhostButton } from "./ui/ghost-button";
import Link from "next/link";
import LogoIcon from "@/icons/LogoIcon";
import { FiChevronDown, FiX } from "react-icons/fi";
import { GraduationCap, MonitorCog, Upload, Users, Plus } from "lucide-react";
import { toast } from "react-hot-toast";

/**
 * New-user setup, in the v3 system.
 *
 * The visual contract is the landing page's: a near-black canvas under a dot
 * grid and a single glow, one product window, Louize for headlines, SF for
 * interface copy, mono for the fine print, and the shiny black pill as the
 * only primary button. Nothing here carries its own hue: the four steps used
 * to be pink, purple, blue, and emerald at once, which is what made the flow
 * read as a different product from the page the user just came from.
 */

interface MajorSelectionFlowProps {
  onComplete: () => void;
}

/** The four answered steps. "welcome" sits outside the count. */
const STEPS = ["majors", "certificates", "bio", "year"] as const;
type Step = (typeof STEPS)[number];
type FlowStep = "welcome" | Step;

const STEP_LABELS: Record<Step, string> = {
  majors: "Majors",
  certificates: "Certificates",
  bio: "Bio",
  year: "Class year",
};

const GRADUATION_YEARS = [2027, 2028, 2029, 2030, 2031];

/** Yale's four classes, as of the 2026–27 year. Anything else just gets its year. */
const CLASS_NAMES: Record<number, string> = {
  2027: "senior",
  2028: "junior",
  2029: "sophomore",
  2030: "first-year",
};

const FEATURES: { icon: ReactNode; title: string; desc: string }[] = [
  {
    icon: <GraduationCap className="h-4 w-4" />,
    title: "Requirements",
    desc: "See where your major stands, requirement by requirement.",
  },
  {
    icon: <MonitorCog className="h-4 w-4" />,
    title: "Simulator",
    desc: "Plan future semesters and watch the numbers move.",
  },
  {
    icon: <Upload className="h-4 w-4" />,
    title: "Transcript import",
    desc: "Bring your courses in from your YHub unofficial transcript.",
  },
  {
    icon: <Users className="h-4 w-4" />,
    title: "Friends",
    desc: "Compare progress with friends who share their page.",
  },
];

/** Step heading: Louize headline, with an optional SF subhead under it. */
function StepHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <h2 className="text-[1.5rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[1.75rem]/[1.25]">
        {title}
      </h2>
      {subtitle && (
        <p className="mx-auto mt-2 max-w-[42ch] font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** The one microcopy treatment in the flow, for anything that is fine print. */
function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mx-auto max-w-[52ch] text-center font-mono text-[11px] leading-relaxed tracking-tight text-gray-400 dark:text-gray-500">
      {children}
    </p>
  );
}

/** Dashed "add one more" row, used by both the majors and certificates steps. */
function AddRowButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/[0.14] bg-transparent px-4 py-2.5 font-sf text-sm text-gray-500 transition-colors hover:border-black/25 hover:text-gray-900 dark:border-white/[0.14] dark:text-gray-400 dark:hover:border-white/25 dark:hover:text-white"
    >
      <Plus className="h-3.5 w-3.5" />
      {children}
    </motion.button>
  );
}

/** Quiet destructive affordance for removing a row. */
function RemoveRowButton({
  onClick,
  title,
}: {
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className="rounded-lg p-2 text-gray-400 transition-colors hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
    >
      <FiX size={16} />
    </button>
  );
}

export default function MajorSelectionFlow({
  onComplete,
}: MajorSelectionFlowProps) {
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const [step, setStep] = useState<FlowStep>("welcome");
  const [selectedMajors, setSelectedMajors] = useState<string[]>([]);
  const [selectedCertificates, setSelectedCertificates] = useState<string[]>(
    [],
  );
  const [autoOpenCertificateIndex, setAutoOpenCertificateIndex] = useState<
    number | null
  >(null);
  const [graduationYear, setGraduationYear] = useState<string>("2030");
  const [bio, setBio] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMajorsInfo, setShowMajorsInfo] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [duplicateMajorError, setDuplicateMajorError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (step === "majors" && selectedMajors.length === 0) {
      const firstMajor = Object.keys(MAJORS)[0];
      if (firstMajor) setSelectedMajors([firstMajor]);
    }
  }, [step, selectedMajors.length]);

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
        certificates: selectedCertificates,
        graduationYear: parseInt(graduationYear),
        bio: bio,
        updatedAt: new Date(),
        email: user.email,
        photoURL: user.photoURL,
      });
      onComplete();
    } catch (error) {
      console.error("Error saving user data:", error);
      toast.error("Failed to save your profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepIndex = STEPS.indexOf(step as Step);
  const onWelcome = step === "welcome";
  // The rail reads as "how much of setup is behind you", so the current step
  // counts as done once you are looking at it: step 1 of 4 shows a quarter.
  const progressPct = onWelcome ? 0 : ((stepIndex + 1) / STEPS.length) * 100;

  const stepTransition = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: 0.18, ease: [0.25, 1, 0.5, 1] as const },
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center overflow-y-auto bg-[#fafafa]/95 p-3 font-louize backdrop-blur-xl dark:bg-[#0a0a0b]/95 sm:p-4 ${
        isKeyboardOpen ? "items-start pt-4" : "items-center"
      }`}
    >
      {/* Canvas, in the landing page's order: dot grid first, then the page's
          one glow. Both are inert and sit behind the window. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle,rgba(0,0,0,0.05)_1px,transparent_1px)] [background-size:24px_24px] [mask-image:linear-gradient(to_bottom,black,transparent_70%)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.055)_1px,transparent_1px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 flex justify-center"
      >
        <div className="h-[26rem] w-[44rem] max-w-full rounded-full bg-gradient-to-r from-pink-500/15 to-purple-600/15 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
        className="relative my-auto w-full max-w-xl overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.35)] dark:border-white/[0.09] dark:bg-[#101013]"
      >
        {/* Window bar: where you are, in mono, over a hairline progress rail.
            No traffic lights: this is a real window, not a screenshot of one. */}
        <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          <span>setup</span>
          <span>
            {onWelcome
              ? "welcome"
              : `${stepIndex + 1} / ${STEPS.length} · ${STEP_LABELS[step as Step]}`}
          </span>
        </div>
        <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.08]">
          <motion.div
            className="h-px bg-gray-900 dark:bg-white"
            initial={false}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
          />
        </div>

        <div className="max-h-[82vh] overflow-y-auto p-5 sm:p-7">
          <AnimatePresence mode="wait" initial={false}>
            {step === "welcome" && (
              <motion.div key="welcome" {...stepTransition} className="space-y-6">
                <div className="flex flex-col items-center text-center">
                  <span className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white px-3 py-1 font-sf text-[11px] font-medium text-gray-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    DegreeIntelligence v3
                  </span>

                  <div className="mt-5 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/[0.06] bg-[#fafafa] dark:border-white/[0.08] dark:bg-white/[0.04]">
                    {/* The default palette is a mid-blue gradient that washes
                        out on a light tile. darkOnLight is the variant built
                        for light surfaces; dark mode keeps the default. */}
                    <LogoIcon
                      width={24}
                      height={24}
                      variant={resolvedTheme === "dark" ? undefined : "darkOnLight"}
                    />
                  </div>

                  <h1 className="mt-4 text-balance text-[1.75rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[2rem]/[1.25]">
                    Set up the control plane
                    <br className="hidden sm:block" />{" "}
                    <span className="text-gray-400 dark:text-gray-500">
                      for your Yale degree.
                    </span>
                  </h1>

                  <p className="mx-auto mt-3 max-w-[44ch] font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    we only have four short questions for you... then you&apos;re
                    off to cook. You can edit everything later, dw.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {FEATURES.map((feature, index) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + index * 0.05 }}
                      className="flex items-start gap-3 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 dark:border-white/[0.07] dark:bg-white/[0.03]"
                    >
                      <span className="mt-0.5 shrink-0 text-gray-400 dark:text-gray-500">
                        {feature.icon}
                      </span>
                      <div className="min-w-0">
                        <h3 className="font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                          {feature.title}
                        </h3>
                        <p className="mt-0.5 font-sf text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                          {feature.desc}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="flex flex-col items-center gap-3 font-sf">
                  <ShinyButton
                    size="md"
                    withArrow
                    onClick={() => setStep("majors")}
                  >
                    Get started
                  </ShinyButton>
                  <Note>
                    Takes about a minute. No grades needed to begin.
                  </Note>
                </div>
              </motion.div>
            )}

            {step === "majors" && (
              <motion.div key="majors" {...stepTransition} className="space-y-5">
                <StepHeader
                  title="Select your major(s)"
                  subtitle="Pick up to 2. Not sure yet? Choose what you're exploring."
                />

                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowMajorsInfo((s) => !s)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3 py-1.5 font-sf text-xs text-gray-500 transition-colors hover:text-gray-900 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-400 dark:hover:text-white"
                  >
                    <span>Why this doesn&apos;t lock you in</span>
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
                      className="overflow-hidden"
                    >
                      <ul className="mx-auto max-w-md divide-y divide-black/[0.06] rounded-xl border border-black/[0.06] bg-[#fafafa] px-3.5 font-sf text-xs text-gray-500 dark:divide-white/[0.06] dark:border-white/[0.07] dark:bg-white/[0.03] dark:text-gray-400">
                        <li className="py-2.5">
                          Changing majors takes about five seconds in Settings.
                        </li>
                        <li className="py-2.5">
                          Every number in the app updates the moment you switch.
                        </li>
                        <li className="py-2.5">
                          It only personalises planning while you explore.
                        </li>
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-3">
                  {duplicateMajorError && (
                    <p className="font-sf text-xs text-red-500 dark:text-red-400">
                      {duplicateMajorError}
                    </p>
                  )}
                  {selectedMajors.map((major, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1">
                        <MajorDropdown
                          value={major}
                          onChange={(newMajor) => {
                            if (
                              selectedMajors.includes(newMajor) &&
                              selectedMajors[index] !== newMajor
                            ) {
                              setDuplicateMajorError(
                                "You can't select the same major twice",
                              );
                              return;
                            }
                            setDuplicateMajorError(null);
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
                        <RemoveRowButton
                          onClick={() => handleRemoveMajor(index)}
                          title="Remove major"
                        />
                      )}
                    </motion.div>
                  ))}

                  {selectedMajors.length < 2 && (
                    <AddRowButton
                      onClick={() => {
                        const availableMajor = Object.keys(MAJORS).find(
                          (major) => !selectedMajors.includes(major),
                        );
                        if (availableMajor) {
                          setSelectedMajors([...selectedMajors, availableMajor]);
                        }
                      }}
                    >
                      Add {selectedMajors.length === 0 ? "a major" : "a second major"}
                    </AddRowButton>
                  )}
                </div>

                <Note>
                  We want to support every major and concentration. If yours is
                  missing,{" "}
                  <Link
                    href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
                    className="text-gray-600 underline underline-offset-2 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    tell us
                  </Link>
                  .
                </Note>

                <div className="flex items-center justify-between pt-1 font-sf">
                  <GhostButton onClick={() => setStep("welcome")}>
                    Back
                  </GhostButton>
                  <ShinyButton
                    size="sm"
                    withArrow
                    disabled={selectedMajors.length === 0}
                    onClick={() => setStep("certificates")}
                  >
                    Continue
                  </ShinyButton>
                </div>
              </motion.div>
            )}

            {step === "certificates" && (
              <motion.div
                key="certificates"
                {...stepTransition}
                className="space-y-5"
              >
                <StepHeader
                  title="Add certificates"
                  subtitle="Up to 3 Yale College certificates, or skip this for now."
                />

                <div className="space-y-3">
                  {selectedCertificates.map((cert, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="flex-1">
                        <CertificateDropdown
                          value={cert}
                          onChange={(newCert) => {
                            const next = [...selectedCertificates];
                            next[index] = newCert;
                            setSelectedCertificates(next);
                            setAutoOpenCertificateIndex(null);
                          }}
                          disabledOptions={selectedCertificates.filter(
                            (c) => c !== cert,
                          )}
                          defaultOpen={autoOpenCertificateIndex === index}
                          userMajors={selectedMajors}
                        />
                      </div>
                      <RemoveRowButton
                        onClick={() =>
                          setSelectedCertificates(
                            selectedCertificates.filter((_, i) => i !== index),
                          )
                        }
                        title="Remove certificate"
                      />
                    </motion.div>
                  ))}

                  {selectedCertificates.length < 3 && (
                    <AddRowButton
                      onClick={() => {
                        const available = Object.keys(CERTIFICATES).find(
                          (id) => !selectedCertificates.includes(id),
                        );
                        if (available) {
                          const newIndex = selectedCertificates.length;
                          setSelectedCertificates([
                            ...selectedCertificates,
                            available,
                          ]);
                          setAutoOpenCertificateIndex(newIndex);
                        }
                      }}
                    >
                      Add a certificate
                    </AddRowButton>
                  )}
                </div>

                <Note>
                  Most certificates let up to two courses double count toward a
                  major, and a few allow none. We apply each certificate&apos;s
                  own rule as you go.
                </Note>

                <div className="flex items-center justify-between pt-1 font-sf">
                  <GhostButton onClick={() => setStep("majors")}>
                    Back
                  </GhostButton>
                  <ShinyButton
                    size="sm"
                    withArrow
                    onClick={() => setStep("bio")}
                  >
                    {selectedCertificates.length === 0 ? "Skip" : "Continue"}
                  </ShinyButton>
                </div>
              </motion.div>
            )}

            {step === "bio" && (
              <motion.div key="bio" {...stepTransition} className="space-y-5">
                <StepHeader
                  title="Tell friends about yourself"
                  subtitle="Visible only to friends you accept. Optional."
                />

                <div>
                  <textarea
                    autoFocus
                    value={bio}
                    onChange={(e) => {
                      const filteredValue = e.target.value.replace(
                        /[\r\n]/g,
                        "",
                      );
                      setBio(filteredValue.slice(0, 200));
                    }}
                    placeholder="Interests, plans, fun facts..."
                    className="h-24 w-full resize-none rounded-xl border border-black/[0.08] bg-white px-3.5 py-3 font-sf text-sm text-gray-900 transition-colors placeholder:text-gray-400 focus:border-black/25 focus:outline-none dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus:border-white/25 sm:h-28"
                    maxLength={200}
                    style={{ overflow: "hidden" }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                      }
                    }}
                  />
                  <div className="mt-1.5 flex justify-end">
                    <span
                      className={`font-mono text-[11px] ${
                        bio.length > 180
                          ? "text-amber-500 dark:text-amber-400"
                          : "text-gray-400 dark:text-gray-500"
                      }`}
                    >
                      {bio.length}/200
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 font-sf">
                  <GhostButton onClick={() => setStep("certificates")}>
                    Back
                  </GhostButton>
                  <ShinyButton
                    size="sm"
                    withArrow
                    onClick={() => setStep("year")}
                  >
                    {bio.length === 0 ? "Skip" : "Continue"}
                  </ShinyButton>
                </div>
              </motion.div>
            )}

            {step === "year" && (
              <motion.div key="year" {...stepTransition} className="space-y-5">
                <StepHeader title="When do you graduate?" />

                <div className="space-y-3">
                  <div className="flex flex-wrap justify-center gap-2">
                    {GRADUATION_YEARS.map((year) => {
                      const isSelected = parseInt(graduationYear) === year;
                      return (
                        <button
                          key={year}
                          type="button"
                          onClick={() => setGraduationYear(year.toString())}
                          aria-pressed={isSelected}
                          className={`rounded-full border px-4 py-2 font-sf text-sm font-medium transition-colors ${
                            isSelected
                              ? "border-transparent bg-gray-900 text-white dark:bg-white dark:text-gray-900"
                              : "border-black/[0.08] bg-white text-gray-600 hover:text-gray-900 dark:border-white/[0.1] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-white"
                          }`}
                        >
                          {year}
                        </button>
                      );
                    })}
                  </div>
                  <Note>
                    Class of {graduationYear}
                    {CLASS_NAMES[parseInt(graduationYear)]
                      ? ` · ${CLASS_NAMES[parseInt(graduationYear)]} this year`
                      : ""}
                  </Note>
                </div>

                <div className="flex items-center justify-between pt-1 font-sf">
                  <GhostButton onClick={() => setStep("bio")}>Back</GhostButton>
                  <ShinyButton
                    size="sm"
                    withArrow
                    pending={isSubmitting}
                    disabled={!graduationYear}
                    onClick={handleSubmit}
                  >
                    {isSubmitting ? "Saving..." : "Finish setup"}
                  </ShinyButton>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
