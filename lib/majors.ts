// src/lib/majors.ts
import { CourseInfo, getCourseInfo } from "./courseCatalog";

export type MajorRequirement = {
  id: string;
  name: string;
  description: string;
  coreCourses: string[]; // Required course codes
  creditRequirements: {
    total: number;
    core: number;
    electives: number;
    other?: number;
  };
  electiveOptions?: {
    name: string;
    required: number; // Number needed
    courses: string[]; // Allowed course codes
  }[];
  otherRequirements?: {
    name: string;
    description: string;
    required: number;
    options: string[]; // Course codes or other options
  }[];
};

export const MAJORS: Record<string, MajorRequirement> = {
  "MENG": {
    id: "MENG",
    name: "Mechanical Engineering (ABET)",
    description: "Bachelor of Science in Mechanical Engineering",
    coreCourses: [
      "MATH 112", "MATH 115", "ENAS 151",
      "PHYS 180", "PHYS 181",
      "ENAS 130", "ENAS 194", "ECE 200",
      "MENG 110", "MENG 211", "MENG 280",
      "MENG 285", "MENG 285L", "MENG 320",
      "MENG 370", "MENG 370L", "MENG 380",
      "MENG 390", "MENG 400", "MENG 401"
    ],
    creditRequirements: {
      total: 36,
      core: 30,
      electives: 6
    },
    electiveOptions: [
      {
        name: "Technical Electives",
        required: 3,
        courses: [
          "MENG 491", 
          // Add more elective options here
        ]
      }
    ],
    otherRequirements: [
      {
        name: "Physics Labs",
        description: "Two semesters of physics lab",
        required: 2,
        options: ["PHYS 165L", "PHYS 166L"]
      },
      {
        name: "Chemistry",
        description: "Introductory chemistry course",
        required: 1,
        options: ["CHEM 161", "CHEM 165"]
      }
    ]
  }
};

export type MajorProgress = {
  completedCore: string[];
  remainingCore: string[];
  completedElectives: string[];
  completedCredits: number;
  totalCredits: number;
  electiveProgress: {
    name: string;
    completed: number;
    required: number;
    courses: {
      code: string;
      completed: boolean;
    }[];
  }[];
  otherRequirementsProgress: {
    name: string;
    description: string;
    completed: number;
    required: number;
    options: {
      code: string;
      completed: boolean;
    }[];
  }[];
  percentage: number;
};

export const calculateMajorProgress = (
  majorId: string,
  completedCourses: string[]
): MajorProgress => {
  const major = MAJORS[majorId];
  if (!major) throw new Error(`Major ${majorId} not found`);

  // Calculate core course progress
  const completedCore = major.coreCourses.filter(code => 
    completedCourses.includes(code)
  );
  const remainingCore = major.coreCourses.filter(code => 
    !completedCourses.includes(code)
  );

  // Calculate elective progress
  const electiveProgress = major.electiveOptions?.map(elective => {
    const completed = elective.courses
      .filter(code => completedCourses.includes(code))
      .slice(0, elective.required); // Only count up to required number

    return {
      name: elective.name,
      completed: completed.length,
      required: elective.required,
      courses: elective.courses.map(code => ({
        code,
        completed: completedCourses.includes(code)
      }))
    };
  }) || [];

  // Calculate other requirements progress
  const otherRequirementsProgress = major.otherRequirements?.map(req => {
    const completed = req.options
      .filter(option => completedCourses.includes(option))
      .slice(0, req.required);

    return {
      name: req.name,
      description: req.description,
      completed: completed.length,
      required: req.required,
      options: req.options.map(option => ({
        code: option,
        completed: completedCourses.includes(option)
      }))
    };
  }) || [];

  // Calculate completed credits
  let completedCredits = 0;

  // Core courses
  completedCore.forEach(code => {
    const course = getCourseInfo(code);
    completedCredits += course?.credits || 0;
  });

  // Electives
  electiveProgress.forEach(elective => {
    elective.courses
      .filter(c => c.completed)
      .slice(0, elective.required)
      .forEach(course => {
        const info = getCourseInfo(course.code);
        completedCredits += info?.credits || 0;
      });
  });

  // Other requirements
  otherRequirementsProgress.forEach(req => {
    req.options
      .filter(o => o.completed)
      .slice(0, req.required)
      .forEach(option => {
        const info = getCourseInfo(option.code);
        completedCredits += info?.credits || 0;
      });
  });

  return {
    completedCore,
    remainingCore,
    completedElectives: electiveProgress.flatMap(e => 
      e.courses.filter(c => c.completed).map(c => c.code)
    ),
    completedCredits,
    totalCredits: major.creditRequirements.total,
    electiveProgress,
    otherRequirementsProgress,
    percentage: Math.min(
      100,
      (completedCredits / major.creditRequirements.total) * 100
    )
  };
};