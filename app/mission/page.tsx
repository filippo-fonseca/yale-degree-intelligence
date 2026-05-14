"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import LogoIcon from "@/icons/LogoIcon";
import { FiArrowLeft, FiArrowRight } from "react-icons/fi";
import CosmicBackground from "@/components/CosmicBackground/page";

export default function MissionPage() {
  const commandments = [
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 font-louize">
      <CosmicBackground mode="stars" opacity={0.7} />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-40 bg-gray-950/70 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_4px_24px_rgba(0,0,0,0.3)]"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-2 group">
            <LogoIcon width={24} height={24} />
            <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
              DegreeIntelligence
            </span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-white/[0.1] text-gray-300 hover:text-white transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]"
          >
            <FiArrowLeft size={12} />
            <span>Back to platform</span>
          </Link>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-full text-[10px] font-medium tracking-wide uppercase bg-gradient-to-r from-pink-500/15 via-purple-500/15 to-blue-500/15 border border-white/[0.08] text-gray-400 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
            <span className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
            Our Manifesto
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
            The principles that guide us.
          </h1>
          <p className="text-sm text-gray-400 max-w-xl mx-auto">
            Everything we build at DegreeIntelligence stems from these core
            beliefs.
          </p>
        </motion.div>

        {/* Commandments Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-12">
          {commandments.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.08 }}
              className="group p-4 rounded-xl bg-gradient-to-br from-white/[0.06] via-transparent to-black/10 backdrop-blur-sm border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)]"
            >
              <div className="flex items-start gap-3">
                <span className="text-xs font-medium text-gray-600 group-hover:text-purple-400 transition-colors pt-0.5">
                  {item.number}
                </span>
                <div className="flex-1">
                  <h2 className="text-sm font-medium text-white mb-1.5">
                    {item.title}
                  </h2>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing Statement */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="p-5 rounded-2xl bg-gradient-to-br from-gray-900/70 via-gray-900/50 to-gray-950/70 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_80px_rgba(139,92,246,0.06),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]"
        >
          <h3 className="text-lg font-medium text-white mb-3">
            Why this matters
          </h3>
          <p className="text-sm text-gray-300 mb-3 leading-relaxed">
            Yale attracts some of the world's brightest minds, yet we force
            students to navigate degree requirements with tools that look like
            tech from the early 2000s. This isn't just about convenience. We
            built this to remove bureaucratic friction so students can focus on
            what actually matters: learning, research, and building the future.
            Or whatever you want. It's up to you. {":)"}
          </p>
          <p className="text-sm text-gray-400 leading-relaxed">
            This manifesto is our way of holding ourselves accountable.
            DegreeIntelligence is our simple contribution to this vision.
          </p>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-center"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-gradient-to-r from-blue-500/25 via-purple-500/25 to-pink-500/25 hover:from-blue-500/35 hover:via-purple-500/35 hover:to-pink-500/35 text-white font-medium border border-white/[0.1] shadow-[0_4px_20px_rgba(139,92,246,0.2),inset_0_1px_0_rgba(255,255,255,0.15)] transition-all"
          >
            Get started with DegreeIntelligence
            <FiArrowRight size={14} className="opacity-70" />
          </Link>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] mt-12 py-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <LogoIcon width={18} height={18} />
              <span className="text-xs text-gray-500">DegreeIntelligence</span>
            </div>
            <p className="text-[10px] text-gray-600">
              Not affiliated with Yale University, Yale College, or DegreeAudit.
              A free, student-built project.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
