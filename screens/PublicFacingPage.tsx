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
import { GraduationCap, Command, Sun, Moon } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, useRef, useEffect } from "react";
import LoginPage from "@/components/LoginPage";
import LogoIcon from "@/icons/LogoIcon";
import CompoundLogo from "@/components/ui/CompoundLogo";

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
/* Bento feature card + tints                                  */
/* ----------------------------------------------------------- */

type Tint = "pink" | "purple" | "blue" | "violet" | "rose" | "indigo";

const TINTS: Record<
  Tint,
  { grad: string; chip: string; text: string; glow: string }
> = {
  pink: {
    grad: "from-pink-500/[0.12]",
    chip: "bg-pink-500/15 text-pink-300 ring-pink-400/30",
    text: "text-pink-300",
    glow: "bg-pink-500/20",
  },
  purple: {
    grad: "from-purple-500/[0.12]",
    chip: "bg-purple-500/15 text-purple-300 ring-purple-400/30",
    text: "text-purple-300",
    glow: "bg-purple-500/20",
  },
  blue: {
    grad: "from-blue-500/[0.12]",
    chip: "bg-blue-500/15 text-blue-300 ring-blue-400/30",
    text: "text-blue-300",
    glow: "bg-blue-500/20",
  },
  violet: {
    grad: "from-violet-500/[0.12]",
    chip: "bg-violet-500/15 text-violet-300 ring-violet-400/30",
    text: "text-violet-300",
    glow: "bg-violet-500/20",
  },
  rose: {
    grad: "from-rose-500/[0.12]",
    chip: "bg-rose-500/15 text-rose-300 ring-rose-400/30",
    text: "text-rose-300",
    glow: "bg-rose-500/20",
  },
  indigo: {
    grad: "from-indigo-500/[0.12]",
    chip: "bg-indigo-500/15 text-indigo-300 ring-indigo-400/30",
    text: "text-indigo-300",
    glow: "bg-indigo-500/20",
  },
};

function FeatureCard({
  tint,
  icon,
  title,
  desc,
  badge,
  children,
  className = "",
}: {
  tint: Tint;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const t = TINTS[tint];
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, ease: [0.21, 0.6, 0.2, 1] }}
      className={`rc-card-hover group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br ${t.grad} via-white/[0.02] to-transparent p-5 ${className}`}
    >
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full ${t.glow} opacity-40 blur-3xl transition-opacity group-hover:opacity-70`}
      />
      <div className="relative mb-4 flex items-start justify-between">
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ring-1 ${t.chip}`}
        >
          {icon}
        </span>
        <FiArrowUpRight className="text-white/25 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white/60" />
      </div>
      <div className="relative mb-1 flex items-center gap-2">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {badge && (
          <span className="rounded-full border border-pink-400/30 bg-pink-500/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pink-200">
            {badge}
          </span>
        )}
      </div>
      <p className="relative mb-4 text-sm leading-relaxed text-white/50">
        {desc}
      </p>
      {children && <div className="relative mt-auto">{children}</div>}
    </motion.div>
  );
}

/* --- Mini live-UI mocks --- */

function HeatGrid() {
  const cells = [
    2, 3, 1, 3, 2, 0, 3, 2, 3, 1, 2, 3, 1, 2, 3, 3, 0, 2, 3, 1, 2, 3, 2, 1,
  ];
  const tones = [
    "bg-white/5",
    "bg-purple-500/25",
    "bg-purple-500/50",
    "bg-purple-400/80",
  ];
  return (
    <div className="grid grid-cols-8 gap-1.5">
      {cells.map((c, i) => (
        <div key={i} className={`aspect-square rounded-[4px] ${tones[c]}`} />
      ))}
    </div>
  );
}

