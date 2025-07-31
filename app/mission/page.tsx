"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowRight } from "react-icons/fi";
import CompoundLogo from "@/components/ui/CompoundLogo";

export default function MissionPage() {
  const commandments = [
    {
      number: "01",
      title: "Democratize Academic Planning.",
      description:
        "We believe every Yale student deserves equal access to clear, intuitive tools for navigating their academic journey.",
    },
    {
      number: "02",
      title: "Eliminate Administrative Friction.",
      description:
        "If a process can be automated, it should be. No student should waste hours deciphering PDF requirements or maintaining spreadsheets.",
    },
    {
      number: "03",
      title: "Build for Students, by Students.",
      description:
        "Our solutions emerge from lived experience. We solve the problems we've actually faced, not hypothetical ones.",
    },
    {
      number: "04",
      title: "Clarity Over Complexity.",
      description:
        "Academic requirements should be immediately understandable, not hidden behind layers of institutional jargon.",
    },
    {
      number: "05",
      title: "Open by Default.",
      description:
        "Tools this essential shouldn't be gatekept. We build and share our progress transparently.",
    },
    {
      number: "06",
      title: "Iterate Relentlessly.",
      description:
        "The perfect system doesn't exist. We'll keep improving based on real student feedback until we get as close as possible.",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/80 to-purple-900 font-louize">
      {/* Header */}
      <header className="border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <Link href="/">
            <div className="flex items-center gap-2">
              <LogoIcon className="w-8 h-8 text-white" />
              <CompoundLogo hideLogo animated size="sm" />
            </div>
          </Link>
          <nav className="flex gap-6">
            {/* <Link
              href="/about"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Home
            </Link> */}
            {/* <Link
              href="/"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Access platform
            </Link> */}
            <Link
              href="/"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/20 border border-blue-500/50 hover:bg-blue-500/30 text-blue-200 hover:text-white transition-colors"
            >
              <span>Access platform</span>
              <FiArrowRight className="text-sm" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Manifesto Section */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h1 className="text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-300 mb-6">
            Hey! This is our manifesto.
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            The principles that guide everything we build at DegreeIntelligence.
          </p>
        </motion.div>

        {/* Commandments */}
        <div className="space-y-16">
          {commandments.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex gap-8 group"
            >
              <div className="flex flex-col items-center w-16 flex-shrink-0">
                <span className="text-2xl font-medium text-gray-500 group-hover:text-blue-300 transition-colors">
                  {item.number}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-3">
                  {item.title}
                </h2>
                <p className="text-lg text-gray-400">{item.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing Statement */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-32 border-t border-gray-800 pt-12"
        >
          <h3 className="text-3xl font-bold text-white mb-6">
            Why this matters
          </h3>
          <p className="text-lg text-gray-300 mb-8">
            Yale attracts some of the world's brightest minds, yet we force
            students to navigate degree requirements with tools that look like
            tech straight out of the early 2000s. This isn't just about
            convenience—it's about unlocking potential. When we remove
            bureaucratic friction, we free students to focus on what actually
            matters: learning, research, and building the future.
          </p>
          <p className="text-lg text-gray-300">
            This is our small contribution to that vision.
          </p>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-24 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <LogoIcon className="w-6 h-6 text-white" />
              <CompoundLogo hideLogo animated size="sm" />
            </div>
            <div className="text-sm text-gray-500">
              Not officially affiliated with Yale University
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
