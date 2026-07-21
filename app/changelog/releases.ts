// Public changelog data for DegreeIntelligence.
// Newest first. Append future entries (v3.1, v3.2, ...) to the TOP of this array.

export type ChangelogSection = {
  title: string;
  items: string[];
};

export type Release = {
  version: string;
  name?: string;
  date: string; // human-readable, e.g. "Summer 2026"
  summary?: string;
  current?: boolean;
  sections: ChangelogSection[];
};

export const RELEASES: Release[] = [
  {
    version: "v3",
    name: "The big release",
    date: "Summer 2026",
    current: true,
    summary:
      "Our largest update yet. We rebuilt the way you move through DegreeIntelligence, sharpened every number we show you, and made the whole thing faster and friendlier. This is the version we always wanted to ship.",
    sections: [
      {
        title: "Move faster",
        items: [
          "A global command palette. Press Cmd+K from anywhere to search every course, requirement, major, and friend, then jump straight to it.",
          "Faster loads across the board. We code-split the heavy views and cut artificial delays, so the app opens and switches tabs noticeably quicker.",
          "Loading skeletons throughout. Instead of blank screens, you now see the shape of your data while it streams in.",
        ],
      },
      {
        title: "Plan with confidence",
        items: [
          "A much better course Simulator. A cleaner semester layout, a live stat header, and a default-plan system that auto-loads where you left off.",
          "Better My Major(s) with a double-major conflict manager that flags shared courses, overlaps, and prerequisite conflicts across both majors.",
          "A Board and Heat map view of your requirements, so you can read your whole degree at a glance or zoom into a single track.",
        ],
      },
      {
        title: "Certificates, finally",
        items: [
          "Track any of Yale's 42 certificates alongside your majors, with a dedicated My Certificates view and full Simulator support.",
          "A per-certificate rules engine that knows each program's real policy. Most certificates let up to two courses double-count with a major, Data Science and Programming allow none, and Quantum only shares courses at the 3000 level and above.",
          "Honest conflict handling. Courses your major already counts are grayed out with the reason, an overlap meter shows how much sharing each certificate allows, and a certificate Yale will not award to your major carries a clear warning.",
          "Certificate math you can trust: a course that breaks a rule drops out of that certificate's progress automatically, and your major always keeps its credit.",
        ],
      },
      {
        title: "Understand your degree",
        items: [
          "More and better academic Stats: a polished chart grid for GPA trends, credits, and grade distribution that stays legible in light and dark.",
          "Distributional-requirement tracking improvements, including a breakdown donut and clearer, honestly labeled progress cards.",
          "Friends, redesigned. Compare progress, see where classmates and mentors slotted their courses, and plan alongside your major.",
        ],
      },
      {
        title: "A more refined feel",
        items: [
          "Light mode. A full, carefully tuned light theme that matches the dark one, with a system-default option.",
          "A guided in-app tutorial that walks new students through uploading a transcript and reading their plan.",
          "An overall UI and UX polish: a collapsible sidebar, smoother transitions, and a more consistent, refined look everywhere.",
        ],
      },
    ],
  },
  {
    version: "v2",
    name: "A major update",
    date: "February 2026",
    summary:
      "A wave of refinements built on everything we learned from launch. We tightened the planning flow, made the social side feel real, and fixed the rough edges students kept running into.",
    sections: [
      {
        title: "Planning",
        items: [
          "A reworked Simulator with credit counts, in-line progress, and smarter plan-saving so your work sticks between sessions.",
          "Manual course entry that handles classes outside our catalog, including planned future courses.",
          "Clearer credit warnings and a calmer save flow that stops you from losing changes.",
        ],
      },
      {
        title: "Friends and sharing",
        items: [
          "A rebuilt Friends tab with a cleaner welcome flow and a clearer way to see who is and is not connected.",
          "Better permissions and disclaimers, so it is obvious what you are sharing before you share it.",
        ],
      },
      {
        title: "Polish and fixes",
        items: [
          "A new login flow and a smoother first-run experience for new students.",
          "A genuinely good mobile view, so the whole app holds up on a phone.",
          "Catalog and accuracy fixes: corrected course codes, fractional-credit tracking, and semester availability indicators.",
        ],
      },
    ],
  },
  {
    version: "v1",
    name: "The original launch",
    date: "Fall 2025",
    summary:
      "Where it started. DegreeIntelligence launched as the first clean, free place to see your whole Yale degree in one view. Built by two students after one too many long planning sessions.",
    sections: [
      {
        title: "The core",
        items: [
          "Sign in with Yale CAS and have your transcript parsed automatically into a live view of your courses.",
          "A requirements engine that tracks every major and concentration, including partially fulfilled credit totals.",
          "Skip and unskip courses, handle duplicates cleanly, and keep your transcript dashboard accurate.",
        ],
      },
      {
        title: "Insight and progress",
        items: [
          "An academic stats page with cumulative GPA charts, credit counts, and a grid of major progress.",
          "A distributionals section to track Yale's distributional requirements alongside your major.",
          "Course detail modals so every requirement, code, and credit count is one click away.",
        ],
      },
      {
        title: "Early social and craft",
        items: [
          "An initial Friends tab to start comparing progress with classmates.",
          "The first Simulator: drag courses into future semesters and watch your plan take shape.",
          "A neumorphic, carefully designed interface and the welcome flow that made it feel like a real product on day one.",
        ],
      },
    ],
  },
];
