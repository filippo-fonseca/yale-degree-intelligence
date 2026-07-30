"use client";

import { FiCheck, FiUsers, FiX } from "react-icons/fi";
import { Award, BookOpen, Clock, GraduationCap } from "lucide-react";
import ProductFrame from "./ProductFrame";
import {
  FRIENDS_MOCK,
  ProgressBar,
  RequirementPill,
  STATS_MOCK,
} from "./LandingMocks";

interface LandingFeaturesProps {
  onLogin: () => void;
  onWatchVideo?: () => void;
}

function FeatureBlock({
  id,
  eyebrow,
  title,
  description,
  children,
  reverse = false,
  cta,
}: {
  id?: string;
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  reverse?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-28 py-16 sm:py-24">
      <div
        className={`mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-20 lg:px-8 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <div>
          <p className="font-sf text-xs font-medium uppercase tracking-[0.16em] text-gray-500 dark:text-gray-400">
            {eyebrow}
          </p>
          <h3 className="mt-2 font-louize text-2xl font-medium tracking-tight text-gray-900 dark:text-white sm:text-3xl">
            {title}
          </h3>
          <p className="mt-4 font-sf text-base leading-relaxed text-gray-600 dark:text-gray-300">
            {description}
          </p>
          {cta && <div className="mt-6">{cta}</div>}
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  sub,
  icon,
  color,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3.5 shadow-neu dark:border-gray-800/50 dark:bg-gradient-to-br dark:from-gray-900/60 dark:via-gray-900/40 dark:to-gray-950/60">
      <div className="flex items-center justify-between">
        <p className="font-sf text-xs text-gray-500">{label}</p>
        <div className={color}>{icon}</div>
      </div>
      <p className={`mt-1 font-louize text-2xl font-medium ${color}`}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 font-sf text-[10px] text-gray-500">{sub}</p>
      )}
    </div>
  );
}

export default function LandingFeatures({
  onLogin,
  onWatchVideo,
}: LandingFeaturesProps) {
  return (
    <div className="border-y border-black/[0.04] bg-white/40 dark:border-white/[0.04] dark:bg-white/[0.015]">
      <FeatureBlock
        id="simulator"
        eyebrow="Simulator"
        title="Drag, drop, done."
        description="Build a semester-by-semester plan from your major or the full Yale catalog. Save plans, duplicate them, and share with friends or mentors."
        cta={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={onLogin}
              className="rounded-full bg-pink-500 px-5 py-2 font-sf text-sm font-medium text-white transition hover:bg-pink-600"
            >
              Try Simulator
            </button>
            {onWatchVideo && (
              <button
                onClick={onWatchVideo}
                className="rounded-full border border-black/[0.08] px-5 py-2 font-sf text-sm font-medium text-gray-700 transition hover:bg-black/[0.03] dark:border-white/[0.1] dark:text-gray-200 dark:hover:bg-white/[0.05]"
              >
                See it in action
              </button>
            )}
          </div>
        }
      >
        <ProductFrame title="Simulator">
          <img
            src="/demo/simulator.gif"
            alt="DegreeIntelligence Simulator"
            className="aspect-video w-full object-cover"
          />
        </ProductFrame>
      </FeatureBlock>

      <FeatureBlock
        id="stats"
        reverse
        eyebrow="Stats"
        title="Context, not just grades."
        description="GPA trajectory, credit pace, and distribution, so you know where you stand, not just what you got."
        cta={
          <button
            onClick={onLogin}
            className="rounded-full bg-pink-500 px-5 py-2 font-sf text-sm font-medium text-white transition hover:bg-pink-600"
          >
            See my stats
          </button>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <StatTile
              label="Cumulative GPA"
              value={STATS_MOCK.gpa}
              icon={<GraduationCap className="h-4 w-4" />}
              color="text-emerald-600 dark:text-emerald-400"
            />
            <StatTile
              label="Total Credits"
              value={STATS_MOCK.credits}
              sub="78% to graduation"
              icon={<BookOpen className="h-4 w-4" />}
              color="text-blue-600 dark:text-blue-400"
            />
            <StatTile
              label="Courses"
              value={STATS_MOCK.courses}
              sub="& 5 in progress"
              icon={<Award className="h-4 w-4" />}
              color="text-purple-600 dark:text-purple-300"
            />
            <StatTile
              label="Avg / semester"
              value={STATS_MOCK.avg}
              sub="across 6 semesters"
              icon={<Clock className="h-4 w-4" />}
              color="text-blue-600 dark:text-blue-300"
            />
          </div>
          <ProductFrame showChrome={false}>
            <div className="p-4">
              <p className="mb-3 font-sf text-xs text-gray-500">
                GPA trend · Fall &apos;23 → Spring &apos;25
              </p>
              <div className="flex h-24 items-end gap-2">
                {[3.79, 3.71, 3.8, 3.88].map((gpa) => (
                  <div
                    key={gpa}
                    className="flex flex-1 flex-col items-center gap-1"
                  >
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-pink-500/85 to-purple-400/55"
                      style={{ height: `${(gpa / 4) * 100}%` }}
                    />
                    <span className="font-sf text-[9px] text-gray-400">
                      {gpa}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </ProductFrame>
        </div>
      </FeatureBlock>

      <FeatureBlock
        id="major-progress"
        eyebrow="Major"
        title="Requirements, visualized."
        description="Progress bars plus a grid of requirement cards, each with the courses you’ve taken and what’s still open."
        cta={
          <button
            onClick={onLogin}
            className="rounded-full bg-pink-500 px-5 py-2 font-sf text-sm font-medium text-white transition hover:bg-pink-600"
          >
            View my progress
          </button>
        }
      >
        <ProductFrame showChrome={false}>
          <div className="space-y-4 p-5">
            <div>
              <div className="mb-1.5 flex justify-between font-sf text-xs text-gray-500">
                <span>Completed only</span>
                <span className="font-medium text-blue-600 dark:text-blue-300">
                  42%
                </span>
              </div>
              <ProgressBar percent={42} />
            </div>
            <div>
              <div className="mb-1.5 flex justify-between font-sf text-xs text-gray-500">
                <span>Including in-progress</span>
                <span className="font-medium text-purple-600 dark:text-purple-300">
                  67%
                </span>
              </div>
              <ProgressBar percent={67} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <RequirementPill label="CPSC 323" status="complete" />
              <RequirementPill label="EENG 200" status="in-progress" />
              <RequirementPill label="CPSC 365" status="not-taken" />
            </div>
          </div>
        </ProductFrame>
      </FeatureBlock>

      <FeatureBlock
        reverse
        eyebrow="Friends"
        title="Learn from paths ahead of you."
        description="Mutually see courses, majors, and years, never grades or GPA. Built for upperclassmen advice without oversharing."
        cta={
          <button
            onClick={onLogin}
            className="rounded-full bg-pink-500 px-5 py-2 font-sf text-sm font-medium text-white transition hover:bg-pink-600"
          >
            Enable Friends
          </button>
        }
      >
        <ProductFrame showChrome={false}>
          <div className="p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="flex items-center gap-2 font-louize text-sm font-medium text-gray-900 dark:text-white">
                <FiUsers size={14} className="text-pink-500" />
                Friends
              </h4>
              <span className="font-sf text-[10px] text-gray-400">3 connected</span>
            </div>
            <div className="space-y-2.5">
              {FRIENDS_MOCK.map((friend) => (
                <div
                  key={friend.name}
                  className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-neu-sm dark:border-gray-800/50 dark:bg-gray-900/40"
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${friend.gradient} font-sf text-xs font-medium text-white`}
                  >
                    {friend.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-sf text-sm font-medium text-gray-900 dark:text-white">
                      {friend.name}
                    </p>
                    <p className="truncate font-sf text-[10px] text-gray-500">
                      {friend.meta}
                    </p>
                  </div>
                  <span className="shrink-0 font-sf text-[10px] text-gray-400">
                    {friend.detail}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-pink-200/70 bg-pink-50/60 p-3 dark:border-pink-500/20 dark:bg-pink-500/5">
              <p className="mb-2 font-sf text-xs font-medium text-pink-700 dark:text-pink-300">
                What gets shared
              </p>
              <ul className="space-y-1 font-sf text-[11px] text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <FiCheck className="text-emerald-500" size={12} />
                  Course codes, semesters, credits
                </li>
                <li className="flex items-center gap-2">
                  <FiCheck className="text-emerald-500" size={12} />
                  Major and graduation year
                </li>
                <li className="flex items-center gap-2">
                  <FiX className="text-red-500" size={12} />
                  Grades and GPA never leave your account
                </li>
              </ul>
            </div>
          </div>
        </ProductFrame>
      </FeatureBlock>
    </div>
  );
}
