// src/lib/courseCatalog.ts
export type CourseInfo = {
  codes: string[]; // First code is the canonical/default
  name: string;
  credits: number;
  department: string;
};

// Map of course codes to their canonical course info
const COURSES: CourseInfo[] = [
  // MATH Courses
  {
    codes: ["MATH 112"],
    name: "Calculus I",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 115"],
    name: "Calculus II",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 120"],
    name: "Calculus III",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 222"],
    name: "Linear Algebra",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 225"],
    name: "Differential Equations",
    credits: 1.0,
    department: "MATH"
  },

  // ENAS Courses
  {
    codes: ["ENAS 130"],
    name: "Intro to Engineering",
    credits: 1.0,
    department: "ENAS"
  },
  {
    codes: ["ENAS 151"],
    name: "Multivariable Calculus",
    credits: 1.0,
    department: "ENAS"
  },
  {
    codes: ["ENAS 194"],
    name: "Linear Algebra",
    credits: 1.0,
    department: "ENAS"
  },

  // PHYS Courses
  {
    codes: ["PHYS 165L"],
    name: "Physics Lab I",
    credits: 0.5,
    department: "PHYS"
  },
  {
    codes: ["PHYS 166L"],
    name: "Physics Lab II",
    credits: 0.5,
    department: "PHYS"
  },
  {
    codes: ["PHYS 180", "PHYS 1800"], // Multiple codes for same course
    name: "Physics I",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 181"],
    name: "Physics II",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 200"],
    name: "Fundamentals Physics I",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 201"],
    name: "Fundamentals Physics II",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 205L"],
    name: "Fundamentals Lab I",
    credits: 0.5,
    department: "PHYS"
  },
  {
    codes: ["PHYS 206L"],
    name: "Fundamentals Lab II",
    credits: 0.5,
    department: "PHYS"
  },

  // CHEM Courses
  {
    codes: ["CHEM 161"],
    name: "General Chemistry I",
    credits: 1.0,
    department: "CHEM"
  },
  {
    codes: ["CHEM 165"],
    name: "Intensive General Chemistry",
    credits: 1.0,
    department: "CHEM"
  },

  // ECE Courses
  {
    codes: ["ECE 200", "EENG 200"],
    name: "Introduction to Electronics",
    credits: 1.0,
    department: "ECE"
  },

  // MENG Courses
  {
    codes: ["MENG 110"],
    name: "MechE Design",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 211"],
    name: "Thermodynamics",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 231"],
    name: "Mechanics of Materials",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 261"],
    name: "Dynamics",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 261L"],
    name: "Dynamics Lab",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 302L"],
    name: "MechE Lab",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 312"],
    name: "Fluid Mechanics",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 332"],
    name: "Materials Science",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 342"],
    name: "Heat Transfer",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 342L"],
    name: "Heat Transfer Lab",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 390"],
    name: "Thermal Systems",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 413L"],
    name: "Senior Design I",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 414L"],
    name: "Senior Design II",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 491"],
    name: "Independent Study",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 492"],
    name: "Independent Study",
    credits: 1.0,
    department: "MENG"
  }
];

// Create a lookup map from all codes to their canonical course info
const COURSE_CODE_MAP: Record<string, CourseInfo> = {};

COURSES.forEach(course => {
  course.codes.forEach(code => {
    COURSE_CODE_MAP[code] = course;
  });
});

export const getCourseInfo = (code: string): CourseInfo | undefined => {
  return COURSE_CODE_MAP[code];
};

// Get the canonical code (first in array) for a given code
export const getCanonicalCode = (code: string): string | undefined => {
  const course = getCourseInfo(code);
  return course?.codes[0];
};

// Check if a code is valid (exists in our catalog)
export const isValidCourseCode = (code: string): boolean => {
  return code in COURSE_CODE_MAP;
};