function ReqChecklist() {
  const rows = [
    { label: "Intro sequence", pct: 100, done: true },
    { label: "Core electives", pct: 66, done: false },
    { label: "Senior project", pct: 20, done: false },
  ];
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2.5">
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] ${
              r.done
                ? "bg-pink-500 text-white"
                : "border border-white/15 text-transparent"
            }`}
          >
            <FiCheck />
          </span>
          <span className="w-24 shrink-0 truncate text-[11px] text-white/55">
            {r.label}
          </span>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-500 to-purple-500"
              style={{ width: `${r.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SuggestionChips() {
  const chips = ["CPSC 223", "ECON 121", "ENGL 114", "MATH 230", "S&DS 230"];
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span
          key={c}
          className={`rounded-lg border px-2.5 py-1 text-[11px] ${
            i === 0
              ? "border-violet-400/40 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-white/[0.03] text-white/55"
          }`}
        >
          {i === 0 && <HiSparkles className="mr-1 inline" size={10} />}
          {c}
        </span>
      ))}
    </div>
  );
}

function FriendsRows() {
  const friends = ["EM", "FF", "AK", "JD"];
  return (
    <div className="space-y-2">
      <div className="flex -space-x-2">
        {friends.map((f, i) => (
          <span
            key={f}
            className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#0c0c0f] bg-gradient-to-br from-rose-500/60 to-pink-500/60 text-[9px] font-semibold text-white"
            style={{ zIndex: friends.length - i }}
          >
            {f}
          </span>
        ))}
        <span className="flex h-7 items-center rounded-full bg-white/[0.04] px-2 text-[10px] text-white/45">
          +312 in your major
        </span>
      </div>
      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[11px] text-white/55">
        <span className="text-rose-300">Emir</span> took{" "}
        <span className="text-white/75">CPSC 323</span> in Fall &apos;25
      </div>
    </div>
  );
}

