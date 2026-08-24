"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";
import { BookOpen, EyeOff, GraduationCap, Layers } from "lucide-react";
import { toast } from "react-hot-toast";
import { PublicProfileView } from "@/components/FriendsProfile/PublicProfileView";
import {
  DEMO_PREVIEW_COURSES,
  DEMO_PREVIEW_USER,
} from "@/components/FriendsProfile/demoPreviewData";
import { ShinyButton } from "@/components/ui/shiny-button";
import { GhostButton } from "@/components/ui/ghost-button";

/**
 * Friends, before you have turned it on.
 *
 * The old version led with a full, live PublicProfileView pinned to a black
 * slab, and put the button that actually does something underneath it. So the
 * loudest thing on the screen was a preview of a page that did not exist yet,
 * and the decision the screen exists to offer was below the fold.
 *
 * Now the decision is first and the preview is opt-in: enable sits directly
 * under the headline, what is and is not shared is stated in a few lines, and
 * the example page opens in a dialog for anyone who wants to look before
 * deciding.
 */

type FriendsOptInPromptProps = {
  onToggleFriends: (enabled: boolean) => Promise<void>;
};

const SHARED = [
  {
    icon: <BookOpen className="h-4 w-4" />,
    label: "Courses and semesters",
    detail: "Codes, names, and when you took them.",
  },
  {
    icon: <Layers className="h-4 w-4" />,
    label: "Distributionals and credits",
    detail: "What each course counted for.",
  },
  {
    icon: <GraduationCap className="h-4 w-4" />,
    label: "Major, year, and bio",
    detail: "The bio is optional and yours to write.",
  },
];

function ExamplePageDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/50 p-3 font-louize backdrop-blur-md dark:bg-black/75 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 8 }}
        transition={{ duration: 0.22, ease: [0.25, 1, 0.5, 1] }}
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] dark:border-white/[0.09] dark:bg-[#101013]"
      >
        <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          <span>example page</span>
          <span className="pr-6">not your data</span>
        </div>
        <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.08]" />

        <button
          onClick={onClose}
          aria-label="Close example"
          className="absolute right-3 top-2 z-10 rounded-lg p-1.5 text-gray-400 transition-colors hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200"
        >
          <FiX size={16} />
        </button>

        <div className="max-h-[78vh] overflow-y-auto p-4 sm:p-5">
          {/* Pinned dark on purpose: PublicProfileView carries no light-mode
              variants, because the shared page is always a dark surface. The
              frame has to match it in both themes or the preview's own text
              colours land on the wrong background. */}
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0b] p-2">
            <PublicProfileView
              profile={{
                displayName: DEMO_PREVIEW_USER.displayName,
                majors: DEMO_PREVIEW_USER.majors,
                graduationYear: DEMO_PREVIEW_USER.graduationYear,
                bio: DEMO_PREVIEW_USER.bio,
              }}
              courses={DEMO_PREVIEW_COURSES}
              isPreview
            />
          </div>
          <p className="mt-3 text-center font-mono text-[11px] text-gray-400 dark:text-gray-500">
            A made-up student, to show the shape of it. Yours is built from your
            own courses.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function FriendsOptInPrompt({ onToggleFriends }: FriendsOptInPromptProps) {
  const [isEnabling, setIsEnabling] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const enable = async () => {
    setIsEnabling(true);
    try {
      await onToggleFriends(true);
      toast.success("Friends is on.");
    } catch {
      toast.error("Could not turn Friends on. Try again?");
    } finally {
      setIsEnabling(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl font-louize">
      <div className="mb-5">
        <h2 className="text-2xl font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
          Friends
        </h2>
        <p className="mt-1 font-sf text-sm text-gray-500 dark:text-gray-400">
          See how other Yalies built their path: courses and distributionals,
          never grades.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
        className="overflow-hidden rounded-2xl border border-black/[0.08] bg-white shadow-[0_32px_80px_-32px_rgba(0,0,0,0.25)] dark:border-white/[0.09] dark:bg-[#101013] dark:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center justify-between px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gray-400 dark:text-gray-500">
          <span>friends</span>
          <span>off</span>
        </div>
        <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.08]" />

        <div className="p-5 sm:p-7">
          <h3 className="max-w-[24ch] text-balance text-[1.5rem]/[1.25] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-[1.75rem]/[1.25]">
            Compare paths with people who
            <span className="text-gray-400 dark:text-gray-500">
              {" "}
              have walked yours.
            </span>
          </h3>
          <p className="mt-3 max-w-[56ch] font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-400">
            Turn Friends on and you get a page of your own that accepted friends
            can see, and access to theirs. It is the fastest way to find out what
            an upperclassman in your major actually took, and in what order.
          </p>

          {/* The decision, immediately, before any of the detail below it. */}
          {/* data-tour lives on the wrapper: the tour anchors to this button and
              ShinyButton does not forward arbitrary attributes. */}
          <div
            data-tour="friends-enable"
            className="mt-5 flex flex-wrap items-center gap-2.5 font-sf"
          >
            <ShinyButton
              size="md"
              withArrow={!isEnabling}
              pending={isEnabling}
              onClick={enable}
            >
              {isEnabling ? "Turning it on..." : "Enable Friends"}
            </ShinyButton>
            <GhostButton onClick={() => setShowExample(true)}>
              See an example page
            </GhostButton>
          </div>
          <p className="mt-2.5 font-mono text-[11px] text-gray-400 dark:text-gray-500">
            Nothing is shared until you accept a friend. You can turn it back off
            whenever you like.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {SHARED.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 dark:border-white/[0.07] dark:bg-white/[0.03]"
              >
                <span className="text-gray-400 dark:text-gray-500">
                  {item.icon}
                </span>
                <p className="mt-2 font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                  {item.label}
                </p>
                <p className="mt-0.5 font-sf text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {item.detail}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-2 flex items-start gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3">
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <p className="font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              <span className="font-medium text-gray-900 dark:text-white">
                Grades and GPA are never shared.
              </span>{" "}
              Not with friends, not on your page, not with anyone. There is no
              setting that turns that on.
            </p>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {showExample && (
          <ExamplePageDialog onClose={() => setShowExample(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
