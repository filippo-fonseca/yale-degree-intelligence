"use client";

import { FiArrowRight, FiPlayCircle } from "react-icons/fi";
import ProductFrame from "./ProductFrame";
import { HeroAppMock } from "./LandingMocks";

interface LandingHeroProps {
  onLogin: () => void;
  onWatchVideo: () => void;
}

export default function LandingHero({
  onLogin,
  onWatchVideo,
}: LandingHeroProps) {
  return (
    <section className="relative overflow-hidden pb-16 pt-8 sm:pb-24 sm:pt-12">
      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/70 px-3 py-1 font-sf text-[11px] font-medium text-gray-600 shadow-sm backdrop-blur-md dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-gray-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            DegreeIntelligence v3 · For Yalies, by Yalies
          </p>

          <h1 className="font-louize text-[2.6rem] font-medium leading-[1.08] tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-[3.75rem]">
            Your Yale degree,
            <br className="hidden sm:block" />{" "}
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent dark:from-blue-300 dark:via-purple-300 dark:to-pink-300">
              made easy.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl font-sf text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
            Import your transcript, see major progress clearly, and plan
            semesters with the Simulator, built for the mess of Yale
            requirements.
          </p>

          <p className="mt-3 font-sf text-sm text-gray-500 dark:text-gray-400">
            1 in 5 Yale undergrads already use DegreeIntelligence.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onLogin}
              className="inline-flex items-center gap-2 rounded-full bg-pink-500 px-6 py-2.5 font-sf text-sm font-medium text-white shadow-[0_10px_28px_rgba(236,72,153,0.28)] transition hover:bg-pink-600 hover:shadow-[0_12px_32px_rgba(236,72,153,0.34)]"
            >
              Log in with CAS
              <FiArrowRight size={14} />
            </button>
            <button
              onClick={onWatchVideo}
              className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/70 px-5 py-2.5 font-sf text-sm font-medium text-gray-700 backdrop-blur-md transition hover:border-black/[0.14] hover:bg-white dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-gray-200 dark:hover:bg-white/[0.07]"
            >
              What&apos;s new in v3
              <FiPlayCircle size={15} className="opacity-70" />
            </button>
          </div>
        </div>

        <div className="relative mx-auto mt-14 max-w-4xl sm:mt-16">
          <div
            className="landing-glow pointer-events-none absolute left-1/2 top-[42%] h-[22rem] w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            aria-hidden
          />
          <ProductFrame title="degreeint.com" className="relative">
            <HeroAppMock />
          </ProductFrame>
        </div>
      </div>
    </section>
  );
}
