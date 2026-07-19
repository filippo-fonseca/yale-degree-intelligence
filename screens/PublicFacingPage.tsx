"use client";

import { FiHeart } from "react-icons/fi";
import Link from "next/link";
import { useState, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import CosmicBackground from "@/components/CosmicBackground/page";
import LandingHero from "./landing/LandingHero";
import {
  LandingBlueprintSection,
  LandingMissionSection,
  LandingTeamSection,
  LandingCtaSection,
} from "./landing/LandingFeatureSections";
import LandingProductPreviews from "./landing/LandingProductPreviews";
import LandingVideoModal from "./landing/LandingVideoModal";

export default function AboutPage() {
  const [logInFlow, setLogInFlow] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Close modal on ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowVideoModal(false);
    };
    if (showVideoModal) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [showVideoModal]);

  if (logInFlow) return <LoginPage onBackClick={() => setLogInFlow(false)} />;

  const onLogin = () => setLogInFlow(true);
  const onOpenVideo = () => setShowVideoModal(true);

  return (
    <div className="min-h-screen pt-2 bg-gradient-to-br from-gray-50 via-gray-100 to-white dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 font-louize overflow-x-hidden">
      <CosmicBackground mode="stars" opacity={0.9} />
      <LandingHero onLogin={onLogin} onOpenVideo={onOpenVideo} />
      <LandingBlueprintSection />
      <LandingProductPreviews onLogin={onLogin} onOpenVideo={onOpenVideo} />
      <LandingMissionSection />
      <LandingTeamSection />
      {/* Wait... Are You Trying to Replace CourseTable? */}
      {/* <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-800/50 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white">
              Wait, wait wait... are you trying to replace{" "}
              <span className="text-blue-300">CourseTable</span>?
            </h2>
          </div>
          <div className="text-gray-300 max-w-4xl mx-auto space-y-4 text-lg leading-relaxed">
            <p>
              <strong>No. Not at all.</strong> We <em>love</em> CourseTable 💙.
              Heck, our founder,{" "}
              <span className="text-white-300 font-medium">Filippo</span>, is
              literally on the{" "}
              <Link
                href="https://coursetable.com/about"
                target="_blank"
                className="text-blue-300"
              >
                CourseTable team
              </Link>
              .
            </p>
            <p>
              This fulfills{" "}
              <span className="text-white-300">
                a completely different need
              </span>{" "}
              — one that CourseTable doesn't aim to cover by design, as we are
              different products entirely. We're here for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>
                Visualizing your grades and stats in beautiful, digestible ways
              </li>
              <li>Planning out your progress toward your degree</li>
              <li>Getting real-time analysis from our suggestion models</li>
              <li>Seeing what upperclassmen have done in previous years</li>
              <li>
                Exploring different majors and mapping out "what if" scenarios
              </li>
            </ul>
            <p>
              That's <strong>not</strong> what CourseTable does — and that's the
              point. They help you <em>choose</em> courses, see course reviews,
              and see friend's worksheets. We don't (and never will) do that. We
              instead help you <em>make sense of the journey</em> and
              democratize the complex planning process at Yale with regard to,
              in particular, your major.
            </p>
          </div>
        </div>
      </section> */}
      <LandingCtaSection />

      {/* Footer */}
      <div className="py-6 px-4 text-center text-gray-500 dark:text-gray-400 text-xs border-t border-black/[0.06] dark:border-white/[0.05]">
        <p className="flex flex-wrap items-center justify-center gap-1.5 max-w-md mx-auto leading-relaxed">
          <span className="inline-flex items-center gap-1">
            Made with <FiHeart className="w-3 h-3 text-blue-400" />
          </span>
          <span className="hidden sm:inline">|</span>
          <span>Not affiliated with Yale University.</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-gray-500 dark:text-gray-400">
          <Link href="/changelog" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Changelog
          </Link>
          <Link href="/terms" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Terms
          </Link>
          <Link href="/mission" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Mission
          </Link>
          <Link href="/contact" className="hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
            Contact
          </Link>
        </p>
        <p className="mt-2 text-gray-400 dark:text-gray-500 flex flex-wrap items-center justify-center gap-1.5">
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300">
            v3.0.0
          </span>
          <span>© {new Date().getFullYear()} DegreeIntelligence</span>
        </p>
      </div>

      <LandingVideoModal
        open={showVideoModal}
        onClose={() => setShowVideoModal(false)}
      />

      {/* Shared components */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }

        @property --angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }

        @keyframes border-spin {
          from {
            --angle: 0deg;
          }
          to {
            --angle: 360deg;
          }
        }

        .animate-border-spin {
          animation: border-spin 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
