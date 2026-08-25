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
    version: "v3.0.1",
    date: "Summer 2026",
    current: true,
    summary:
      "A quieter front door, a transcript import that no longer does the same work twice, and clearer numbers where you read your progress.",
    sections: [
      {
        title: "Setting up your account",
        items: [
          "The first screen you see in My courses, with the YHub import steps, now matches the rest of v3 as well.",
          "The setup you go through when you first sign in has been rebuilt to look like the rest of v3. Same typography, same calm dark canvas, same buttons as the homepage, instead of the four differently coloured panels it used to open with.",
          "Setup now tells you where you are: a short label at the top of the window and a thin line that fills as you answer, in place of the row of numbered circles.",
          "Choosing your graduation year is now a row of years you tap, and it tells you which class that makes you, rather than a drop-down list.",
          "The tip cards in setup, and everywhere else in the app, no longer show up as a bright white box in dark mode.",
          "The major and certificate pickers match the surfaces around them now, in both light and dark mode.",
          "The \"what's new\" window you see after an update, and the guided tour, now look like the rest of v3 too.",
          "The guided tour's Simulator steps used to be hidden behind the Simulator's own welcome dialog if you had not saved a plan yet. The tour now shows you the real board, and points at an actual semester when it explains dragging courses around.",
          "The tour explains why you would skip a requirement (you placed out of it in high school, or worked it out with your DUS), and nudges you to click into a requirement from the heat map.",
        ],
      },
      {
        title: "Reading your progress",
        items: [
          "The Simulator's Save button now shows the keyboard shortcut on it (⌘S on a Mac, Ctrl+S elsewhere), so you can save a plan without reaching for the mouse.",
          "The Simulator's second tab is now called \"Projected progress + results\", which is what it actually shows: your plan's progress, GPA timeline, and distributional tally.",
          "The \"New\" announcement bar on the Simulator is readable in dark mode again. It was showing its light-mode colours on a dark page.",
          "The Simulator's Help panel describes the simulator you're actually using: building on the Canvas, the Grades and Distributionals editors, the results view, and saving plans.",
          "The progress rings in the Simulator now show their percentage. The ring already tracked your plan; you just had to read the number from the text beside it.",
          "The second GPA on each row of the Simulator's timeline now says \"overall\". Two numbers sat side by side with nothing telling you one was the term and the other your running cumulative GPA.",
          "The Simulator points out that you can now plan grades and distributionals, not just courses. Turn on the Grades and Distributionals editors and the Progress tab shows your projected GPA and distributional tally.",
        ],
      },
      {
        title: "Friends",
        items: [
          "Your page is now visible only to friends you have actually accepted. It always said that, and grades were never part of it, but the courses on your page could previously be read by any signed-in Yale student rather than just your friends. Search still works the same way: it finds people by name, major, and year, and nothing more.",
          "The Friends tab has been rebuilt. Turning it on used to mean scrolling past a big preview of a page you did not have yet to find the button; now the button is right at the top, with a plain description of what friends can see and what they never can. The example page is still there if you want it, one click away.",
          "Inside the tab: your counts are one line instead of three coloured boxes, incoming and outgoing requests are one list instead of two panels, and \"Add friend\" sits in the header where you would look for it.",
          "Your public page is a setting again, not the whole tab. Instead of a full copy of the page rendered inline, you get a short summary of what friends can see, and \"View public page\" opens the real thing.",
          "The distributional badges on a shared page no longer look washed out, and they match the colour of the bar underneath them.",
        ],
      },
      {
        title: "Elsewhere in the app",
        items: [
          "In the Simulator, courses you are taking right now are no longer stuck. You can drag them to another semester or take them out of a plan, the same as a course you have only planned. Finished courses stay put, because those are history.",
          "Drop a course onto the semester you are in right now and it is marked in progress automatically, so the plan matches what you are actually taking.",
          "The bar on My Major shows in-progress credits as a striped, lighter section, so you can see where the completed part ends. The two shades of purple were too close to tell apart.",
          "The dialogs across the app (updating your transcript, the Simulator welcome, confirmations) now share one look, matching the rest of v3.",
          "The public profile page has proper loading states instead of the words \"Loading profile...\", and its sign-in and not-friends screens follow your light or dark mode.",
          "The \"Manual fulfill\" and \"Skip\" explainer on My Major and My Certificates has been rebuilt in the v3 window: same typography as the rest of the app, the two actions numbered rather than bulleted, and no more blue and teal panels.",
          "Closing Settings with unsaved majors, certificates, or graduation year now asks first, and offers to save and close. Only the outside click used to ask; the X, Done, and Escape threw the edit away without a word.",
          "The film on the homepage is the real v3 demo and tutorial now, and it plays with its controls visible instead of fading out at the bottom.",
          "Signing in goes straight to the loading screen. The homepage used to flash back for a moment after you picked your Yale account, which looked like the log-in had failed.",
          "Marking a requirement option as skipped now works even if you had already removed that course from the requirement. It quietly did nothing before.",
          "The switcher above your major and certificate progress lost its bright blue and teal buttons for the black-and-white ones the rest of v3 uses.",
          "The tip cards on My Major and My Certificates are set in the same typeface as the rest of the interface, on the same quiet surface as the help bar above them, instead of a rainbow-edged box in the page's serif.",
          "You can mute the app's sound effects. Settings has a switch for the little pop you hear when you change tabs or drop a course; it is on by default and remembered on the device you set it on.",
          "The sidebar links to our source code, next to Terms and the coffee link.",
          "The \"2030 can use!\" chips in the sidebar now disappear once you have opened that tab, one tab at a time, instead of following you around. They also stopped overflowing their button.",
          "Dragging your transcript onto the upload box now lights the box up, so you can see where the file is going to land. The upload box also follows light mode instead of always being dark.",
          "The switcher above your major and certificate progress shows up as soon as you have one of them, with a button to add another (up to Yale's limit of two majors and three certificates) that takes you straight to the right place in Settings.",
          "\"My certificate(s)\" now says \"My certificate\" or \"My certificates\", depending on how many you have.",
          "The help bars on My Major and My Certificates lost their spinning rainbow border. Same help, less circus.",
          "The Terms and Mission pages have been rebuilt to match the rest of the site, and they follow your light or dark mode now instead of always being dark.",
          "The Terms page no longer says we send your data to a model for \"intelligent feedback features\". That stopped being true when the AI advisor was removed; parsing your transcript is the only thing that reaches a model.",
        ],
      },
      {
        title: "Look and feel",
        items: [
          "The homepage's mission section now tells the real story of how DegreeIntelligence started, and the invitation to help build it is an actual invitation: open a pull request, or email to join the team.",
          "The Yale Daily News banner at the top of the homepage is Yale blue now, so it reads as the news it is.",
          "The GPA chart on the homepage had a legend nobody could read in dark mode. It was being drawn in black.",
          "The homepage navigation bar now stays at the top of the screen as you scroll, and picks up a soft shadow once it is floating over the page. It was meant to do this all along, but it had been scrolling away with everything else.",
          "The main buttons no longer show a hard-edged rectangle pulsing inside them when you hover. The glow behind the label is a soft halo now, the way it was meant to look.",
          "\"Yale\" in the homepage headline is lit in Yale blue, with a highlight that runs through it, and \"open source\" is set heavier so the two things the page is actually about stand out.",
          "The cards floating around the homepage headline are smaller and quieter, and they no longer say the same thing twice. One of the two distributional cards is now a planned semester out of the Simulator, marked PROJECTED, showing courses, their distributionals, and the GPA that plan would give you. There are new cards for certificate progress and for the double-major conflict manager. They now sit beside the headline rather than drifting over it, and they only appear on windows wide enough to have room for them.",
          "New buttons on the homepage. The flat pink-and-purple log-in button is gone, replaced by a calmer black one with a soft pink shine that travels around the edge. Every main button on the page now uses the same treatment, so they read as one family instead of three, and they look right in both light and dark mode.",
          "The headline fits properly on a phone. It used to break in the middle of \"Yale degree\"; now it sits on two clean lines and scales itself to your screen.",
          "The log-in buttons just say \"Log in with @yale.edu email\".",
          "If you prefer less motion on screen, the shine stays still. We follow your system's reduce-motion setting.",
          "A quiet night sky behind the homepage headline. Stars drift and twinkle, and the whole field leans toward your cursor. It holds still if your system asks for reduced motion.",
          "DegreeIntelligence is open source. The homepage says so, and a link under the main buttons takes you straight to the code.",
          "The tip bars on My Major and My Certificates no longer look cut off at their left and right edges.",
          "Buttons that sit next to each other are now the same size, and the in-page buttons are no longer undersized.",
          "The Stats preview is wider. Its charts were being squeezed into the narrow half of the page, so the widgets had less room than the text beside them.",
          "The grade-distribution chart's legend is readable in dark mode. It was being drawn in the light-mode grey on a dark background.",
        ],
      },
      {
        title: "Transcript import",
        items: [
          "Uploading a transcript no longer reads it twice. Adding, removing, and re-adding a file could kick off the same import several times over; now it runs once.",
          "Re-importing the same transcript is instant. We remember what we read from a file you have already uploaded, so bringing it in again is immediate instead of a fresh parse.",
          "Clearer errors when a file is not a transcript. If we cannot find any Yale course codes in it, we say so straight away and point you at your YHub unofficial transcript, instead of failing further along.",
        ],
      },
    ],
  },
  {
    version: "v3.0.0",
    name: "The big release",
    date: "Summer 2026",
    summary:
      "Our largest update yet, and the public launch of DegreeIntelligence 3. Faster planning, clearer numbers, a friend page worth sharing, tighter privacy, emptier states that actually tell you what to do next, and a cleaned-up codebase so we can keep shipping safely.",
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
          "A much better course Simulator. A cleaner semester layout, a live stat header, and a default-plan system that auto-loads where you left off, plus unsaved-change warnings so you don’t lose work.",
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
          "Suggested prerequisites now say so. A certificate requirement that asks for zero credits (like Data Science's suggested intro course) no longer appears as Completed before you have taken anything. It stays in Remaining with a small suggested tag until a course actually satisfies it.",
        ],
      },
      {
        title: "Understand your degree",
        items: [
          "More and better academic Stats: GPA trends, credits, and grade distribution that stay legible in light and dark, including F grades that were previously skipped by mistake.",
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
          "A rebuilt public friend page: who they are, simple stats (no grades), distributional progress, and courses by semester, built for checking out your froco.",
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
          "Clearer disclaimers everywhere: you voluntarily share courses and grades (upload or manual), those records are stored on our servers for your account, we are not affiliated with Yale, and DegreeIntelligence is free forever. We will never charge a dime.",
          "Tighter account security for v3: APIs only accept @yale.edu sessions, and your private profile is readable only by you.",
        ],
      },
      {
        title: "A more refined feel",
        items: [
          "Light mode. A full, carefully tuned light theme that matches the dark one, with a system-default option.",
          "A guided in-app tutorial that walks new students through uploading a transcript and reading their plan.",
          "An overall UI and UX polish: a collapsible sidebar, smoother transitions, and a more consistent look everywhere.",
          "A warmer Class of 2030 frosh welcome on My Courses: you do not need grades to start using DegreeIntelligence and upload your transcript, plus a one-click path into the Simulator and step-by-step YHub instructions so you can import in-progress courses after registration.",
          "Light-mode polish on onboarding and My Major: YHub import step numbers stay readable, and the tips card keeps a full border instead of looking clipped above the progress bar.",
          "Save, Confirm, Disable, and other primary modal buttons stay visible in light mode instead of disappearing into white backgrounds, including Settings Save.",
          "Landing hero: the 1-in-6 social proof sits above the launch film, Class of 2030 welcome lives in the v3 pill (no stars), and the hero is slightly tighter so it fits the viewport.",
        ],
      },
      {
        title: "Built to keep improving",
        items: [
          "We’re cleaning up the codebase as part of v3, splitting huge screens and the main dashboard into smaller modules.",
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
