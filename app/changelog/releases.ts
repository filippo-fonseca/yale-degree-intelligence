// Public changelog data for DegreeIntelligence.
// Newest first. Append future entries (v3.0.1, v3.1.0, ...) to the TOP of this array.

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
    version: "v3.0.0",
    name: "The big release",
    date: "Summer 2026",
    current: true,
    summary:
      "Our largest update yet — and the public launch of DegreeIntelligence 3. Faster planning, clearer numbers, a friend page worth sharing, tighter privacy, emptier states that actually tell you what to do next, and a cleaned-up codebase so we can keep shipping safely.",
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
          "A much better course Simulator. A cleaner semester layout, a live stat header, and a default-plan system that auto-loads where you left off — plus unsaved-change warnings so you don’t lose work.",
          "Better My Major(s) with a double-major conflict manager that flags shared courses, overlaps, and prerequisite conflicts across both majors.",
          "A Board and Heat map view of your requirements, so you can read your whole degree at a glance or zoom into a single track.",
          "A full Yale College catalog (Fall 2023 → Spring 2027): 6,500+ courses, 3→4 digit renumbers, EENG→ECE aliases, and Fall 2026 / Spring 2027 flags for the Simulator.",
          "The Simulator is now two tabs instead of one long page. Canvas is where you build the plan (the semester grid, the course pool, saving and loading), and Progress is where you read what it adds up to: your requirement cards, your GPA timeline, and your distributionals. It remembers which tab you were last on.",
          "One plan control instead of two. The Simulator's toolbar now shows a single plan button that tells you which plan you are on, whether it has unsaved work, and opens a redesigned plan manager where you can switch plans, pick a default, rename by saving over one, or delete. It sits beside the Canvas / Progress tabs on both, since the Progress numbers follow whichever plan is loaded.",
          "Saving a plan is now one click. The Simulator's toolbar puts your plan on top, where it belongs, with the Canvas / Progress tabs underneath it, and the moment you change something a Save button appears next to the plan name. Click it (or press Cmd+S) and your work goes straight back into the plan you are on, with no dialog to fill in. If you have not named a plan yet, it still asks you for a name first.",
          "Save, Clear canvas, and Help moved down to the canvas itself, right above your semester grid, as small quiet buttons instead of big pills in the toolbar.",
          "A calmer Canvas that is easier to drag on. The quick-add course pool is gone from the top of the grid, and the grade and distributional editors on each course card are now off until you turn them on with the Grades and Distributionals buttons. Course cards stay one line tall by default, so dragging between semesters is much easier. Add still works from any semester, and the editors remember whichever way you saved a plan.",
          "Distributionals fill themselves in. Turn the Distributionals editor on and a course you have planned starts with the tags Yale lists for it already selected, so you only change the ones you disagree with. Anything you set yourself always wins.",
          "Those tags now come from Yale's own course listings. We checked every course in the catalog against the Yale College Programs of Study bulletin, going back through four years of editions to find courses that are no longer offered, and they agree on more than 98 percent of the courses that carry tags. Where the bulletin proved a course had tags we were missing, we added them.",
          "The courses you are taking right now count everywhere they should. \"+ In Progress\" on My Major and My Certificates, your in-progress credits, and the Simulator all pick them up, whether the course came from your transcript or you added it by hand.",
          "Planned courses in the Simulator's Progress tab now say when they are coming. Open a major or certificate card and each planned course pill shows the semester your plan schedules it for (for example, planned · Fall '26), so you can read what fills a requirement and when without flipping back to the Canvas.",
        ],
      },
      {
        title: "Certificates, finally",
        items: [
          "Track any of Yale's 42 certificates alongside your majors, with a dedicated My Certificates view and full Simulator support.",
          "A per-certificate rules engine that knows each program's real policy. Most certificates let up to two courses double-count with a major, Data Science and Programming allow none, and Quantum only shares courses at the 3000 level and above.",
          "Honest conflict handling. Courses your major already counts are grayed out with the reason, an overlap meter shows how much sharing each certificate allows, and a certificate Yale will not award to your major carries a clear warning.",
          "Certificate math you can trust: a course that breaks a rule drops out of that certificate's progress automatically, and your major always keeps its credit.",
          "The certificate board and its numbers now say the same thing. A course your major already claims no longer shows as in progress on a certificate it cannot count toward.",
        ],
      },
      {
        title: "Understand your degree",
        items: [
          "More and better academic Stats: GPA trends, credits, and grade distribution that stay legible in light and dark — including F grades that were previously skipped by mistake.",
          "Distributional-requirement tracking that counts real credits, clearer progress cards, and a course can only sit at one language level.",
          "Your distributionals fill themselves in. Every course you have taken, added, or planned now starts with the tags Yale publishes for it, so the Distributionals tab shows real progress even if you have never tagged a single course. Your transcript still wins where it lists them, and anything you set by hand always wins over both. Change one tag and the rest stay put.",
          "Clearer empty states: Stats, Friends, and Distributionals invite you to upload a transcript instead of sitting greyed out.",
          "The language requirement is now tracked one language at a time. Picking up a new language at L1 for fun no longer undoes a sequence you already finished in another one, so a completed French track stays complete and your public page shows the level you actually reached. When you have courses in more than one language, the card lets you switch between them and says when a second language is extra rather than owed.",
          "The distributional breakdown chart's legend is readable in dark mode again.",
        ],
      },
      {
        title: "Friends you can actually use",
        items: [
          "A rebuilt public friend page: who they are, simple stats (no grades), distributional progress, and courses by semester — built for checking out your froco.",
          "The Friends tab always shows a live preview of your public page, plus Copy link, Open my page, and Customize what friends see.",
          "Before you enable Friends, you see a demo of what the page looks like and exactly what’s shared. Grades and GPA are never shared.",
        ],
      },
      {
        title: "Safer and more honest",
        items: [
          "Transcript upload only works when you’re signed in, with basic spam protection.",
          "Friend connections go through the server, so nobody can fake a friendship to peek at your courses.",
          "No AI advisor and no chatbot. DegreeIntelligence answers you from Yale's own requirement rules, not from a model that might guess, and nothing you enter is sent to one.",
          "Deleting your account also clears everything left over from the AI features we removed, including any API key or access token you had connected.",
          "Honest copy: login says Yale Google (not CAS), and we no longer claim your transcript is processed only on your device.",
          "Clearer disclaimers everywhere: you voluntarily share courses and grades (upload or manual), those records are stored on our servers for your account, we are not affiliated with Yale, and DegreeIntelligence is free forever — we will never charge a dime.",
          "Tighter account security for v3: APIs only accept @yale.edu sessions, and your private profile is readable only by you.",
        ],
      },
      {
        title: "A more refined feel",
        items: [
          "Light mode. A full, carefully tuned light theme that matches the dark one, with a system-default option.",
          "A guided in-app tutorial that walks new students through uploading a transcript and reading their plan.",
          "An overall UI and UX polish: a collapsible sidebar, smoother transitions, and a more consistent look everywhere.",
          "A Class of 2030 welcome: no grades needed to start, a one-click path into the Simulator, and step-by-step YHub instructions so you can import in-progress courses after registration.",
        ],
      },
      {
        title: "Built to keep improving",
        items: [
          "We’re cleaning up the codebase as part of v3 — splitting huge screens and the main dashboard into smaller modules.",
          "That work is already underway so future development stays easy, safer, and faster without breaking what you rely on.",
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
