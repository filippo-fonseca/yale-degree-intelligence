"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { toast } from "react-hot-toast";
import {
  FiChevronDown,
  FiCopy,
  FiExternalLink,
  FiSettings,
} from "react-icons/fi";
import type { User } from "firebase/auth";
import type { FriendsProfileVisibility } from "@/lib/types";
import type { resolveFriendsProfileVisibility } from "@/lib/types";
import { UserAvatar } from "../ui/UserAvatar";
import type { FriendsUserProfile } from "./friendsTypes";

/**
 * The "your public page" control on the Friends tab.
 *
 * This used to render a full PublicProfileView inline as a live preview, inside
 * a hardcoded `bg-gray-950` frame. Two problems with that: the preview was the
 * largest thing on a tab whose actual job is managing friends, and the frame had
 * no light-mode counterpart, so it put a black slab in the middle of a white
 * card.
 *
 * Your public page is a setting, so it reads as one. The card states who friends
 * see and exactly which sections are shared; the page itself is one click away
 * and opens as the real thing rather than a scaled-down copy of it. The share
 * toggles tell the same truth the preview did, in a line instead of a page.
 */

const SECTIONS = [
  { key: "showBio", label: "Bio" },
  { key: "showStats", label: "Stats" },
  { key: "showDistributionals", label: "Distributionals" },
  { key: "showCourses", label: "Courses" },
] as const;

type ResolvedVisibility = ReturnType<typeof resolveFriendsProfileVisibility>;

export function PublicPageCard({
  user,
  userProfile,
  shareUrl,
  resolvedVisibility,
  savingVisibility,
  updateVisibility,
  showCustomize,
  onToggleCustomize,
}: {
  user: User;
  userProfile: FriendsUserProfile | null;
  shareUrl: string;
  resolvedVisibility: ResolvedVisibility;
  savingVisibility: boolean;
  updateVisibility: (patch: Partial<FriendsProfileVisibility>) => Promise<void>;
  showCustomize: boolean;
  onToggleCustomize: () => void;
}) {
  const majors = userProfile?.majors ?? [];
  const shared = SECTIONS.filter(({ key }) => resolvedVisibility[key]);
  const hidden = SECTIONS.length - shared.length;

  const subtitle = [
    userProfile?.graduationYear ? `Class of ${userProfile.graduationYear}` : null,
    majors.length > 0 ? majors.join(" · ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section className="mb-6 rounded-xl border border-gray-200 bg-white shadow-neu backdrop-blur-md dark:border-white/[0.08] dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60">
      <div className="flex items-start gap-3 p-4">
        <UserAvatar
          photoURL={user.photoURL || undefined}
          displayName={user.displayName || undefined}
          email={user.email || undefined}
          size={40}
        />

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-600 dark:text-pink-400">
            Your public page
          </p>
          <p className="mt-1 truncate text-sm font-medium text-gray-900 dark:text-gray-100">
            {user.displayName || user.email?.split("@")[0] || "Your page"}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-gray-500 dark:text-gray-400">
              {subtitle}
            </p>
          )}

          {/* What friends actually see, stated rather than previewed. */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {shared.length === 0 ? (
              <span className="text-[11px] text-gray-500 dark:text-gray-400">
                Nothing is shared yet. Turn a section on below.
              </span>
            ) : (
              shared.map(({ key, label }) => (
                <span
                  key={key}
                  className="rounded-full border border-pink-200 bg-pink-50 px-2 py-0.5 text-[10px] font-medium text-pink-700 dark:border-pink-800/40 dark:bg-pink-900/20 dark:text-pink-300"
                >
                  {label}
                </span>
              ))
            )}
            {hidden > 0 && shared.length > 0 && (
              <span className="text-[10px] text-gray-400 dark:text-gray-500">
                {hidden} hidden
              </span>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-gray-500 dark:text-gray-400">
            Grades are never shared, whatever you turn on here.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-200 px-4 py-3 dark:border-white/[0.06]">
        <Link
          href={`/user/${user.uid}`}
          target="_blank"
          className="inline-flex flex-1 min-w-[120px] items-center justify-center gap-1.5 rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-xs font-medium text-pink-700 transition hover:bg-pink-100 dark:border-pink-800/40 dark:bg-pink-900/20 dark:text-pink-300 dark:hover:bg-pink-800/30"
        >
          <FiExternalLink size={12} />
          View public page
        </Link>
        <button
          type="button"
          onClick={() => {
            if (!shareUrl) return;
            navigator.clipboard.writeText(shareUrl);
            toast.success("Link copied");
          }}
          className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-pink-300 hover:text-pink-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-pink-500/40 dark:hover:text-pink-300"
        >
          <FiCopy size={12} />
          Copy link
        </button>
        <button
          type="button"
          onClick={onToggleCustomize}
          aria-expanded={showCustomize}
          className="inline-flex flex-1 min-w-[100px] items-center justify-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 transition hover:border-pink-300 hover:text-pink-600 dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300 dark:hover:border-pink-500/40 dark:hover:text-pink-300"
        >
          <FiSettings size={12} />
          What&apos;s shared
          <FiChevronDown
            size={12}
            className={`transition-transform ${showCustomize ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {showCustomize && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-gray-200 px-4 py-3 dark:border-white/[0.06]">
              {SECTIONS.map(({ key, label }) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200/70 bg-gray-50 p-2.5 dark:border-white/[0.06] dark:bg-white/[0.03]"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300">
                    {label}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={resolvedVisibility[key]}
                    aria-label={label}
                    disabled={savingVisibility}
                    onClick={() =>
                      updateVisibility({ [key]: !resolvedVisibility[key] })
                    }
                    className={`relative h-5 w-9 rounded-full transition-colors disabled:opacity-60 ${
                      resolvedVisibility[key]
                        ? "bg-pink-500"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                        resolvedVisibility[key] ? "translate-x-4" : ""
                      }`}
                    />
                  </button>
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
