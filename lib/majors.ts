
// src/lib/majors.ts
import { CourseInfo, getCourseInfo, getCanonicalCode, isValidCourseCode } from "./courseCatalog";

type RequirementOption = {
  type: 'course';
  code: string; // Canonical course code
} | {
  type: 'group';
  options: string[]; // Array of canonical course codes
  required: number; // Number of courses required from this group
  description?: string;
};

type MajorRequirement = {
  id: string;
  name: string;
  description: string;
  requirements: {
    name: string;
    description?: string;
    required: number;
    options: RequirementOption[];
  }[];
  creditRequirements: {
    total: number;
    core: number;
    electives: number;
  };
};

export const MAJORS: Record<string, MajorRequirement> = {
  "MENG": {
  id: "MENG",
  name: "Mechanical Engineering (ABET), B.S.",
  description: "Bachelor of Science in Mechanical Engineering",
  creditRequirements: {
    total: 27.5,
    core: 24.5,
    // Core includes all prereqs & required courses except electives
    electives: 3,
  },
  requirements: [
    // --- PREREQUISITES ---
    {
      name: "Calculus I",
      required: 1,
      options: [{ type: 'course', code: "MATH 1120" }]
    },
    {
      name: "Calculus II",
      required: 1,
      options: [{ type: 'course', code: "MATH 1150" }]
    },
    {
      name: "Calculus III",
      description: "ENAS 1510 or equivalent",
      required: 1,
      options: [{ type: 'course', code: "ENAS 1510" }, { type: 'course', code: "MATH 1200" }]
    },
    {
      name: "Physics Sequence",
      description: "PHYS 1800 + 1810 or PHYS 2000 + 2010",
      required: 2,
      options: [
        { type: 'group', options: ["PHYS 1800", "PHYS 1810"], required: 2 },
        { type: 'group', options: ["PHYS 2000", "PHYS 2010"], required: 2 }
      ]
    },
    {
      name: "Physics Labs",
      required: 1,
      description: "Two labs from PHYS 1650L, 1660L, 2050L, or 2060L",
      options: [
        { type: 'course', code: "PHYS 1650L" },
        { type: 'course', code: "PHYS 1660L" },
        { type: 'course', code: "PHYS 2050L" },
        { type: 'course', code: "PHYS 2060L" }
      ]
    },
    {
      name: "Introductory Chemistry",
      required: 1,
      options: [{ type: 'course', code: "CHEM 1610" }, { type: 'course', code: "CHEM 163" }]
    },

    // --- CORE REQUIREMENTS ---
    { name: "Intro to Engineering", required: 1, options: [{ type: 'course', code: "ENAS 1300" }] },
    { name: "Diff Eqs", required: 1, options: [{ type: 'course', code: "ENAS 1940" }]},
    { name: "Electrical Engineering", required: 1, options: [{ type: 'course', code: "ECE 2000" }] },
    { name: "Linear Algebra", required: 1, options: [{ type: 'course', code: "MATH 2250" }, { type: 'course', code: "MATH 2220" }] },
    { name: "Mechanical Design", required: 1, options: [{ type: 'course', code: "MENG 1105" }] },
    { name: "Thermodynamics", required: 1, options: [{ type: 'course', code: "MENG 2511" }] },
    { name: "Strength of Materials", required: 1, options: [{ type: 'course', code: "MENG 2311" }] },
    { name: "Materials Science", required: 1, options: [{ type: 'course', code: "MENG 2615" }] },
    { name: "Solid Mechanics Lab", required: 1, options: [{ type: 'course', code: "MENG 2616L" }] },
    { name: "Manufacturing & Design", required: 1, options: [{ type: 'course', code: "MENG 3125" }] },
    { name: "Fluid Mechanics", required: 1, options: [{ type: 'course', code: "MENG 3422" }] },
    { name: "Fluid Mechanics Lab", required: 1, options: [{ type: 'course', code: "MENG 3423L" }] },
    { name: "Dynamics", required: 1, options: [{ type: 'course', code: "MENG 3323" }] },
    { name: "Thermal Systems", required: 1, options: [{ type: 'course', code: "MENG 3424" }] },
    { name: "Mechatronics Lab", required: 1, options: [{ type: 'course', code: "MENG 3020L" }] },

    // --- TECHNICAL ELECTIVES ---
    {
      name: "Technical Electives",
      description: "Three required; max one from MENG 4991 or MENG 4992",
      required: 3,
      options: [
        { type: 'course', code: "MENG 2050" },
        { type: 'course', code: "MENG 2147" },
        { type: 'course', code: "MENG 3465" },
        { type: 'course', code: "MENG 3675" },
        { type: 'course', code: "MENG 4041" },
        { type: 'course', code: "MENG 4145" },
        { type: 'course', code: "MENG 4154" },
        { type: 'course', code: "MENG 4359" },
        { type: 'course', code: "MENG 4370" },
        { type: 'course', code: "MENG 4469" },
        { type: 'course', code: "MENG 4475" },
        { type: 'course', code: "MENG 4664" },
        { type: 'course', code: "MENG 4672" },
        { type: 'course', code: "MENG 4673" },
        { type: 'course', code: "MENG 4774" },
        { type: 'course', code: "MENG 4991" },
        { type: 'course', code: "MENG 4992" }
      ]
    },

    // --- SENIOR DESIGN ---
    { name: "Senior Design I", required: 1, options: [{ type: 'course', code: "MENG 4137L" }] },
    { name: "Senior Design II", required: 1, options: [{ type: 'course', code: "MENG 4138L" }] }
  ]
}, "EECS": {
  id: "EECS",
  name: "Electrical Engineering and Computer Science, B.S.",
  description: "Bachelor of Science in EECS",
  creditRequirements: {
    total: 21,
    core: 17,
    electives: 4
  },
  requirements: [
    // --- PREREQUISITES ---
    {
      name: "Calculus I",
      required: 1,
      options: [{ type: 'course', code: "MATH 1120" }]
    },
    {
      name: "Calculus II",
      required: 1,
      options: [{ type: 'course', code: "MATH 1150" }]
    },
    {
      name: "Multivariable Calculus",
      description: "ENAS 1510 or MATH 1200",
      required: 1,
      options: [
        { type: 'course', code: "ENAS 1510" },
        { type: 'course', code: "MATH 1200" }
      ]
    },
    {
      name: "Intro Programming",
      required: 1,
      options: [{ type: 'course', code: "CPSC 1001" }]
    },
    {
      name: "Physics Sequence",
      description: "PHYS 1800 + 1810 or PHYS 2000 + 2010",
      required: 2,
      options: [
        { type: 'group', options: ["PHYS 1800", "PHYS 1810"], required: 2 },
        { type: 'group', options: ["PHYS 2000", "PHYS 2010"], required: 2 }
      ]
    },

    // --- CORE EECS ---
    { name: "Intro to Computer Science", required: 1, options: [{ type: 'course', code: "CPSC 2010" }] },
    { name: "Math Tools for CS", required: 1, options: [{ type: 'course', code: "CPSC 2020" }] },
    { name: "Data Structures", required: 1, options: [{ type: 'course', code: "CPSC 2230" }] },
    { name: "Systems Programming", required: 1, options: [{ type: 'course', code: "CPSC 3230" }] },
    {
      name: "Algorithms",
      required: 1,
      options: [
        { type: 'course', code: "CPSC 3650" },
        { type: 'course', code: "CPSC 3660" }
      ]
    },
    { name: "Intro to Electronics", required: 1, options: [{ type: 'course', code: "ECE 2000" }] },
    { name: "Computer Engineering", required: 1, options: [{ type: 'course', code: "ECE 2010" }] },
    { name: "Comms and Control", required: 1, options: [{ type: 'course', code: "ECE 2020" }] },
    { name: "Circuits and Systems", required: 1, options: [{ type: 'course', code: "ECE 2030" }] },

    {
      name: "Mathematics Elective",
      description: "Choose one: MATH 2220, MATH 2250, MATH 2260, S&DS 2380, S&DS 2410",
      required: 1,
      options: [
        { type: 'course', code: "MATH 2220" },
        { type: 'course', code: "MATH 2250" },
        { type: 'course', code: "MATH 2260" },
        { type: 'course', code: "S&DS 2380" },
        { type: 'course', code: "S&DS 2410" }
      ]
    },

    // --- ELECTIVES ---
    {
      name: "EECS Electives",
      description: "4 electives at 3000+ level: 2 in CPSC and 2 in ECE",
      required: 4,
      options: [
        // CS electives
        ...["CPSC 3270", "CPSC 3380", "CPSC 3650", "CPSC 3660", "CPSC 3700", "CPSC 4130", "CPSC 4150", "CPSC 4190", "CPSC 4200", "CPSC 4210", "CPSC 4230", "CPSC 4240", "CPSC 4261", "CPSC 4270", "CPSC 4301", "CPSC 4320", "CPSC 4330", "CPSC 4350", "CPSC 4370", "CPSC 4380", "CPSC 4390", "CPSC 4391", "CPSC 4410"].map(
          (code): { type: "course"; code: string } => ({ type: "course", code })
        ),
        // ECE electives
        ...["ECE 3101", "ECE 3200", "ECE 3250", "ECE 3481", "ECE 4021", "ECE 4061", "ECE 4201", "ECE 4250", "ECE 4320", "ECE 4500", "ECE 4520", "ECE 4551", "ECE 4680", "ECE 4710", "ECE 4811", "ECE 5021", "ECE 5750", "ECE 7181", "ECE 8061"].map(
          (code): { type: "course"; code: string } => ({ type: "course", code })
        )
      ],
    },

    // --- SENIOR PROJECT ---
    {
      name: "Senior Project",
      required: 1,
      options: [
        { type: 'course', code: "CPSC 4900" },
        { type: 'course', code: "ECE 4710" },
        { type: 'course', code: "ECE 4721" }
      ]
    }
  ]
}

};

