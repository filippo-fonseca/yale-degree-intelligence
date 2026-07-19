"use client";

import { motion } from "framer-motion";
import {
  FiChevronRight,
  FiAlertCircle,
  FiZap,
  FiTrendingUp,
  FiBarChart2,
  FiSearch,
  FiMail,
  FiGithub,
  FiExternalLink,
} from "react-icons/fi";
import { GraduationCap } from "lucide-react";
import { Card, CardHeader } from "./LandingPrimitives";
import { teamMembers } from "./landingMockData";

export function LandingBlueprintSection() {
  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_80px_rgba(139,92,246,0.08),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Our blueprint, broken down.
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            How we believe we transformed frustration into an elegant solution
            for academic planning and visualization at Yale.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Problem */}
          <Card fade>
            <CardHeader
              icon={<FiAlertCircle className="w-4 h-4" />}
              title="The Problem"
              color="red"
            />
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
              {[
                "Scattered requirements across PDFs and websites",
                "Manual tracking in error-prone spreadsheets",
                "No centralized view of progress",
                "Planning nightmares (esp. double majors)",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <FiChevronRight className="text-red-400 mt-1" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Solution */}
          <Card fade delay={0.1}>
            <CardHeader
              icon={<FiZap className="w-4 h-4" />}
              title="Our Solution"
              color="blue"
            />
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
              {[
                "Unified requirements database",
                "Real-time progress stats + visualization",
                "Intelligent course recommendations",
                "Clean, intuitive interface",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <FiChevronRight className="text-blue-400 mt-1" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Impact */}
          <Card fade>
            <CardHeader
              icon={<FiTrendingUp className="w-4 h-4" />}
              title="The Impact"
              color="green"
            />
            <ul className="space-y-2 text-gray-700 dark:text-gray-300 text-sm">
              {[
                "Hours saved on academic planning",
                "Reduced errors in requirement tracking",
                "Empowered students can make space for fun classes",
                "Democratized access to academic insights",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2">
                  <FiChevronRight className="text-green-400 mt-1" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

export function LandingMissionSection() {
  const features = [
    {
      title: "No more spreadsheet nightmares.",
      description:
        "We automated the tedious parts of academic planning so you don't have to maintain those fragile Google Sheets formulas.",
      icon: <FiBarChart2 className="w-5 h-5" />,
    },
    {
      title: "Major (and even concentration) reqs at a glance.",
      description:
        "See exactly what you've completed and what remains for your major—no more digging through PDF requirements or five different poorly organized websites 4 clicks deep.",
      icon: <FiSearch className="w-5 h-5" />,
    },
    {
      title: "Built by Yalies, for Yalies.",
      description:
        "Born from our own frustrations with double major planning. We're solving the problems we actually faced. Rather than gatekeeping, we decided to make it clean and publish it.",
      icon: <GraduationCap className="w-5 h-5" />,
    },
  ];

  return (
    <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="bg-white/70 dark:bg-transparent dark:bg-gradient-to-br dark:from-gray-900/70 dark:via-gray-900/50 dark:to-gray-950/70 backdrop-blur-2xl rounded-2xl p-6 border border-black/[0.06] dark:border-white/[0.08] shadow-[0_8px_48px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-white/[0.05]"
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            What it is and why we built this.
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Trying to plan our majors, we kept running into the same problem:
            Yale's requirements are complex, scattered across PDFs and
            websites, and nearly impossible to track manually. So we built the
            tool we wish we had. We sincerely hope it helps :)
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {features.map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.15] transition-all duration-300 hover:scale-[1.02] shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-sm hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-black/[0.04] via-transparent to-black/10 dark:from-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] text-blue-600 dark:text-blue-300 mb-3 w-fit shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                {feature.icon}
              </div>
              <h3 className="text-base font-medium text-blue-700 dark:text-blue-200 mb-1.5">
                {feature.title}
              </h3>
              <p className="text-gray-700 dark:text-gray-300 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export function LandingTeamSection() {
  return (
    <div
      id="team"
      className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 scroll-mt-20"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          It's nice to meet you!
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          We're just two Yale students who got tired of spreadsheet hell and
          decided to do something about it.
        </p>
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-4">
        {teamMembers.map((person, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.1 }}
            className="bg-gradient-to-br from-white/[0.08] via-transparent to-black/10 backdrop-blur-xl p-4 rounded-xl border border-white/[0.08] hover:border-white/[0.15] flex-1 max-w-sm hover:scale-[1.02] transition-all duration-300 shadow-[0_4px_24px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.12)]"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-[0_4px_16px_rgba(139,92,246,0.3)]">
                <img
                  src={person.photoRoute}
                  alt={person.name}
                  className="w-full h-full rounded-full object-cover border-2 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]"
                />
              </div>
              <div>
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  {person.name}
                </h3>
                <p className="text-xs text-blue-600 dark:text-blue-300">{person.role}</p>
              </div>
            </div>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">{person.bio}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`mailto:${person.contact}`}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/30 text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <FiMail size={12} /> Email
              </a>
              <a
                href={person.github}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/30 text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <FiGithub size={12} /> GitHub
              </a>
              {person.website && (
                <a
                  href={person.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-br from-black/[0.04] to-transparent dark:from-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:border-blue-400/50 dark:hover:border-blue-500/30 text-xs flex items-center gap-1.5 transition-all shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                >
                  <FiExternalLink size={12} /> Website
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function LandingCtaSection() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0.75 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="bg-gradient-to-br from-blue-900/30 via-purple-900/20 to-pink-900/30 backdrop-blur-2xl rounded-2xl p-6 border border-white/[0.1] shadow-[0_8px_48px_rgba(0,0,0,0.4),0_0_100px_rgba(139,92,246,0.1),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-purple-500/20 text-center"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
          Want to contribute?
        </h2>
        <p className="text-gray-700 dark:text-gray-300 text-sm max-w-xl mx-auto mb-4">
          This is a project by and for the Yale community. We'd love your
          feedback and bug reports! Reach out anytime. Also... if you wish you
          join the team, we're always looking for fellow Yale students to
          join.
        </p>
        <div className="flex justify-center">
          <a
            href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
            className="px-4 py-2 text-sm bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-pink-500/30 hover:from-blue-500/40 hover:via-purple-500/40 hover:to-pink-500/40 rounded-xl text-white flex items-center gap-2 transition-all hover:scale-105 border border-white/[0.1] shadow-[0_4px_16px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]"
          >
            <FiMail size={14} /> Email Us
          </a>
        </div>
      </motion.div>
    </div>
  );
}
