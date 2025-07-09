// src/lib/majors.ts
import { CourseInfo, getCourseInfo, getCanonicalCode, isValidCourseCode } from "./courseCatalog";

type RequirementOption = {
  type: 'course';
  code: string; // This should be the canonical code
} | {
  type: 'group';
  options: string[]; // These should be canonical codes
  required: number;
  description?: string;
};

type MajorRequirement = {
  id: string;
  //CRUCIALLY: this "name" allows a shorter, human-readable identifier that the student can refer to "like - "CHEMISTRY REQUIREMENT", "Thermo", etc."
  //we will have to do this for all majors (manually), but that's okay. 
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
    total: 36,
    core: 30,
    electives: 6
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
      required: 2,
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
      options: [{ type: 'course', code: "CHEM 1610" }]
    },

    // --- CORE REQUIREMENTS ---
    { name: "Intro to Engineering", required: 1, options: [{ type: 'course', code: "ENAS 1300" }] },
    { name: "Linear Algebra", required: 1, options: [{ type: 'course', code: "ENAS 1940" }, { type: 'course', code: "MATH 2220" }] },
    { name: "Electrical Engineering", required: 1, options: [{ type: 'course', code: "ECE 2000" }] },
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
    required: boolean;
    credits: number;
  }[];
};

export type MajorProgress = {
  completedRequirements: CompletedRequirement[];
  remainingRequirements: CompletedRequirement[];
  completedCredits: number;
  totalCredits: number;
  percentage: number;
};

export const calculateMajorProgress = (
  majorId: string,
  completedCourseCodes: string[]
): MajorProgress => {
  const major = MAJORS[majorId];
  if (!major) throw new Error(`Major ${majorId} not found`);

  // Convert all completed codes to their canonical versions
  const canonicalCompletedCodes = completedCourseCodes.map(code => 
    getCanonicalCode(code) || code
  ).filter(code => isValidCourseCode(code));

  let completedCredits = 0;
  const requirementProgress: CompletedRequirement[] = [];

  for (const req of major.requirements) {
    let reqCompleted = 0;
    const reqOptions: CompletedRequirement['options'] = [];

    for (const option of req.options) {
      if (option.type === 'course') {
        const completed = canonicalCompletedCodes.includes(option.code);
        const course = getCourseInfo(option.code);
        
        if (completed) reqCompleted++;
        
        reqOptions.push({
          code: option.code,
          name: course?.name || option.code,
          completed,
          required: reqCompleted < req.required,
          credits: course?.credits || 0
        });
      } 
      else if (option.type === 'group') {
        const groupCompleted = option.options
          .filter(code => canonicalCompletedCodes.includes(code))
          .slice(0, option.required)
          .length;

        reqCompleted += groupCompleted;

        option.options.forEach(code => {
          const completed = canonicalCompletedCodes.includes(code);
          const course = getCourseInfo(code);
          
          reqOptions.push({
            code,
            name: course?.name || code,
            completed,
            required: reqCompleted < req.required && 
                     groupCompleted < option.required,
            credits: course?.credits || 0
          });
        });
      }
    }

    // Add credits for completed courses (only up to required number)
    reqOptions
      .filter(opt => opt.completed)
      .slice(0, req.required)
      .forEach(opt => {
        completedCredits += opt.credits;
      });

    requirementProgress.push({
      name: req.name,
      description: req.description,
      completed: Math.min(reqCompleted, req.required),
      required: req.required,
      satisfied: reqCompleted >= req.required,
      options: reqOptions
    });
  }

  return {
    completedRequirements: requirementProgress.filter(r => r.satisfied),
    remainingRequirements: requirementProgress.filter(r => !r.satisfied),
    completedCredits,
    totalCredits: major.creditRequirements.total,
    percentage: Math.min(100, (completedCredits / major.creditRequirements.total) * 100)
  };
};