type CompletedRequirement = {
  name: string;
  description?: string;
  completed: number;
  required: number;
  satisfied: boolean;
  options: {
    code: string;
    name: string;
    completed: boolean;
    inProgress: boolean;
    required: boolean;
    credits: number;
    skipped?: boolean;
  }[];
};

export type MajorProgress = {
  completedRequirements: CompletedRequirement[];
  inProgressRequirements: CompletedRequirement[];
  remainingRequirements: CompletedRequirement[];
  completedCredits: number;
  inProgressCredits: number;
  remainingCredits: number;
  totalCredits: number;
  percentage: number;
  inProgressPercentage: number;
};

export const calculateMajorProgress = (
  majorId: string,
  completedCourseCodes: string[],
  inProgressCourseCodes: string[] = [],
  skippedCourseCodes: string[] = []
): MajorProgress => {
  const major = MAJORS[majorId];
  if (!major) throw new Error(`Major ${majorId} not found`);

  // Normalize all course codes
  const canonicalCompleted = completedCourseCodes.map(code => getCanonicalCode(code) || code);
  const canonicalInProgress = inProgressCourseCodes.map(code => getCanonicalCode(code) || code);
  const canonicalSkipped = skippedCourseCodes.map(code => getCanonicalCode(code) || code);

  let totalCompletedCredits = 0;
  let totalInProgressCredits = 0;
  const requirementProgress: CompletedRequirement[] = [];

  for (const req of major.requirements) {
    let reqCompleted = 0;
    let reqInProgress = 0;
    const reqOptions: CompletedRequirement['options'] = [];

    for (const option of req.options) {
      if (option.type === 'course') {
        const code = option.code;
        const course = getCourseInfo(code);
        if (!course) continue;

        const completed = canonicalCompleted.includes(code);
        const inProgress = canonicalInProgress.includes(code);
        const skipped = canonicalSkipped.includes(code);

        reqOptions.push({
          code,
          name: course.name,
          completed: completed || skipped,
          inProgress: inProgress && !completed && !skipped,
          required: true,
          credits: course.credits,
          skipped
        });

        if (completed || skipped) {
          reqCompleted += course.credits;
        } else if (inProgress) {
          reqInProgress += course.credits;
        }
      } else if (option.type === 'group') {
        let groupCompleted = 0;
        let groupInProgress = 0;
        let groupCredits = 0;

        option.options.forEach(code => {
          const course = getCourseInfo(code);
          if (!course) return;

          const completed = canonicalCompleted.includes(code);
          const inProgress = canonicalInProgress.includes(code);
          const skipped = canonicalSkipped.includes(code);

          reqOptions.push({
            code,
            name: course.name,
            completed: completed || skipped,
            inProgress: inProgress && !completed && !skipped,
            required: (groupCompleted + groupInProgress) < option.required,
            credits: course.credits,
            skipped
          });

          if ((completed || skipped) && groupCompleted < option.required) {
            groupCompleted++;
            groupCredits += course.credits;
          } else if (inProgress && (groupCompleted + groupInProgress) < option.required) {
            groupInProgress++;
          }
        });

        reqCompleted += groupCredits;
      }
    }

    totalCompletedCredits += reqCompleted;
    totalInProgressCredits += reqInProgress;

    requirementProgress.push({
      name: req.name,
      description: req.description,
      completed: reqCompleted,
      required: req.required,
      satisfied: reqCompleted >= req.required,
      options: reqOptions
    });
  }

  // Categorize requirements
  const completedReqs = requirementProgress.filter(r => r.satisfied);
  const remainingReqs = requirementProgress.filter(r => !r.satisfied);

  // Calculate percentages
  const percentage = Math.min(100, (totalCompletedCredits / major.creditRequirements.total) * 100);
  const inProgressPercentage = Math.min(100, 
    ((totalCompletedCredits + totalInProgressCredits) / major.creditRequirements.total) * 100
  );

  return {
    completedRequirements: completedReqs,
    inProgressRequirements: [], // No longer used - all non-completed go in remaining
    remainingRequirements: remainingReqs,
    completedCredits: totalCompletedCredits,
    inProgressCredits: totalInProgressCredits,
    remainingCredits: Math.max(0, major.creditRequirements.total - totalCompletedCredits - totalInProgressCredits),
    totalCredits: major.creditRequirements.total,
    percentage,
    inProgressPercentage
  };
};