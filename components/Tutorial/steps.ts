import type { ComponentType } from "react";
import {
  Sparkles,
  Upload,
  FilePlus,
  GraduationCap,
  LayoutGrid,
  Flame,
  CheckCircle2,
  SkipForward,
  GitMerge,
  MonitorCog,
  Move,
  Zap,
  Star,
  BarChart2,
  Layers,
  Users,
  Command,
  Bot,
  PartyPopper,
} from "lucide-react";

export type TourAccent = "pink" | "blue" | "purple";

export interface TourStep {
  /** Stable key for the step. */
  id: string;
  /** Optional app tab to switch to when this step is shown. */
  tabId?: string;
  /**
   * CSS selector for the real element this step points to. When set, the tour
   * spotlights that element and anchors the tooltip beside it. When omitted,
   * the tooltip is centered with a full dim (used for intro/outro/Cmd+K).
   *
   * Feature-level steps that live inside a tab reuse the tab's `nav-{id}`
   * anchor so the spotlight always lands on a mounted element. AppTour also
   * degrades gracefully to a centered card if an anchor is ever missing.
   */
  anchor?: string;
  /** Icon shown in the step header. */
  icon: ComponentType<{ className?: string }>;
  /** Short eyebrow label above the title. */
  eyebrow: string;
  title: string;
  /** 1-2 sentence explanation of what the feature does and why. */
  description: string;
  /** Accent color used for the icon chip and glow. */
  accent: TourAccent;
}

