import type { ComponentType } from "react";
import {
  Sparkles,
  Upload,
  GraduationCap,
  MonitorCog,
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
  {
    id: "welcome",
    icon: Sparkles,
    eyebrow: "Welcome",
    title: "Let me show you around",
    description:
      "DegreeIntelligence keeps your whole Yale degree in one place. Here is a quick tour of what each section does and why it is here.",
    accent: "purple",
  },
  {
    id: "upload",
    tabId: "upload",
    icon: Upload,
    eyebrow: "My courses",
    title: "Bring in your courses",
    description:
      "Import your transcript or add courses by hand to track everything you have taken and everything you are taking right now. It is the foundation the rest of the app builds on.",
    accent: "blue",
  },
  {
    id: "major",
    tabId: "major",
    icon: GraduationCap,
    eyebrow: "My major(s)",
    title: "Live major progress",
    description:
      "See real-time progress against your major requirements. A double-major conflict manager flags overlaps and shared courses across two majors so nothing double-counts by surprise.",
    accent: "pink",
  },
  {
    id: "simulator",
    tabId: "simulator",
    icon: MonitorCog,
    eyebrow: "Simulator",
    title: "Plan future semesters",
    description:
      "Map out semesters you have not taken yet and instantly see the impact on your GPA and requirement progress. Experiment freely before you commit to a schedule.",
    accent: "purple",
  },
  {
    id: "stats",
    tabId: "stats",
    icon: BarChart2,
    eyebrow: "Academic stats",
    title: "Understand your record",
    description:
      "GPA trends, grade distributions, and insights drawn from your transcript, so you always know where you stand at a glance.",
    accent: "blue",
  },
  {
    id: "distributionals",
    tabId: "distributionals",
    icon: Layers,
    eyebrow: "Distributionals",
    title: "Track distributional requirements",
    description:
      "Yale's distributional requirements, all in one view. See which areas are covered and which still need attention before you graduate.",
    accent: "pink",
  },
  {
    id: "friends",
    tabId: "friends",
    icon: Users,
    eyebrow: "Friends",
    title: "Compare with friends",
    description:
      "Connect with friends to compare progress and keep each other on track. Academic planning is a lot less lonely together.",
    accent: "purple",
  },
  {
    id: "command-palette",
    icon: Command,
    eyebrow: "Power user",
    title: "The command palette",
    description:
      "Press Cmd+K (or Ctrl+K) anywhere for fast, keyboard-driven navigation and actions. It is the quickest way to jump around once you know your way around.",
    accent: "blue",
  },
  {
    id: "cleoai",
    tabId: "cleoai",
    icon: Bot,
    eyebrow: "Coming soon",
    title: "Meet Dan",
    description:
      "Dan is an AI academic advisor that will answer questions and help you plan, grounded in your real degree data. It is on the way.",
    accent: "pink",
  },
  {
    id: "done",
    icon: PartyPopper,
    eyebrow: "All set",
    title: "You are ready to go",
    description:
      "That is the whole app. You can replay this tour anytime from Settings whenever you want a refresher.",
    accent: "purple",
  },
];
