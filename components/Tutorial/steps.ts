import type { ComponentType } from "react";
import {
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
  PartyPopper,
  Award,
} from "lucide-react";

export type TourAccent = "pink" | "blue" | "purple" | "teal";

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
   * Feature-level steps point to the relevant in-tab control or panel. AppTour
   * degrades gracefully to a centered card if an anchor is ever missing.
   */
  anchor?: string | string[];
  /** Optional selector to click before measuring, for stateful controls/tabs. */
  activate?: string;
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
  // ── My courses ─────────────────────────────────────────────────────────
  {
    id: "upload-transcript",
    tabId: "upload",
    anchor: [
      '[data-tour="courses-upload-dropzone"]',
      '[data-tour="courses-reupload"]',
      '[data-tour="nav-upload"]',
    ],
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
    anchor: [
      '[data-tour="courses-empty-manual-add"]',
      '[data-tour="courses-manual-add"]',
      '[data-tour="nav-upload"]',
    ],
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
    anchor: ['[data-tour="major-progress-bar"]', '[data-tour="nav-major"]'],
    activate: '[data-tour="major-board-toggle"]',
    icon: GraduationCap,
    eyebrow: "My major(s)",
    title: "Your major progress at a glance",
    description:
      "This progress bar summarizes how much of your selected major is complete, with an option to include in-progress courses so you can see what this semester is doing for you.",
    accent: "pink",
  },
  {
    id: "major-board-view",
    tabId: "major",
    anchor: [
      '[data-tour="major-requirement-card"]',
      '[data-tour="major-requirements-board"]',
      '[data-tour="nav-major"]',
    ],
    activate: '[data-tour="major-board-toggle"]',
    icon: LayoutGrid,
    eyebrow: "My major(s)",
    title: "Board view explains each requirement",
    description:
      "Board view is the default workspace. Each requirement is a card showing the credits, matching courses, and actions available for that specific requirement.",
    accent: "pink",
  },
  {
    id: "major-heatmap-toggle",
    tabId: "major",
    anchor: [
      '[data-tour="major-heatmap-toggle"]',
      '[data-tour="major-view-switcher"]',
    ],
    activate: '[data-tour="major-heatmap-toggle"]',
    icon: LayoutGrid,
    eyebrow: "My major(s)",
    title: "Click into Heat map",
    description:
      "Use the Heat map toggle to replace the board with a compact scan of the whole major.",
    accent: "pink",
  },
  {
    id: "major-heatmap-view",
    tabId: "major",
    anchor: [
      '[data-tour="major-heatmap-cell"]',
      '[data-tour="major-heatmap-view"]',
      '[data-tour="major-view-switcher"]',
    ],
    icon: LayoutGrid,
    eyebrow: "My major(s)",
    title: "Read the actual heat map",
    description:
      "Each square is a requirement. Its color shows whether that requirement is complete, in progress, partial, or untouched.",
    accent: "pink",
  },
  {
    id: "major-fulfill-manual",
    tabId: "major",
    anchor: [
      '[data-tour="major-fulfill-manual-button"]',
      '[data-tour="major-requirements-board"]',
      '[data-tour="nav-major"]',
    ],
    activate: '[data-tour="major-board-toggle"]',
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
    anchor: [
      '[data-tour="major-requirement-card"]',
      '[data-tour="major-requirements-board"]',
      '[data-tour="nav-major"]',
    ],
    activate: '[data-tour="major-board-toggle"]',
    icon: SkipForward,
    eyebrow: "My major(s)",
    title: "Skip and unskip course options",
    description:
      "Click into a requirement card to open its details. From there, you can mark listed options as skipped, or unskip them later if your plan changes.",
    accent: "pink",
  },
  {
    id: "major-double-conflict",
    tabId: "major",
    anchor: ['[data-tour="major-shared-courses"]', '[data-tour="nav-major"]'],
    activate: '[data-tour="major-board-toggle"]',
    icon: GitMerge,
    eyebrow: "My major(s)",
    title: "Double majors, handled honestly",
    description:
      "Add a second major and the conflict manager flags courses that overlap between the two, so a single class can't quietly double-count where Yale won't allow it. You see every shared course and stay compliant.",
    accent: "purple",
  },

  // ── My certificates ────────────────────────────────────────────────────
  {
    id: "certificate-overview",
    tabId: "certificate",
    anchor: [
      '[data-tour="certificate-progress-bar"]',
      '[data-tour="nav-certificate"]',
    ],
    icon: Award,
    eyebrow: "My certificates",
    title: "Track certificates like majors",
    description:
      "Yale College certificates get the same board, heatmap, manual fulfill, and skip tools as majors — with a hard rule that a course counted for a certificate cannot also count toward your major(s).",
    accent: "teal",
  },

  // ── Simulator (the deep dive) ──────────────────────────────────────────
  {
    id: "sim-board",
    tabId: "simulator",
    anchor: ['[data-tour="simulator-board"]', '[data-tour="nav-simulator"]'],
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
    anchor: ['[data-tour="simulator-course-pool"]', '[data-tour="nav-simulator"]'],
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
    anchor: ['[data-tour="simulator-live-progress"]', '[data-tour="nav-simulator"]'],
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
    anchor: ['[data-tour="simulator-live-progress"]', '[data-tour="nav-simulator"]'],
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
    anchor: ['[data-tour="simulator-semester-add"]', '[data-tour="simulator-board"]'],
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
    anchor: ['[data-tour="simulator-plan-actions"]', '[data-tour="nav-simulator"]'],
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
    anchor: ['[data-tour="stats-charts"]', '[data-tour="nav-stats"]'],
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
    anchor: [
      '[data-tour="distributionals-breakdown"]',
      '[data-tour="nav-distributionals"]',
    ],
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
    anchor: [
      '[data-tour="friends-enable"]',
      '[data-tour="friends-add"]',
      '[data-tour="nav-friends"]',
    ],
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
    id: "done",
    icon: PartyPopper,
    eyebrow: "All set",
    title: "You're ready to go",
    description:
      "That's the whole app. Replay this tour anytime from Settings whenever you want a refresher.",
    accent: "purple",
  },
];
