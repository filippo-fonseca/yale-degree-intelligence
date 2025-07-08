// src/lib/courseCatalog.ts
export type CourseInfo = {
    code: string;
    name: string;
    credits: number;
    department: string;
  };
  
  export const COURSE_CATALOG: Record<string, CourseInfo> = {
    // MATH Courses
    "MATH 112": { code: "MATH 112", name: "Calculus I", credits: 1.0, department: "MATH" },
    "MATH 115": { code: "MATH 115", name: "Calculus II", credits: 1.0, department: "MATH" },
    "MATH 120": { code: "MATH 120", name: "Calculus III", credits: 1.0, department: "MATH" },
    "MATH 222": { code: "MATH 222", name: "Multivariable Calculus", credits: 1.0, department: "MATH" },
    "MATH 225": { code: "MATH 225", name: "Linear Algebra", credits: 1.0, department: "MATH" },
  
    // ENAS Courses
    "ENAS 151": { code: "ENAS 151", name: "Multivariable Calculus for Engineers", credits: 1.0, department: "ENAS" },
    "ENAS 130": { code: "ENAS 130", name: "Intro to Engineering", credits: 1.0, department: "ENAS" },
    "ENAS 194": { code: "ENAS 194", name: "Linear Algebra for Engineers", credits: 1.0, department: "ENAS" },
  
    // PHYS Courses
    "PHYS 180": { code: "PHYS 180", name: "University Physics (Mechanics)", credits: 1.0, department: "PHYS" },
    "PHYS 181": { code: "PHYS 181", name: "University Physics (EM)", credits: 1.0, department: "PHYS" },
    "PHYS 200": { code: "PHYS 200", name: "Fundamentals of Physics I", credits: 1.0, department: "PHYS" },
    "PHYS 201": { code: "PHYS 201", name: "Fundamentals of Physics II", credits: 1.0, department: "PHYS" },
    "PHYS 165L": { code: "PHYS 165L", name: "Physics Lab I", credits: 0.5, department: "PHYS" },
    "PHYS 166L": { code: "PHYS 166L", name: "Physics Lab II", credits: 0.5, department: "PHYS" },
  
    // CHEM Courses
    "CHEM 161": { code: "CHEM 161", name: "General Chemistry I", credits: 1.0, department: "CHEM" },
    "CHEM 165": { code: "CHEM 165", name: "Intensive General Chemistry", credits: 1.0, department: "CHEM" },
  
    // MENG Courses
    "MENG 110": { code: "MENG 110", name: "Mechanical Engineering Design", credits: 1.0, department: "MENG" },
    "MENG 211": { code: "MENG 211", name: "Thermodynamics", credits: 1.0, department: "MENG" },
    "MENG 280": { code: "MENG 280", name: "Mechanics of Materials", credits: 1.0, department: "MENG" },
    "MENG 285": { code: "MENG 285", name: "Dynamics", credits: 1.0, department: "MENG" },
    "MENG 285L": { code: "MENG 285L", name: "Dynamics Lab", credits: 0.5, department: "MENG" },
    "MENG 320": { code: "MENG 320", name: "Fluid Mechanics", credits: 1.0, department: "MENG" },
    "MENG 370": { code: "MENG 370", name: "Heat Transfer", credits: 1.0, department: "MENG" },
    "MENG 370L": { code: "MENG 370L", name: "Heat Transfer Lab", credits: 0.5, department: "MENG" },
    "MENG 380": { code: "MENG 380", name: "Materials Science", credits: 1.0, department: "MENG" },
    "MENG 390": { code: "MENG 390", name: "Thermal Systems Design", credits: 1.0, department: "MENG" },
    "MENG 400": { code: "MENG 400", name: "Senior Design I", credits: 1.0, department: "MENG" },
    "MENG 401": { code: "MENG 401", name: "Senior Design II", credits: 0.5, department: "MENG" },
    "MENG 491": { code: "MENG 491", name: "Independent Study", credits: 1.0, department: "MENG" },
  
    // ECE Courses
    "ECE 200": { code: "ECE 200", name: "Electrical Engineering Fundamentals", credits: 1.0, department: "ECE" }
  };
  
  export const getCourseInfo = (code: string): CourseInfo | undefined => {
    return COURSE_CATALOG[code];
  };
  
  export const getDepartmentCourses = (department: string): CourseInfo[] => {
    return Object.values(COURSE_CATALOG).filter(
      course => course.department === department
    );
  };