"use client";

import { motion } from "framer-motion";
import {
  FiArrowRight,
  FiGithub,
  FiMail,
  FiExternalLink,
  FiChevronRight,
  FiUsers,
  FiSearch,
  FiSave,
  FiShare2,
  FiPlayCircle,
} from "react-icons/fi";
import LogoIcon from "@/icons/LogoIcon";
import CompoundLogo from "@/components/ui/CompoundLogo";
import Link from "next/link";
import { useState, useRef } from "react";
import LoginPage from "@/components/LoginPage";

export default function AboutPage() {
  const [logInFlow, setLogInFlow] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const features = [
    {
      title: "No more spreadsheet nightmares.",
      description:
        "We automated the tedious parts of academic planning so you don't have to maintain those fragile Google Sheets formulas.",
      emoji: "📊",
    },
    {
      title: "Major (and even concentration) reqs at a glance.",
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

  if (logInFlow) return <LoginPage onBackClick={() => setLogInFlow(false)} />;

  return (
    <div className="min-h-screen pt-2 bg-gradient-to-br from-gray-950 via-gray-900 to-gray-900 font-louize">
      {/* Welcome Banner */}
      <div className="relative mb-12 z-50 bg-gradient-to-r from-emerald-900/30 via-blue-900/30 to-purple-900/30 backdrop-blur-sm border-b border-emerald-800/30 shadow-[0_4px_20px_rgba(0,0,0,0.25)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-center gap-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-emerald-900/50 border border-emerald-800/40 text-emerald-300 shadow-sm">
            🎉 Class of 2029
          </span>
          <p className="text-sm text-emerald-100">
            Welcome to Yale! Start your journey with{" "}
            <span className="text-blue-300 font-medium">
              DegreeIntelligence
            </span>{" "}
            and have peace of mind from day one.
          </p>
        </div>
      </div>

      {/* Access Platform Button - Top Right */}
      <motion.div
        initial={{ opacity: 1, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="fixed top-6 right-6 z-50"
      >
        <motion.button
          className="flex items-center gap-2 px-4 py-2 border border-blue-500 bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-md rounded-lg text-white font-medium transition-all shadow-sm hover:shadow-md"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setLogInFlow(true)}
        >
          <span>Log in with CAS</span>
          <FiArrowRight className="opacity-80" />
        </motion.button>
      </motion.div>

      {/* Hero Section */}
      <div className="relative pt-24 sm:pt-28">
        {/* increased top padding to fix logo spacing */}
        <div className="max-w-7xl mx-auto px-4 pb-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 1, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center"
          >
            <div className="flex justify-center mb-8">
              {/* more space under logo */}
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
            {/* Welcome Badge */}
            <div className="mb-4 flex justify-center">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-blue-500/20 border border-pink-500/30 text-pink-200 shadow-lg backdrop-blur-sm">
                <span>💙</span> We’re so glad you’re here. We think you’ll love
                this.
              </span>
            </div>

            <h2 className="text-4xl font-bold text-white mb-6">
              Your Yale Degree,{" "}
              <span className="text-blue-300">made easy.</span>
            </h2>

            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Democratizing academic planning at Yale—one major at a time. For
              Yalies, by Yalies.
            </p>

            <motion.div className="flex flex-wrap justify-center gap-4">
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
              <Link href="#simulator">
                <motion.button
                  className="px-6 py-3 border border-cyan-500 bg-cyan-500/30 hover:bg-cyan-500/40 backdrop-blur-md rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Our features
                  <FiPlayCircle className="opacity-80" />
                </motion.button>
              </Link>
              <motion.button
                className="px-6 py-3 border border-blue-500 bg-blue-500/30 hover:bg-blue-500/40 backdrop-blur-md rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setLogInFlow(true)}
              >
                Access Platform
                <FiArrowRight className="opacity-80" />
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* subtle splash gradient */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-10 -translate-x-1/2 h-72 w-[36rem] rounded-full bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl" />
        </div>
      </div>

      {/* Blueprint Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-800/50 shadow-xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200 mb-4">
              Our blueprint, broken down.
            </h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              How we believe we transformed frustration into an elegant solution
              for academic planning and visualization at Yale.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Problem */}
            <Card fade>
              <CardHeader
                icon={<span className="text-red-400 text-xl">❗</span>}
                title="The Problem"
                color="red"
              />
              <ul className="space-y-3 text-gray-300">
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
                icon={<span className="text-blue-400 text-xl">💡</span>}
                title="Our Solution"
                color="blue"
              />
              <ul className="space-y-3 text-gray-300">
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
                icon={<span className="text-green-400 text-xl">🚀</span>}
                title="The Impact"
                color="green"
              />
              <ul className="space-y-3 text-gray-300">
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

      {/* NEW: Simulator Section */}
      <section
        id="simulator"
        className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12"
      >
        <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 border border-cyan-700/30 shadow-xl overflow-hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-600/10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 h-72 w-72 rounded-full bg-purple-600/10 blur-3xl" />

          <div className="flex flex-col lg:flex-row gap-10 items-center">
            {/* Left: copy + bullets */}
            <div className="flex-1 min-w-0">
              <h3 className="text-3xl font-bold text-white mb-3">
                Simulator — drag, drop, done.
              </h3>
              <p className="text-gray-300 mb-6 max-w-xl">
                Build a semester-by-semester plan by dragging courses from your
                major (or search <em>every</em> course at Yale). Save multiple
                plans, load them later, and see how fun classes and
                distributional requirements fit without breaking anything.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  {
                    icon: <FiSearch />,
                    text: "Search the full catalog + your major",
                  },
                  {
                    icon: <FiSave />,
                    text: "Save and duplicate plans instantly",
                  },
                  { icon: <FiShare2 />, text: "Share with friends / mentors" },
                  {
                    icon: <FiUsers />,
                    text: "See where friends slotted courses",
                  },
                ].map((b) => (
                  <div
                    key={b.text}
                    className="flex items-center gap-2 text-gray-200 bg-gray-800/60 border border-gray-700/60 rounded-lg px-3 py-2"
                  >
                    <span className="shrink-0 text-cyan-300">{b.icon}</span>
                    <span className="text-sm">{b.text}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  className="px-4 py-2 rounded-lg bg-cyan-600/70 hover:bg-cyan-600 text-white border border-cyan-400/40 shadow"
                  onClick={() => setLogInFlow(true)}
                >
                  Try Simulator
                </button>
                <Link href="/demo#simulator">
                  <button className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white border border-gray-600/60">
                    Watch Demo
                  </button>
                </Link>
              </div>
            </div>

            {/* Right: GIF/video placeholder */}
            <div className="flex-1 w-full px-6">
              <div className="relative rounded-xl border-2 border-pink-500 bg-black/40 overflow-hidden shadow-2xl">
                <img
                  src="/demo/simulator.gif"
                  alt="Simulator demo"
                  className="w-[80%] h-[80%] object-cover aspect-video"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* NEW: Public Profiles & Friends */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900/70 backdrop-blur-lg rounded-2xl p-8 border border-gray-800/50 shadow-xl">
          <div className="text-center mb-10 flex flex-col gap-2">
            <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
              Public Profile & Friends
            </h2>
            <p className="text-gray-300 max-w-3xl mx-auto">
              Add a friend and mutually see each other's profiles and{" "}
              <em>trajectory</em>. Learn from upperclassmen who've done what
              you're trying to do and organize yourself smarter.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mt-8">
            {/* Profile card mock */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="rounded-xl border border-purple-500/30 bg-gray-800/50 p-6"
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600" />
                <div>
                  <p className="text-white font-medium">This could be you</p>
                  <p className="text-sm text-purple-200">CPSC & ECE '27</p>
                </div>
              </div>
              <ul className="text-gray-300 text-sm space-y-2">
                <li>
                  • Took <span className="text-white">CPSC 223</span> in Spring
                  '25 → recommends pairing with{" "}
                  <span className="text-white">MATH 244</span>.
                </li>
                <li>
                  • Planning <span className="text-white">CPSC 3230</span> +{" "}
                  <span className="text-white">ECE 310</span> next Fall.
                </li>
                <li>• Shares schedule blocks and notes with friends.</li>
              </ul>
            </motion.div>

            {/* Trajectory mini-visual */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-xl border border-blue-500/30 bg-gray-800/50 p-6"
            >
              <p className="text-gray-200 mb-3 font-medium">
                Trajectory preview for in-major classes
              </p>
              <div className="grid grid-cols-4 gap-3 text-xs">
                {["Fall '24", "Spring '25", "Fall '25", "Spring '26"].map(
                  (term, i) => (
                    <div
                      key={term}
                      className="rounded-lg border border-gray-700/60 p-2 bg-gray-900/60"
                    >
                      <p className="text-gray-400 mb-1">{term}</p>
                      <ul className="space-y-1">
                        {[
                          "CPSC 201",
                          i % 2 === 0 ? "CPSC 223" : "MATH 244",
                          i % 3 === 0 ? "ECE 200" : "ENAS 130",
                        ].map((c) => (
                          <li key={c} className="truncate text-gray-200">
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )
                )}
              </div>
              <div className="mt-4 text-right">
                <button
                  className="inline-flex items-center gap-2 text-cyan-300 hover:text-cyan-200 text-sm"
                  onClick={() => setLogInFlow(true)}
                >
                  Explore friends <FiUsers />
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
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
              tool we wish we had. We sincerely hope it helps :)
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 1, y: 20 }}
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
              bio: "Joined forces to continue scaling the platform and make it more robust.",
              contact: "emir.ahmed@yale.edu",
              photoRoute: "/team/emir.JPG",
              github: "https://github.com/EmirataG",
              website: "",
            },
          ].map((person, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 1, y: 20 }}
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
                {person.website && (
                  <a
                    href={person.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-2"
                  >
                    <FiExternalLink /> Website
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
      {/* Wait... Are You Trying to Replace CourseTable? */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-gray-900/80 backdrop-blur-lg rounded-2xl p-8 border border-gray-800/50 shadow-xl">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
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
              — one that CourseTable doesn’t aim to cover by design, as we are
              different products entirely. We’re here for:
            </p>
            <ul className="list-disc list-inside space-y-1 text-gray-400">
              <li>
                Visualizing your grades and stats in beautiful, digestible ways
              </li>
              <li>Planning out your progress toward your degree</li>
              <li>Getting real-time analysis from our suggestion models</li>
              <li>Seeing what upperclassmen have done in previous years</li>
              <li>
                Exploring different majors and mapping out “what if” scenarios
              </li>
            </ul>
            <p>
              That’s <strong>not</strong> what CourseTable does — and that’s the
              point. They help you <em>choose</em> courses, see course reviews,
              and see friend's worksheets. We don't (and never will) do that. We
              instead help you <em>make sense of the journey</em> and
              democratize the complex planning process at Yale with regard to,
              in particular, your major.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0.75 }}
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
          Made with 💙 | Not officially affiliated with Yale University. We make
          no money from this and this is NOT a business or job for any of us.
        </p>
        <p className="mt-2">
          v0.0.1 - © {new Date().getFullYear()} Yale DegreeIntelligence
        </p>
      </div>

      {/* Shared components */}
      <style jsx global>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}

function Card({
  children,
  fade,
  delay = 0,
}: {
  children: React.ReactNode;
  fade?: boolean;
  delay?: number;
}) {
  if (!fade)
    return (
      <div className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-all">
        {children}
      </div>
    );
  return (
    <motion.div
      initial={{ opacity: 1, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay }}
      className="bg-gray-800/50 p-6 rounded-xl border border-gray-700/50 hover:border-blue-500/30 transition-all"
    >
      {children}
    </motion.div>
  );
}

function CardHeader({
  icon,
  title,
  color = "blue",
}: {
  icon: React.ReactNode;
  title: string;
  color?: "red" | "blue" | "green";
}) {
  const colorMap: Record<string, string> = {
    red: "text-red-400 bg-red-500/20",
    blue: "text-blue-400 bg-blue-500/20",
    green: "text-green-400 bg-green-500/20",
  };
  return (
    <div className="flex items-center gap-3 mb-4">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-medium text-white">{title}</h3>
    </div>
  );
}
