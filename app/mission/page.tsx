"use client";

import { motion } from "framer-motion";
import { ShinyButton } from "@/components/ui/shiny-button";
import {
  Kicker,
  StaticPageFooter,
  StaticPageNav,
  StaticPageShell,
} from "@/components/ui/StaticPageChrome";

/**
 * The manifesto, in the v3 system.
 *
 * Was a dark-only page: a grey gradient canvas, a star field, glass cards, and
 * a blue-to-purple gradient CTA. The words are unchanged; everything around
 * them now matches the landing page, and it works in light mode.
 */

const COMMANDMENTS = [
  {
    number: "01",
    title: "Democratize Academic Planning",
    description:
      "Every Yale student deserves equal access to clear, intuitive tools for navigating their academic journey.",
  },
  {
    number: "02",
    title: "Eliminate Administrative Friction",
    description:
      "If a process can be automated, it should be. No student should waste hours deciphering PDF requirements or maintaining spreadsheets.",
  },
  {
    number: "03",
    title: "Build for Students, by Students",
    description:
      "Our solutions emerge from lived experience. We solve the problems we've actually faced, not hypothetical ones.",
  },
  {
    number: "04",
    title: "Clarity Over Complexity",
    description:
      "Academic requirements should be immediately understandable, not hidden behind layers of institutional jargon.",
  },
  {
    number: "05",
    title: "Open by Default",
    description:
      "Tools this essential shouldn't be gatekept. We build and share our progress transparently.",
  },
  {
    number: "06",
    title: "Iterate Relentlessly",
    description:
      "The perfect system doesn't exist. We keep improving based on real student feedback.",
  },
];

const reveal = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.5, ease: [0.21, 0.6, 0.2, 1] as const },
};

export default function MissionPage() {
  return (
    <StaticPageShell>
      <StaticPageNav />

      <main className="mx-auto max-w-3xl px-4 pb-4 pt-16 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <Kicker>Manifesto</Kicker>
          <h1 className="mx-auto mt-4 max-w-[20ch] text-balance text-[2.25rem]/[1.1] font-medium tracking-[-0.02em] text-gray-900 dark:text-white sm:text-5xl/[1.1]">
            The principles that
            <br className="hidden sm:block" />{" "}
            <span className="text-gray-400 dark:text-gray-500">guide us.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-[52ch] font-sf text-base leading-relaxed text-gray-500 dark:text-gray-400">
            Everything we build at DegreeIntelligence stems from these core
            beliefs.
          </p>
        </motion.div>

        <div className="mt-14 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {COMMANDMENTS.map((item, index) => (
            <motion.div
              key={item.number}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className="rounded-xl border border-black/[0.06] bg-white p-4 dark:border-white/[0.07] dark:bg-white/[0.03]"
            >
              <span className="font-mono text-[11px] text-gray-400 dark:text-gray-500">
                {item.number}
              </span>
              <h2 className="mt-2 font-sf text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.title}
              </h2>
              <p className="mt-1.5 font-sf text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                {item.description}
              </p>
            </motion.div>
          ))}
        </div>

        <motion.section
          {...reveal}
          className="mt-14 rounded-2xl border border-black/[0.08] bg-white p-6 shadow-[0_32px_80px_-32px_rgba(0,0,0,0.25)] dark:border-white/[0.09] dark:bg-[#101013] dark:shadow-[0_32px_80px_-24px_rgba(0,0,0,0.45)] sm:p-8"
        >
          <h3 className="text-[1.35rem]/[1.3] font-medium tracking-[-0.02em] text-gray-900 dark:text-white">
            Why this matters
          </h3>
          <p className="mt-3 font-sf text-sm leading-relaxed text-gray-600 dark:text-gray-400">
            Yale attracts some of the world&apos;s brightest minds, yet we force
            students to navigate degree requirements with tools that look like
            tech from the early 2000s. This isn&apos;t just about convenience.
            We built this to remove bureaucratic friction so students can focus
            on what actually matters: learning, research, and building the
            future. Or whatever you want. It&apos;s up to you. {":)"}
          </p>
          <p className="mt-3 font-sf text-sm leading-relaxed text-gray-500 dark:text-gray-500">
            This manifesto is our way of holding ourselves accountable.
            DegreeIntelligence is our simple contribution to this vision.
          </p>
        </motion.section>

        <motion.div {...reveal} className="mt-10 flex justify-center font-sf">
          {/* href, not a Link wrapper: ShinyButton renders its own anchor when
              given one, and a <button> inside an <a> is invalid markup. */}
          <ShinyButton size="md" withArrow href="/">
            Get started with DegreeIntelligence
          </ShinyButton>
        </motion.div>
      </main>

      <StaticPageFooter />
    </StaticPageShell>
  );
}
