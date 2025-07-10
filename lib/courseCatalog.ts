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
    codes: ["MATH 1120", "MATH 112"],
    name: "Calculus I",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 1150", "MATH 115"],
    name: "Calculus II",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 1200", "MATH 120"],
    name: "Calculus III",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 2220", "MATH 222"],
    name: "Linear Algebra",
    credits: 1.0,
    department: "MATH"
  },
  {
    codes: ["MATH 2250", "MATH 225"],
    name: "Differential Equations",
    credits: 1.0,
    department: "MATH"
  },

  // ENAS Courses
  {
    codes: ["ENAS 1300", "ENAS 130"],
    name: "Intro to Engineering",
    credits: 1.0,
    department: "ENAS"
  },
  {
    codes: ["ENAS 1510", "ENAS 151"],
    name: "Multivariable Calculus for Engineers",
    credits: 1.0,
    department: "ENAS"
  },
  {
    codes: ["ENAS 1940", "ENAS 194"],
    name: "Linear Algebra and Matrix Theory",
    credits: 1.0,
    department: "ENAS"
  },

  // PHYS Courses
  {
    codes: ["PHYS 1800", "PHYS 180"],
    name: "Physics I: Mechanics",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 1810", "PHYS 181"],
    name: "Physics II: Electricity, Magnetism, & Waves",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 2000", "PHYS 200"],
    name: "Fundamentals of Physics I",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 2010", "PHYS 201"],
    name: "Fundamentals of Physics II",
    credits: 1.0,
    department: "PHYS"
  },
  {
    codes: ["PHYS 1650L", "PHYS 165L"],
    name: "Introductory Physics Lab I",
    credits: 0.5,
    department: "PHYS"
  },
  {
    codes: ["PHYS 1660L", "PHYS 166L"],
    name: "Introductory Physics Lab II",
    credits: 0.5,
    department: "PHYS"
  },
  {
    codes: ["PHYS 2050L", "PHYS 205L"],
    name: "Fundamentals of Physics Lab I",
    credits: 0.5,
    department: "PHYS"
  },
  {
    codes: ["PHYS 2060L", "PHYS 206L"],
    name: "Fundamentals of Physics Lab II",
    credits: 0.5,
    department: "PHYS"
  },

  // CHEM Courses
  {
    codes: ["CHEM 1610", "CHEM 161"],
    name: "General Chemistry I",
    credits: 1.0,
    department: "CHEM"
  },
  {
    codes: ["CHEM 1650", "CHEM 165"],
    name: "Intensive General Chemistry",
    credits: 1.0,
    department: "CHEM"
  },

  // ECE Courses
  {
    codes: ["ECE 2000", "EENG 200", "ECE 200"],
    name: "Introduction to Electronics",
    credits: 1.0,
    department: "ECE"
  },

  // MENG Courses (renamed with canonical codes)
  {
    codes: ["MENG 1105", "MENG 110"],
    name: "Mechanical Design",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 2511", "MENG 211"],
    name: "Thermodynamics for Mechanical Engineers",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 2311", "MENG 280"],
    name: "Strength and Deformation of Mechanical Elements",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 2615", "MENG 285"],
    name: "Introduction to Materials Science",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 2616L", "MENG 286L"],
    name: "Solid Mechanics and Materials Science Laboratory",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 3020L", "MENG 302L"],
    name: "Mechatronics Laboratory",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 3125", "MENG 325"],
    name: "Machine Elements and Manufacturing Processes",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 3323", "MENG 332"],
    name: "Mechanical Engineering III: Dynamics",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 3422", "MENG 342"],
    name: "Mechanical Engineering II: Fluid Mechanics",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 3423L", "MENG 342L"],
    name: "Fluid Mechanics and Thermodynamics Laboratory",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 3424", "MENG 390"],
    name: "Mechanical Engineering IV: Fluid and Thermal Energy Science",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 4137L", "MENG 413L"],
    name: "Mechanical Design: Process and Implementation I",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 4138L", "MENG 414L"],
    name: "Mechanical Design: Process and Implementation II",
    credits: 0.5,
    department: "MENG"
  },
  {
    codes: ["MENG 4991"],
    name: "Special Projects I",
    credits: 1.0,
    department: "MENG"
  },
  {
    codes: ["MENG 4992"],
    name: "Special Projects II",
    credits: 1.0,
    department: "MENG"
  },
  // CPSC Courses (EECS relevant ones)
{
  codes: ["CPSC 1001", "CPSC 100"],
  name: "Introduction to Programming",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 2010", "CPSC 201"],
  name: "Introduction to Computer Science",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 2020", "CPSC 202"],
  name: "Mathematical Tools for Computer Science",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 2230", "CPSC 223"],
  name: "Data Structures and Programming Techniques",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 3230", "CPSC 323"],
  name: "Introduction to Systems Programming and Computer Organization",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 3650", "CPSC 365"],
  name: "Algorithms",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 3660"],
  name: "Intensive Algorithms",
  credits: 1.0,
  department: "CPSC"
},
{
  codes: ["CPSC 4900", "CPSC 490"],
  name: "Senior Project",
  credits: 1.0,
  department: "CPSC"
},

// ECE Courses (renamed from EENG)
{
  codes: ["ECE 2000", "EENG 200"],
  name: "Introduction to Electronics",
  credits: 1.0,
  department: "ECE"
},
{
  codes: ["ECE 2010", "EENG 201"],
  name: "Introduction to Computer Engineering",
  credits: 1.0,
  department: "ECE"
},
{
  codes: ["ECE 2020", "EENG 202"],
  name: "Introduction to Communications and Control",
  credits: 1.0,
  department: "ECE"
},
{
  codes: ["ECE 2030", "EENG 203"],
  name: "Circuits and Systems Design",
  credits: 1.0,
  department: "ECE"
},
{
  codes: ["ECE 4710", "EENG 471"],
  name: "Senior Advanced Special Projects I",
  credits: 1.0,
  department: "ECE"
},
{
  codes: ["ECE 4721", "EENG 472"],
  name: "Senior Advanced Special Projects II",
  credits: 1.0,
  department: "ECE"
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