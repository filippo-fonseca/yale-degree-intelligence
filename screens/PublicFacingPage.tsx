"use client";

import {
  motion,
  useInView,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  AnimatePresence,
} from "framer-motion";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiGithub,
  FiPlay,
  FiSearch,
  FiUsers,
  FiZap,
  FiTrendingUp,
  FiBarChart2,
  FiX,
  FiCheck,
  FiLayers,
} from "react-icons/fi";
import { HiSparkles } from "react-icons/hi2";
import { GraduationCap } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import LogoIcon from "@/icons/LogoIcon";

// avoid SSR issues with charts (used in the stats section)
const LineChart = dynamic(
  () => import("@mui/x-charts/LineChart").then((m) => m.LineChart),
  { ssr: false },
);
const PieChartWrapper = dynamic(
  () => import("@/components/ui/PieChartWrapper"),
  { ssr: false },
);

const YOUTUBE_ID = "5H1kjMWQfgs";
const YDN_URL =
  "https://yaledailynews.com/blog/2025/09/23/new-student-run-platform-aims-to-simplify-degree-planning/";

/* ----------------------------------------------------------- */
/* Small primitives                                            */
/* ----------------------------------------------------------- */

function CountUp({
  to,
  inView,
  decimals = 0,
  duration = 1.1,
}: {
  to: number;
  inView: boolean;
  decimals?: number;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const sp = useSpring(mv, { stiffness: 90, damping: 22, duration });
  const rounded = useTransform(sp, (v) => v.toFixed(decimals));
  if (inView) mv.set(to);
  return <motion.span>{rounded as any}</motion.span>;
}

function Reveal({
  children,
  delay = 0,
  y = 26,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.7, delay, ease: [0.21, 0.6, 0.2, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  sub,
  badge,
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  badge?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <Reveal>
        <div className="mb-5 flex items-center justify-center gap-2">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-pink-500/60" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pink-300/80">
            {eyebrow}
          </span>
          {badge && (
            <span className="rounded-full border border-pink-400/30 bg-pink-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-pink-200">
              {badge}
            </span>
          )}
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-pink-500/60" />
        </div>
      </Reveal>
      <Reveal delay={0.05}>
        <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.1}>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base leading-relaxed text-white/55 sm:text-lg">
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  );
}

/* ----------------------------------------------------------- */
/* Hero background: parallax pink/magenta light shards         */
/* ----------------------------------------------------------- */

function HeroShards() {
  const { scrollY } = useScroll();
  const y1 = useTransform(scrollY, [0, 800], [0, 160]);
  const y2 = useTransform(scrollY, [0, 800], [0, 70]);
  const opacity = useTransform(scrollY, [0, 600], [1, 0.25]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <motion.div
        style={{ y: y1, opacity }}
        className="rc-bloom rc-drift absolute left-1/2 top-[-12%] h-[70vh] w-[120%] -translate-x-1/2"
      />
      <motion.div
        style={{ y: y2, opacity }}
        className="rc-shards-beams absolute left-1/2 top-[-20%] h-[90vh] w-[140%] -translate-x-1/2"
      />
      {/* vignette + fade into the page */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,transparent_30%,#08080a_82%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-b from-transparent to-[#08080a]" />
    </div>
  );
}

/* ----------------------------------------------------------- */
/* Browser-chrome window wrapper                               */
/* ----------------------------------------------------------- */

function BrowserChrome({
  url = "degreeintelligence.app",
  children,
  className = "",
}: {
  url?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0f] ${className}`}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="mx-auto flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400/80" />
          {url}
        </div>
      </div>
      {children}
    </div>
  );
}

/* Hero product window with subtle mouse-tilt */
function ProductWindow() {
  const ref = useRef<HTMLDivElement | null>(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 120, damping: 18 });
  const sry = useSpring(ry, { stiffness: 120, damping: 18 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    ry.set(px * 10);
    rx.set(-py * 8);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 1200 }}
      initial={{ opacity: 0, y: 60, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 1, delay: 0.3, ease: [0.21, 0.6, 0.2, 1] }}
      className="rc-window relative mx-auto max-w-5xl rounded-2xl"
    >
      <BrowserChrome url="degreeintelligence.app/dashboard">
        <img
          src="/demo/simulator.gif"
          alt="DegreeIntelligence semester simulator in action"
          className="block w-full"
        />
      </BrowserChrome>
      {/* reflection */}
      <div className="pointer-events-none absolute -bottom-24 left-1/2 h-32 w-[80%] -translate-x-1/2 rounded-[50%] bg-pink-500/20 blur-3xl" />
    </motion.div>
  );
}

/* ----------------------------------------------------------- */
/* Navbar                                                      */
/* ----------------------------------------------------------- */

const NAV_LINKS = [
  { label: "Features", href: "#features" },
  { label: "How it works", href: "#how" },
  { label: "Numbers", href: "#numbers" },
  { label: "Team", href: "#team" },
];

function Navbar({ onLogin }: { onLogin: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-white/[0.07] bg-[#08080a]/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="#top" className="flex items-center gap-2">
          <LogoIcon width={24} height={24} />
          <span className="text-sm font-semibold tracking-tight text-white">
            DegreeIntelligence
          </span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-white/55 transition-colors hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLogin}
            className="hidden rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:text-white sm:block"
          >
            Log in
          </button>
          <button
            onClick={onLogin}
            className="group flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-1.5 text-sm font-medium text-black transition-all hover:bg-pink-50"
          >
            Get started
            <FiArrowRight
              size={14}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </button>
        </div>
      </div>
    </motion.nav>
  );
}

/* ----------------------------------------------------------- */
/* Page                                                         */
/* ----------------------------------------------------------- */

export default function PublicFacingPage() {
  const [logInFlow, setLogInFlow] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowVideo(false);
    };
    if (showVideo) {
      document.addEventListener("keydown", onEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [showVideo]);

  const login = () => setLogInFlow(true);

  if (logInFlow) return <LoginPage onBackClick={() => setLogInFlow(false)} />;

  return (
    <div
      id="top"
      className="min-h-screen overflow-x-hidden bg-[#08080a] font-sf text-white antialiased"
    >
      <Navbar onLogin={login} />

      {/* ================= HERO ================= */}
      <header className="relative isolate px-4 pb-24 pt-36 sm:px-6 sm:pt-44">
        <HeroShards />

        <div className="relative mx-auto max-w-4xl text-center">
          <motion.a
            href={YDN_URL}
            target="_blank"
            rel="noreferrer"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="group mb-7 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/70 backdrop-blur-md transition-colors hover:border-pink-400/40 hover:text-white"
          >
            <span className="flex items-center gap-1 rounded-full bg-pink-500/15 px-2 py-0.5 font-semibold text-pink-200">
              <HiSparkles size={11} /> New
            </span>
            Featured in the Yale Daily News
            <FiArrowUpRight
              size={13}
              className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.21, 0.6, 0.2, 1] }}
            className="text-balance text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl"
          >
            The shortcut to your
            <br />
            <span className="rc-gradient-text">Yale degree.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.12 }}
            className="mx-auto mt-6 max-w-xl text-pretty text-lg leading-relaxed text-white/60"
          >
            Every requirement, every major, every plan in one fast, beautiful
            place. Stop fighting spreadsheets and PDFs. Built by Yalies, for
            Yalies.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.22 }}
            className="mt-9 flex flex-wrap items-center justify-center gap-3"
          >
            <button
              onClick={login}
              className="group flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black shadow-[0_8px_30px_-8px_rgba(255,255,255,0.4)] transition-all hover:scale-[1.03]"
            >
              <GraduationCap size={16} /> Log in with Yale CAS
              <FiArrowRight
                size={15}
                className="transition-transform group-hover:translate-x-0.5"
              />
            </button>
            <button
              onClick={() => setShowVideo(true)}
              className="group flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 backdrop-blur-md transition-all hover:border-white/25 hover:bg-white/[0.07]"
            >
              <FiPlay size={14} className="text-pink-300" /> Watch the v2 launch
            </button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-5 text-xs text-white/35"
          >
            Free, always &nbsp;·&nbsp; Sign in with Yale CAS &nbsp;·&nbsp; v2
            launched Feb 2026
          </motion.p>
        </div>

        {/* product window */}
        <div className="relative mt-16 sm:mt-20">
          <ProductWindow />
        </div>
      </header>

      {/* ================= PRESS STRIP ================= */}
      <section className="relative border-y border-white/[0.06] py-10">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <p className="text-xs uppercase tracking-[0.25em] text-white/30">
            Trusted by Yale undergraduates across every residential college
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-sm font-medium text-white/45">
            <span className="text-base font-semibold text-white/70">
              1 in 6 undergrads
            </span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span>Yale Daily News</span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span>14 residential colleges</span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span>Every major &amp; concentration</span>
          </div>
        </div>
      </section>

      {/* SECTIONS INSERTED BELOW IN SUBSEQUENT COMMITS */}

      {/* ================= FOOTER (placeholder, rebuilt later) ================= */}
      <footer className="border-t border-white/[0.06] py-10 text-center text-xs text-white/35">
        Not affiliated with Yale University.
      </footer>

      {/* ================= VIDEO MODAL ================= */}
      <AnimatePresence>
        {showVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowVideo(false)}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-4xl"
            >
              <button
                onClick={() => setShowVideo(false)}
                className="absolute -top-10 right-0 flex items-center gap-1 text-sm text-white/70 hover:text-white"
              >
                Close <FiX size={16} />
              </button>
              <BrowserChrome url="v2-launch.mp4" className="rc-window">
                <div className="aspect-video">
                  <iframe
                    src={`https://www.youtube.com/embed/${YOUTUBE_ID}?autoplay=1`}
                    title="DegreeIntelligence v2 launch"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="h-full w-full"
                  />
                </div>
              </BrowserChrome>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
