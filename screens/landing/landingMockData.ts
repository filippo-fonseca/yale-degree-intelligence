export const statsMock = {
  gpa: 3.88,
  totalCredits: 18.5,
  coursesCompleted: 16,
  avgCreditsPerSem: 4.7,
  progressToGradPct: 78, // optional subtitle for Total Credits
};

export const statsDemo = {
  semesters: ["Fall 23", "Spring 24", "Fall 24", "Spring 25"],
  cumulativeGpa: [3.79, 3.71, 3.8, 3.88], // smooth upward trend
  gradeDistribution: [
    { label: "A", count: 12.5 },
    { label: "B+", count: 4 },
    { label: "B", count: 1 },
    { label: "B-", count: 1 },
  ],
};

export const CHART_COLORS = [
  "#8B5CF6", // purple
  "#3B82F6", // blue
  "#10B981", // emerald
  "#F59E0B", // amber
  "#EC4899", // pink
  "#6366F1", // indigo
  "#F97316", // orange
  "#14B8A6", // teal
];

export type DemoPill = {
  code: string;
  cr: number;
  status: "complete" | "in-progress" | "not-taken";
};

export type DemoReq = {
  name: string;
  have: number;
  required: number;
  status: "in-progress" | "not-started";
  desc: string;
  pills: DemoPill[];
};

export const demoTotals = { completed: 5, inProgress: 3, total: 12 };

export const demoStrictPct = Math.round(
  (demoTotals.completed / demoTotals.total) * 100,
);
export const demoWithIPPct = Math.round(
  ((demoTotals.completed + demoTotals.inProgress) / demoTotals.total) * 100,
);

export const demoReqs: DemoReq[] = [
  {
    name: "Introductory Sequence",
    have: 2,
    required: 2,
    status: "in-progress",
    desc: "Two foundational courses.",
    pills: [
      { code: "CPSC 201", cr: 1, status: "complete" },
      { code: "CPSC 202", cr: 1, status: "complete" },
    ],
  },
  {
    name: "Core Systems",
    have: 1,
    required: 3,
    status: "in-progress",
    desc: "Three systems-level courses.",
    pills: [
      { code: "CPSC 223", cr: 1, status: "complete" },
      { code: "CPSC 323", cr: 1, status: "in-progress" },
      { code: "CPSC 365", cr: 1, status: "not-taken" },
    ],
  },
  {
    name: "Mathematics",
    have: 0,
    required: 2,
    status: "not-started",
    desc: "Two math electives.",
    pills: [
      { code: "MATH 222", cr: 1, status: "not-taken" },
      { code: "MATH 241", cr: 1, status: "not-taken" },
    ],
  },
];

export const demoHeat: Array<"complete" | "in-progress" | "not-taken"> = [
  "complete",
  "complete",
  "complete",
  "in-progress",
  "complete",
  "in-progress",
  "in-progress",
  "not-taken",
  "complete",
  "not-taken",
  "not-taken",
  "not-taken",
];

export const teamMembers = [
  {
    name: "Filippo Fonseca",
    role: "Founder | Mechanical Engineering (ABET) & EECS '28",
    bio: "Built the first version as a shell script after one too many long sessions trying to plan courses. Talks too much.",
    contact: "filippo.fonseca@yale.edu",
    photoRoute: "/team/filippo.jpeg",
    github: "https://github.com/filippo-fonseca",
    website: "https://filippofonseca.com",
  },
  {
    name: "Emir Ahmed",
    role: "Development | Electrical Engineering & CS (EECS) '28",
    bio: "Joined forces to continue scaling the platform and make it more robust.",
    contact: "emir.ahmed@yale.edu",
    photoRoute: "/team/emir.JPG",
    github: "https://github.com/EmirataG",
    website: "",
  },
] as const;

export const friendsMock = [
  {
    name: "Sarah Chen",
    major: "CPSC & MATH",
    year: "2026",
    initials: "SC",
    gradient: "from-pink-500 to-purple-600",
  },
  {
    name: "Alex Rivera",
    major: "ECON & S&DS",
    year: "2027",
    initials: "AR",
    gradient: "from-blue-500 to-cyan-600",
  },
  {
    name: "Jordan Kim",
    major: "MCDB",
    year: "2025",
    initials: "JK",
    gradient: "from-emerald-500 to-teal-600",
  },
] as const;