export const TOUR_STEPS: TourStep[] = [
  // ── Intro ──────────────────────────────────────────────────────────────
  {
    id: "welcome",
    icon: Sparkles,
    eyebrow: "Welcome",
    title: "Let me show you around",
    description:
      "DegreeIntelligence keeps your whole Yale degree in one place. This quick tour walks through the sections you'll live in and the power features most people miss.",
    accent: "purple",
  },

  // ── My courses ─────────────────────────────────────────────────────────
  {
    id: "upload-transcript",
    tabId: "upload",
    anchor: '[data-tour="nav-upload"]',
    icon: Upload,
    eyebrow: "My courses",
    title: "Start with your transcript",
    description:
      "Upload your Yale transcript and we parse every course, grade, and term automatically. This is the foundation: majors, stats, and the simulator all build on it.",
    accent: "blue",
  },
  {
    id: "upload-add-course",
    tabId: "upload",
    anchor: '[data-tour="nav-upload"]',
    icon: FilePlus,
    eyebrow: "My courses",
    title: "Add courses by hand, per semester",
    description:
      "Each semester block has its own add-course button, so you can drop in a current class or something the transcript missed exactly where it belongs. Mark anything in-progress and it counts toward live progress right away.",
    accent: "blue",
  },

  // ── My major(s) ────────────────────────────────────────────────────────
  {
    id: "major-progress",
    tabId: "major",
    anchor: '[data-tour="nav-major"]',
    icon: GraduationCap,
    eyebrow: "My major(s)",
    title: "Your major, requirement by requirement",
    description:
      "Every requirement becomes a card showing exactly what's done, in progress, and still open, computed from your real courses. No spreadsheets, no guessing what still counts.",
    accent: "pink",
  },
  {
    id: "major-board-heatmap",
    tabId: "major",
    anchor: '[data-tour="nav-major"]',
    icon: LayoutGrid,
    eyebrow: "My major(s)",
    title: "Board view vs. Heat map",
    description:
      "Toggle between the Board, which lays out each requirement group, and the Heat map, which color-codes every requirement by how complete it is. The heat map is the fastest way to spot the gaps you need to close.",
    accent: "pink",
  },
  {
    id: "major-fulfill-manual",
    tabId: "major",
    anchor: '[data-tour="nav-major"]',
    icon: CheckCircle2,
    eyebrow: "My major(s)",
    title: "Fulfill manually when we miss one",
    description:
      "Catalog data isn't perfect, so any requirement has a \"Fulfill manually\" action to mark it satisfied by a course we didn't auto-match. Your override sticks and progress updates instantly.",
    accent: "pink",
  },
  {
    id: "major-skip",
    tabId: "major",
    anchor: '[data-tour="nav-major"]',
    icon: SkipForward,
    eyebrow: "My major(s)",
    title: "Skip and unskip course options",
    description:
      "For requirements that offer a choice, skip the options you'll never take so the view focuses on your real path. Changed your mind? Unskip to bring them back at any time.",
    accent: "pink",
  },
  {
    id: "major-double-conflict",
    tabId: "major",
    anchor: '[data-tour="nav-major"]',
    icon: GitMerge,
    eyebrow: "My major(s)",
    title: "Double majors, handled honestly",
    description:
      "Add a second major and the conflict manager flags courses that overlap between the two, so a single class can't quietly double-count where Yale won't allow it. You see every shared course and stay compliant.",
    accent: "purple",
  },

  // ── Simulator (the deep dive) ──────────────────────────────────────────
  {
    id: "sim-board",
    tabId: "simulator",
    anchor: '[data-tour="nav-simulator"]',
    icon: MonitorCog,
    eyebrow: "Simulator",
    title: "Plan future semesters on a board",
    description:
      "The Simulator is a drag-and-drop canvas for the semesters you haven't taken yet. Sketch out schedules course by course and see the whole degree take shape before you commit to anything.",
    accent: "purple",
  },
  {
    id: "sim-drag",
    tabId: "simulator",
    anchor: '[data-tour="nav-simulator"]',
    icon: Move,
    eyebrow: "Simulator",
    title: "Drag courses to rearrange",
    description:
      "Drop courses into any future term and drag them between semesters to test different orderings. It's built for what-ifs: try a heavier junior spring, then move it back in seconds.",
    accent: "purple",
  },
  {
    id: "sim-live-progress",
    tabId: "simulator",
    anchor: '[data-tour="nav-simulator"]',
    icon: Zap,
    eyebrow: "Simulator",
    title: "Requirements update live as you edit",
    description:
      "As you add or move courses on the canvas, in-progress requirements recompute instantly, so you watch a plan actually complete your major in real time. No save-and-refresh loop.",
    accent: "blue",
  },
  {
    id: "sim-heatmap",
    tabId: "simulator",
    anchor: '[data-tour="nav-simulator"]',
    icon: Flame,
    eyebrow: "Simulator",
    title: "Heat-map preview of your plan",
    description:
      "Flip on the heat map here to see how your planned courses light up requirement coverage. It's the same color-coded read as the Major tab, but projected onto a future you haven't lived yet.",
    accent: "pink",
  },
  {
    id: "sim-skip-manual",
    tabId: "simulator",
    anchor: '[data-tour="nav-simulator"]',
    icon: CheckCircle2,
    eyebrow: "Simulator",
    title: "Skip and manually fulfill here too",
    description:
      "The same skip and \"fulfill manually\" controls from the Major tab work right inside the simulator, so you can model edge cases and petitions without leaving your plan.",
    accent: "purple",
  },
  {
    id: "sim-multiple-plans",
    tabId: "simulator",
    anchor: '[data-tour="nav-simulator"]',
    icon: Star,
    eyebrow: "Simulator",
    title: "Save, switch, and compare plans",
    description:
      "Keep as many plans as you want: save a schedule, switch between them, and compare paths side by side. Star one as your default so it's always the plan you land on first.",
    accent: "purple",
  },

  // ── The rest, briefly ──────────────────────────────────────────────────
  {
    id: "stats",
    tabId: "stats",
    anchor: '[data-tour="nav-stats"]',
    icon: BarChart2,
    eyebrow: "Academic stats",
    title: "Understand your record",
    description:
      "GPA trends, grade distributions, and insights pulled straight from your transcript, so you always know where you stand at a glance.",
    accent: "blue",
  },
  {
    id: "distributionals",
    tabId: "distributionals",
    anchor: '[data-tour="nav-distributionals"]',
    icon: Layers,
    eyebrow: "Distributionals",
    title: "Track distributional requirements",
    description:
      "Yale's skills and areas distributions in one view, with what's covered and what still needs a class before you graduate.",
    accent: "pink",
  },
  {
    id: "friends",
    tabId: "friends",
    anchor: '[data-tour="nav-friends"]',
    icon: Users,
    eyebrow: "Friends",
    title: "Compare with friends",
    description:
      "Connect with friends to compare progress and keep each other on track. Planning your degree is a lot less lonely together.",
    accent: "purple",
  },

  // ── Power user + outro ─────────────────────────────────────────────────
  {
    id: "command-palette",
    anchor: '[data-tour="search"]',
    icon: Command,
    eyebrow: "Power user",
    title: "The command palette",
    description:
      "Press Cmd+K (or Ctrl+K) anywhere to navigate and run actions from the keyboard. It's the quickest way to move once you know your way around.",
    accent: "blue",
  },
  {
    id: "cleoai",
    tabId: "cleoai",
    anchor: '[data-tour="nav-cleoai"]',
    icon: Bot,
    eyebrow: "Coming soon",
    title: "Meet Dan",
    description:
      "Dan is an AI academic advisor that will answer questions and help you plan, grounded in your real degree data. It's on the way.",
    accent: "pink",
  },
  {
    id: "done",
    icon: PartyPopper,
    eyebrow: "All set",
    title: "You're ready to go",
    description:
      "That's the whole app. Replay this tour anytime from Settings whenever you want a refresher.",
    accent: "purple",
  },
];
