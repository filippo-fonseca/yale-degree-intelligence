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
      // PREREQUISITES
      {
        name: "Calculus I",
        required: 1,
        options: [{ type: 'course', code: "MATH 112" }]
      },
      {
        name: "Calculus II",
        required: 1,
        options: [{ type: 'course', code: "MATH 115" }]
      },
      {
        name: "Calculus III",
        description: "ENAS 151 or MATH 120",
        required: 1,
        options: [
          { type: 'course', code: "ENAS 151" },
          { type: 'course', code: "MATH 120" }
        ]
      },
      {
        name: "Physics Sequence",
        description: "PHYS 180+181 or PHYS 200+201",
        required: 2,
        options: [
          { 
            type: 'group', 
            options: ["PHYS 180", "PHYS 181"], 
            required: 2,
            description: "University Physics sequence"
          },
          { 
            type: 'group', 
            options: ["PHYS 200", "PHYS 201"], 
            required: 2,
            description: "Fundamentals Physics sequence"
          }
        ]
      },
      {
        name: "Physics Labs",
        description: "Two semesters (can mix sequences)",
        required: 2,
        options: [
          { type: 'course', code: "PHYS 165L" },
          { type: 'course', code: "PHYS 166L" },
          { type: 'course', code: "PHYS 205L" },
          { type: 'course', code: "PHYS 206L" }
        ]
      },
      {
        name: "Chemistry",
        description: "One introductory chemistry course",
        required: 1,
        options: [
          { type: 'course', code: "CHEM 161" },
          { type: 'course', code: "CHEM 165" }
        ]
      },

      // CORE REQUIREMENTS
      {
        name: "Intro to Engineering",
        required: 1,
        options: [{ type: 'course', code: "ENAS 130" }]
      },
      {
        name: "Linear Algebra",
        description: "ENAS 194 or MATH 222",
        required: 1,
        options: [
          { type: 'course', code: "ENAS 194" },
          { type: 'course', code: "MATH 222" }
        ]
      },
      {
        name: "Electrical Engineering",
        required: 1,
        options: [{ type: 'course', code: "ECE 200" }]
      },
      {
        name: "Differential Equations",
        required: 1,
        options: [{ type: 'course', code: "ENAS 194" }]
      },
      {
        name: "Mechanical Engineering Design",
        required: 1,
        options: [{ type: 'course', code: "MENG 110" }]
      },
      {
        name: "Thermodynamics",
        required: 1,
        options: [{ type: 'course', code: "MENG 211" }]
      },
      {
        name: "Mechanics of Materials",
        required: 1,
        options: [{ type: 'course', code: "MENG 231" }]
      },
      {
        name: "Dynamics",
        required: 1,
        options: [{ type: 'course', code: "MENG 261" }]
      },
      {
        name: "Dynamics Lab",
        required: 1,
        options: [{ type: 'course', code: "MENG 261L" }]
      },
      {
        name: "Fluid Mechanics",
        required: 1,
        options: [{ type: 'course', code: "MENG 312" }]
      },
      {
        name: "Heat Transfer",
        required: 1,
        options: [{ type: 'course', code: "MENG 342" }]
      },
      {
        name: "Heat Transfer Lab",
        required: 1,
        options: [{ type: 'course', code: "MENG 342L" }]
      },
      {
        name: "Materials Science",
        required: 1,
        options: [{ type: 'course', code: "MENG 332" }]
      },
      {
        name: "Thermal Systems",
        required: 1,
        options: [{ type: 'course', code: "MENG 390" }]
      },
      {
        name: "Mechanical Engineering Lab",
        required: 1,
        options: [{ type: 'course', code: "MENG 302L" }]
      },
      {
        name: "Technical Electives",
        description: "3 required (max 1 independent study)",
        required: 3,
        options: [
          { type: 'course', code: "MENG 491" },
          { type: 'course', code: "MENG 492" }
          // Would add more electives here
        ]
      },
      {
        name: "Senior Design I",
        required: 1,
        options: [{ type: 'course', code: "MENG 413L" }]
      },
      {
        name: "Senior Design II",
        required: 1,
        options: [{ type: 'course', code: "MENG 414L" }]
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