function DoubleMajorMock() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {["EECS", "Mech. Eng."].map((m, i) => (
        <div
          key={m}
          className="rounded-lg border border-white/[0.07] bg-white/[0.02] p-2.5"
        >
          <p className="mb-2 text-[11px] font-medium text-white/70">{m}</p>
          <div className="space-y-1.5">
            {[80, 55, 30].map((w, j) => (
              <div
                key={j}
                className="h-1.5 overflow-hidden rounded-full bg-white/5"
              >
                <div
                  className={`h-full rounded-full ${
                    i === 0
                      ? "bg-indigo-400/70"
                      : "bg-gradient-to-r from-indigo-400/70 to-pink-400/70"
                  }`}
                  style={{ width: `${w}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-1.5 rounded-lg border border-pink-400/20 bg-pink-500/10 px-2.5 py-1.5 text-[10px] text-pink-200">
        <FiCheck size={11} /> 3 courses count for both majors
      </div>
    </div>
  );
}

function StatsMini() {
  const bars = [60, 72, 68, 80, 76, 88];
  return (
    <div className="flex items-end gap-4">
      <div>
        <p className="text-3xl font-semibold text-white">3.88</p>
        <p className="text-[11px] text-white/45">cumulative GPA</p>
      </div>
      <div className="flex h-14 flex-1 items-end gap-1.5">
        {bars.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-pink-500/30 to-pink-400/80"
            style={{ height: `${b}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------- */
/* Glowing keyboard graphic (closing CTA)                      */
/* ----------------------------------------------------------- */

function KeyboardGraphic() {
  const rows = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"],
  ];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.8 }}
      className="mx-auto flex max-w-xl flex-col items-center gap-1.5 [mask-image:radial-gradient(80%_120%_at_50%_30%,#000,transparent)]"
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex gap-1.5">
          {row.map((k) => (
            <span
              key={k}
              className="rc-key flex h-11 w-11 items-center justify-center rounded-lg text-sm font-medium text-white/40"
            >
              {k}
            </span>
          ))}
        </div>
      ))}
      <div className="mt-0.5 flex gap-1.5">
        <span className="rc-key flex h-11 w-16 items-center justify-center rounded-lg text-xs text-white/40">
          ⌃
        </span>
        <span className="rc-key flex h-11 w-16 items-center justify-center rounded-lg text-xs text-white/40">
          ⌥
        </span>
        <span className="rc-key-lit flex h-11 w-44 items-center justify-center gap-2 rounded-lg text-sm font-semibold">
          <Command size={15} /> K
        </span>
        <span className="rc-key flex h-11 w-16 items-center justify-center rounded-lg text-xs text-white/40">
          ⌥
        </span>
        <span className="rc-key flex h-11 w-16 items-center justify-center rounded-lg text-xs text-white/40">
          ⌃
        </span>
      </div>
    </motion.div>
  );
}

/* ----------------------------------------------------------- */
/* Numbers / stats section                                     */
/* ----------------------------------------------------------- */

function NumbersSection() {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });

  const stats = [
    { to: 16.7, dec: 1, suffix: "%", label: "of Yale undergrads on board" },
    { to: 1000, dec: 0, suffix: "s", label: "of hours saved planning" },
    { to: 60, dec: 0, suffix: "+", label: "majors & concentrations tracked" },
    { to: 0, dec: 0, prefix: "$", label: "to use. Free, always." },
  ];

  const gpa = [3.79, 3.71, 3.8, 3.88];
  const sems = ["Fall 23", "Spring 24", "Fall 24", "Spring 25"];
  const min = 3.6;
  const max = 3.95;
  const pts = gpa.map((g, i) => {
    const x = (i / (gpa.length - 1)) * 100;
    const y = 100 - ((g - min) / (max - min)) * 100;
    return [x, y] as const;
  });
  const line = pts.map((p) => `${p[0]},${p[1]}`).join(" ");
  const area = `0,100 ${line} 100,100`;

  const grades = [
    { label: "A", count: 12.5, color: "#ec4899" },
    { label: "B+", count: 4, color: "#a855f7" },
    { label: "B", count: 1, color: "#6366f1" },
    { label: "B-", count: 1, color: "#3b82f6" },
  ];
  const total = grades.reduce((s, g) => s + g.count, 0);
  let acc = 0;
  const donut = grades
    .map((g) => {
      const start = (acc / total) * 360;
      acc += g.count;
      const end = (acc / total) * 360;
      return `${g.color} ${start}deg ${end}deg`;
    })
    .join(", ");

  return (
    <section id="numbers" ref={ref} className="relative px-4 py-28 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <SectionHeader
          eyebrow="By the numbers"
          title={
            <>
              1 in 6 undergrads already use it.
              <br className="hidden sm:block" /> Why don&apos;t you?
            </>
          }
        />

        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06}>
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 text-center">
                <p className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  {s.prefix}
                  <CountUp to={s.to} inView={inView} decimals={s.dec} />
                  <span className="rc-gradient-text">{s.suffix}</span>
                </p>
                <p className="mt-2 text-xs text-white/45">{s.label}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <Reveal className="lg:col-span-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <p className="mb-4 text-sm font-medium text-white/70">
                Cumulative GPA trend
              </p>
              <div className="relative h-44 w-full">
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  className="h-full w-full"
                >
                  <defs>
                    <linearGradient id="gpaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ec4899" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon points={area} fill="url(#gpaFill)" />
                  <polyline
                    points={line}
                    fill="none"
                    stroke="#ec4899"
                    strokeWidth="1.5"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/35">
                {sems.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
              <p className="mb-4 self-start text-sm font-medium text-white/70">
                Grade distribution
              </p>
              <div
                className="relative h-32 w-32 rounded-full"
                style={{ background: `conic-gradient(${donut})` }}
              >
                <div className="absolute inset-[22%] rounded-full bg-[#0c0c0f]" />
              </div>
              <div className="mt-4 flex flex-wrap justify-center gap-x-3 gap-y-1">
                {grades.map((g) => (
                  <span
                    key={g.label}
                    className="flex items-center gap-1 text-[11px] text-white/50"
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: g.color }}
                    />
                    {g.label}
                  </span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
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
  const { theme, toggleTheme } = useTheme();
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
          ? "border-b border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#08080a]/80"
          : "border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="#top" className="flex items-center">
          <CompoundLogo animated size="sm" darkAlways />
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-white/55 dark:hover:text-white"
            >
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80 dark:text-white/50 dark:hover:bg-white/[0.06] dark:hover:text-white/80 light:text-gray-500 light:hover:bg-black/[0.04] light:hover:text-gray-700"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            onClick={onLogin}
            className="hidden rounded-lg px-3 py-1.5 text-sm text-gray-600 transition-colors hover:text-gray-900 dark:text-white/70 dark:hover:text-white sm:block"
          >
            Log in
          </button>
          <button
            onClick={onLogin}
            className="group flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-1.5 text-sm font-medium text-white transition-all hover:bg-gray-700 dark:bg-white dark:text-black dark:hover:bg-pink-50"
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
      className="min-h-screen overflow-x-hidden bg-[#08080a] font-louize text-white antialiased"
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
            className="group mb-7 inline-flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.04] py-1.5 pl-3 pr-3.5 text-xs text-white/70 backdrop-blur-md transition-colors hover:border-pink-400/40 hover:text-white"
          >
            <span className="text-[11px] uppercase tracking-[0.18em] text-white/45">
              As featured in
            </span>
            <span className="h-3.5 w-px bg-white/15" />
            <span className="font-louize text-sm font-medium tracking-tight text-white">
              The Yale Daily News
            </span>
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
            place. We&apos;re democratizing academic planning, stats, and
            insights at Yale, together. For Yalies, by Yalies.
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

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-2"
          >
            <div className="flex -space-x-2.5">
              {[
                "from-pink-400 to-rose-500",
                "from-violet-400 to-purple-500",
                "from-sky-400 to-blue-500",
                "from-fuchsia-400 to-pink-500",
                "from-indigo-400 to-violet-500",
              ].map((g, i) => (
                <span
                  key={i}
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${g} ring-2 ring-[#08080a]`}
                />
              ))}
            </div>
            <p className="text-sm text-white/65">
              Have you heard?{" "}
              <span className="font-semibold text-white">
                1 in 6 Yale undergrads
              </span>{" "}
              already use DegreeIntelligence.
            </p>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mt-4 text-sm text-white/45"
          >
            Why don&apos;t you? Even if you do,{" "}
            <span className="rc-gradient-text font-medium">
              we just launched v2. Free. Always.
            </span>
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
            <span className="font-louize text-base text-white/65">
              The Yale Daily News
            </span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span>14 residential colleges</span>
            <span className="hidden h-4 w-px bg-white/10 sm:block" />
            <span>Every major &amp; concentration</span>
          </div>
        </div>
      </section>

      {/* ================= BENTO FEATURES ================= */}
      <section id="features" className="relative px-4 py-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="Everything, in one place"
            title={
              <>
                There&apos;s a tool for every part
                <br className="hidden sm:block" /> of your degree.
              </>
            }
            sub="From the first requirement to your final semester, DegreeIntelligence replaces the spreadsheets, the PDFs, and the five poorly-organized websites you used to dig through."
          />

          <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <FeatureCard
              className="lg:col-span-4"
              tint="blue"
              icon={<FiZap />}
              title="Semester simulator"
              desc="Drag courses into future semesters, check conflicts, and see your plan come together before you commit to a single class."
            >
              <div className="overflow-hidden rounded-lg border border-white/10">
                <img
                  src="/demo/simulator.gif"
                  alt="Semester simulator"
                  className="block w-full"
                />
              </div>
            </FeatureCard>

            <FeatureCard
              className="lg:col-span-2"
              tint="purple"
              icon={<FiBarChart2 />}
              title="Major progress"
              badge="New"
              desc="A live heat map of everything done and everything left."
            >
              <HeatGrid />
            </FeatureCard>

            <FeatureCard
              className="lg:col-span-2"
              tint="pink"
              icon={<FiSearch />}
              title="Requirements database"
              desc="Every major and concentration requirement, parsed and tracked for you."
            >
              <ReqChecklist />
            </FeatureCard>

            <FeatureCard
              className="lg:col-span-2"
              tint="violet"
              icon={<HiSparkles />}
              title="Smart recommendations"
              desc="Suggestion models surface courses that actually fit your plan."
            >
              <SuggestionChips />
            </FeatureCard>

            <FeatureCard
              className="lg:col-span-2"
              tint="rose"
              icon={<FiUsers />}
              title="Friends"
              desc="See where friends and mentors slotted their courses."
            >
              <FriendsRows />
            </FeatureCard>

            <FeatureCard
              className="lg:col-span-3"
              tint="indigo"
              icon={<FiLayers />}
              title="Double-major manager"
              desc="Juggle two majors without the chaos. Shared courses, conflicts, and overlap, made obvious."
            >
              <DoubleMajorMock />
            </FeatureCard>

            <FeatureCard
              className="lg:col-span-3"
              tint="pink"
              icon={<FiTrendingUp />}
              title="Stats & GPA"
              desc="Track your GPA trend, credits, and grade distribution at a glance."
            >
              <StatsMini />
            </FeatureCard>
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="relative px-4 py-28 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeader
            eyebrow="How it works"
            title="From transcript to plan in minutes."
            sub="No setup, no spreadsheets. Sign in with CAS and your whole degree assembles itself."
          />
          <div className="mt-16 grid items-start gap-10 lg:grid-cols-2">
            <div className="lg:sticky lg:top-28">
              <div className="rc-window rounded-2xl">
                <BrowserChrome url="degreeintelligence.app/simulator">
                  <img
                    src="/demo/simulator.gif"
                    alt="DegreeIntelligence in action"
                    className="block w-full"
                  />
                </BrowserChrome>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  n: "01",
                  t: "Sign in with Yale CAS",
                  d: "One click. We pull in your major, your courses, and your progress automatically.",
                },
                {
                  n: "02",
                  t: "Watch every requirement light up",
                  d: "A live, color-coded view of what's done, what's in progress, and what's left for every major and concentration.",
                },
                {
                  n: "03",
                  t: "Simulate future semesters",
                  d: "Drag courses around, catch conflicts early, and share your plan with friends and advisors.",
                },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 0.08}>
                  <div className="rc-card-hover flex gap-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                    <span className="rc-gradient-text text-2xl font-semibold tabular-nums">
                      {s.n}
                    </span>
                    <div>
                      <h3 className="mb-1 text-lg font-semibold text-white">
                        {s.t}
                      </h3>
                      <p className="text-sm leading-relaxed text-white/50">
                        {s.d}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= BEFORE / AFTER ================= */}
      <section className="relative px-4 py-20 sm:px-6">
        <div className="mx-auto grid max-w-5xl gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-white/[0.06] bg-white/[0.015] p-7">
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-white/30">
                Before
              </p>
              <ul className="space-y-3">
                {[
                  "Scattered requirements across PDFs and websites",
                  "Manual tracking in error-prone spreadsheets",
                  "No centralized view of progress",
                  "Planning nightmares, especially double majors",
                ].map((x) => (
                  <li
                    key={x}
                    className="flex items-start gap-2.5 text-sm text-white/45"
                  >
                    <FiX className="mt-0.5 shrink-0 text-white/30" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="relative h-full overflow-hidden rounded-2xl border border-pink-400/20 bg-gradient-to-br from-pink-500/[0.1] via-purple-500/[0.04] to-transparent p-7">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl" />
              <p className="mb-5 text-xs font-semibold uppercase tracking-[0.2em] text-pink-300/80">
                With DegreeIntelligence
              </p>
              <ul className="space-y-3">
                {[
                  "Unified requirements database",
                  "Real-time progress stats & visualization",
                  "Intelligent course recommendations",
                  "Clean, intuitive interface, free forever",
                ].map((x) => (
                  <li
                    key={x}
                    className="flex items-start gap-2.5 text-sm text-white/75"
                  >
                    <FiCheck className="mt-0.5 shrink-0 text-pink-400" /> {x}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= NUMBERS ================= */}
      <NumbersSection />

      {/* ================= TEAM ================= */}
      <section id="team" className="relative px-4 py-28 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <SectionHeader
            eyebrow="Built by Yalies, for Yalies"
            title="Born from our own frustration."
            sub="We built the first version after one too many long sessions trying to plan courses. Rather than gatekeeping, we made it clean and published it."
          />
          <div className="mx-auto mt-14 grid max-w-3xl gap-4 sm:grid-cols-2">
            {[
              {
                name: "Filippo Fonseca",
                role: "Founder · Mechanical Engineering (ABET) & EECS '28",
                bio: "Built the first version as a shell script after one too many long planning sessions. Talks too much.",
                img: "/team/filippo.jpeg",
              },
              {
                name: "Emir",
                role: "Development · Electrical Engineering & CS (EECS) '28",
                bio: "Joined forces to keep scaling the platform and make it more robust.",
                img: "/team/emir.JPG",
              },
            ].map((p, i) => (
              <Reveal key={p.name} delay={i * 0.1}>
                <div className="rc-card-hover h-full rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                  <img
                    src={p.img}
                    alt={p.name}
                    className="mb-4 h-16 w-16 rounded-full object-cover ring-2 ring-pink-400/30"
                  />
                  <h3 className="text-lg font-semibold text-white">{p.name}</h3>
                  <p className="mb-3 mt-0.5 text-xs text-pink-300/70">{p.role}</p>
                  <p className="text-sm leading-relaxed text-white/50">{p.bio}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CLOSING CTA: GLOWING KEYBOARD ================= */}
      <section className="relative overflow-hidden px-4 pb-24 pt-16 sm:px-6">
        <div className="rc-bloom pointer-events-none absolute inset-x-0 bottom-0 h-[60%] opacity-50" />
        <div className="relative mx-auto max-w-3xl">
          <KeyboardGraphic />
          <Reveal>
            <div className="mt-10 text-center">
              <span className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/65 backdrop-blur-md">
                <Command size={12} className="text-pink-300" /> K · Search your
                entire degree
              </span>
              <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Take the short way.
              </h2>
              <p className="mt-4 text-lg text-white/55">
                Plan your entire Yale degree in one place.{" "}
                <span className="rc-gradient-text font-medium">
                  Free, always.
                </span>
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={login}
                  className="group flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-black transition-all hover:scale-[1.03]"
                >
                  <GraduationCap size={16} /> Log in with Yale CAS
                  <FiArrowRight
                    size={15}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </button>
                <button
                  onClick={() => setShowVideo(true)}
                  className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/[0.04] px-5 py-3 text-sm font-medium text-white/85 transition-all hover:border-white/25 hover:bg-white/[0.07]"
                >
                  <FiPlay size={14} className="text-pink-300" /> Watch the demo
                </button>
              </div>
              <p className="mt-5 text-xs text-white/30">
                v2 · Sign in with Yale CAS · 1 in 6 undergrads
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ================= MEGA FOOTER ================= */}
      <footer className="relative overflow-hidden border-t border-white/[0.06]">
        <div className="rc-grid-lines pointer-events-none absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <LogoIcon width={24} height={24} />
                <span className="text-sm font-semibold text-white">
                  DegreeIntelligence
                </span>
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/45">
                Democratizing academic planning, stats, and insights at Yale.
                Built by Yalies, for Yalies.
              </p>
            </div>
            {[
              {
                h: "Product",
                links: [
                  ["Features", "#features"],
                  ["How it works", "#how"],
                  ["By the numbers", "#numbers"],
                ],
              },
              {
                h: "Company",
                links: [
                  ["Team", "#team"],
                  ["Yale Daily News", YDN_URL],
                ],
              },
              {
                h: "Get started",
                links: [["Log in with CAS", "#"]],
              },
            ].map((col) => (
              <div key={col.h}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-white/40">
                  {col.h}
                </p>
                <ul className="space-y-2">
                  {col.links.map(([label, href]) => (
                    <li key={label}>
                      <a
                        href={href}
                        onClick={
                          label === "Log in with CAS"
                            ? (e) => {
                                e.preventDefault();
                                login();
                              }
                            : undefined
                        }
                        className="text-sm text-white/50 transition-colors hover:text-white"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-white/35 sm:flex-row">
            <span>
              © {new Date().getFullYear()} DegreeIntelligence. Not affiliated
              with Yale University.
            </span>
            <span className="flex items-center gap-1.5">
              Made with{" "}
              <span className="text-pink-400">♥</span> in New Haven
            </span>
          </div>
        </div>
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
