"use client";

import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiGithub,
  FiMail,
  FiUsers,
  FiExternalLink,
} from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";
import CompoundLogo from "@/components/ui/CompoundLogo";
import Link from "next/link";

export default function AboutPage() {
  const features = [
    {
      title: "No more spreadsheet nightmares.",
      description:
        "We automated the tedious parts of academic planning so you don't have to maintain those fragile Google Sheets formulas.",
      emoji: "📊",
    },
    {
      title: "Major requirements at a glance.",
      description:
        "See exactly what you've completed and what remains for your major—no more digging through PDF requirements or five different poorly organized websites 4 clicks deep.",
      emoji: "🔍",
    },
    {
      title: "Built by Yalies, for Yalies.",
      description:
        "Born from our own frustrations with double major planning. We're solving the problems we actually faced. Rather than gatekeeping, we decided to make it clean and publish it.",
      emoji: "🎓",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/80 to-purple-900 font-louize">
      {/* Access Platform Button - Top Right */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-6 right-6 z-50"
      >
        <Link href="/" target="_blank">
          <motion.button
            className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-md rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
          >
            <span>Log in with CAS</span>
            <FiArrowRight className="opacity-80" />
          </motion.button>
        </Link>
      </motion.div>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 pt-20 pb-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-6">
              <div className="relative w-24 h-24">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-400/30 border-r-purple-400/30"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <LogoIcon width={48} height={48} />
                </div>
              </div>
            </div>

            <h1 className="flex items-center justify-center text-5xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-300 mb-4">
              <CompoundLogo hideLogo animated size="lg" />
            </h1>

            <h2 className="text-4xl font-bold text-white mb-6">
              Your Yale Degree,{" "}
              <span className="text-blue-300">made easy.</span>
            </h2>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Democratizing academic planning at Yale—one major at a time.
            </p>

            <motion.div className="flex justify-center gap-4">
              <Link href="/demo">
                <motion.button
                  className="px-6 py-3 border border-pink-500 bg-pink-500/30 hover:bg-pink-500/40 backdrop-blur-md rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  View Demo
                  <FiArrowRight className="opacity-80" />
                </motion.button>
              </Link>
              <Link href="/" target="_blank">
                <motion.button
                  className="px-6 py-3 border border-blue-500 bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-md rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Access Platform
                  <FiArrowRight className="opacity-80" />
                </motion.button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </div>

      {/* Rest of the code remains exactly the same */}
      {/* Mission Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gray-900/70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800/50 shadow-xl"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-4">
              What it is and why we built this.
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Trying to plan our majors, we kept running into the same problem:
              Yale's requirements are complex, scattered across PDFs and
              websites, and nearly impossible to track manually. So we built the
              tool we wish we had. We sincerely hope it helps {":)"}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
                className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-all hover:scale-[1.02]"
              >
                <div className="text-3xl mb-4">{feature.emoji}</div>
                <h3 className="text-xl font-medium text-blue-200 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-300">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Team Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-4">
            It's nice to meet you!
          </h2>
          <p className="text-lg text-gray-300 max-w-3xl mx-auto">
            We're just two Yale students who got tired of spreadsheet hell and
            decided to do something about it.
          </p>
        </div>

        <div className="flex flex-col md:flex-row justify-center gap-8">
          {[
            {
              name: "Filippo Fonseca",
              role: "Mechanical Engineering (ABET) & EECS '28",
              bio: "Built the first version as a shell script after one too many long sessions trying to plan courses.",
              contact: "filippo.fonseca@yale.edu",
              photoRoute: "/team/filippo.jpeg",
              github: "https://github.com/filippo-fonseca",
              website: "https://filippofonseca.com",
            },
            {
              name: "Emir Ahmed",
              role: "Computer Science & Applied Math '28",
              bio: "Joined forces to turn a hacky solution into something all Yalies could use.",
              contact: "emir.ahmed@yale.edu",
              photoRoute: "/team/emir.JPG",
              github: "https://github.com/EmirkataG",
              website: "",
            },
          ].map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-gray-900/70 backdrop-blur-sm p-6 rounded-xl border border-gray-800/50 flex-1 max-w-md hover:scale-[1.02] transition-transform"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <img
                    src={person.photoRoute}
                    alt={person.name}
                    className="w-full h-full rounded-full object-cover border-2 border-pink-500"
                  />
                </div>
                <div>
                  <h3 className="text-xl font-medium text-white">
                    {person.name}
                  </h3>
                  <p className="text-sm text-blue-300">{person.role}</p>
                </div>
              </div>
              <p className="text-gray-300 mb-4">{person.bio}</p>
              <div className="flex flex-wrap gap-3">
                <a
                  href={`mailto:${person.contact}`}
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                >
                  <FiMail /> Email
                </a>
                <a
                  href={person.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                >
                  <FiGithub /> GitHub
                </a>
                <a
                  href={person.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                >
                  <FiExternalLink /> Website
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 rounded-2xl p-8 border border-blue-700/30 text-center"
        >
          <h2 className="text-2xl font-bold text-white mb-4">
            Want to contribute?
          </h2>
          <p className="text-gray-300 max-w-2xl mx-auto mb-6">
            This is a project by and for the Yale community. We'd love your
            feedback and bug reports! Reach out anytime. Also... if you wish you
            join the team, we're always looking for fellow Yale students to
            join.
          </p>
          <div className="flex justify-center gap-4">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white flex items-center gap-2 transition-colors hover:scale-105"
            >
              <FiGithub /> GitHub
            </a>
            <a
              href="mailto:filippo.fonseca@yale.edu,emir.ahmed@yale.edu"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 rounded-lg text-white flex items-center gap-2 transition-all hover:scale-105"
            >
              <FiMail /> Email Us
            </a>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="py-8 text-center text-gray-400 text-sm">
        <p>
          Made with 💙 in New Haven | Not officially affiliated with Yale
          University
        </p>
        <p className="mt-2">
          v0.0.1 - © {new Date().getFullYear()} Yale DegreeIntelligence
        </p>
      </div>
    </div>
  );
}
