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
    version: "v3.1",
    name: "Safer, clearer, more shareable",
    date: "July 2026",
    current: true,
    summary:
      "A focused polish wave: tighter privacy, fewer silent bugs, a friend page worth sharing with your froco, and emptier states that actually tell you what to do next.",
    sections: [
      {
        title: "Safer by default",
        items: [
          "Transcript upload and AI features only work when you're signed in, with basic spam protection so they can't be abused.",
          "Friend connections are created through the server now — nobody can fake a friendship to peek at your courses.",
          "Deleting your account also clears your Dan chat history, not just your courses and profile.",
          "Honest copy: login says Yale Google (not CAS), and we no longer claim your transcript is processed only on your device.",
        ],
      },
      {
        title: "Fewer silent bugs",
        items: [
          "Simulator warns you before leaving with unsaved plans, and won't wipe your work when course data refreshes.",
          "Double-major view stays on the major you're looking at instead of jumping back to the first one.",
          "F grades finally count in Academic Stats (they were being skipped by mistake).",
          "Distributionals count real credits, not just courses — and a course can only sit at one language level.",
          "Contact form works again. Friend profiles no longer hang forever if you're logged out.",
        ],
      },
      {
        title: "Friends you can actually use",
        items: [
          "A rebuilt public friend page: who they are, simple stats (no grades), distributional progress, and courses by semester — built for checking out your froco.",
          "The Friends tab always shows a live preview of your public page, plus Copy link, Open my page, and Customize.",
          "Choose what friends see: bio, stats overview, distributionals, and course list — toggles that stick.",
          "Before you enable Friends, you see a demo of what the page looks like and exactly what's shared.",
        ],
      },
      {
        title: "Clearer empty states",
        items: [
          "Stats, Friends, and Distributionals no longer sit greyed out — they invite you to upload a transcript first.",
          "Friendlier “no friends yet” copy: add your froco or someone in your major.",
          "Smaller polish across Major, Simulator, and onboarding so empty screens feel intentional, not broken.",
        ],
      },
    ],
  },
  {
    version: "v3",
    name: "The big release",
    date: "Summer 2026",
    current: false,
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
          "Sign in with Yale Google and have your transcript parsed automatically into a live view of your courses.",
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
