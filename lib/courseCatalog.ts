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
    "MATH 222": { code: "MATH 222", name: "Linear Algebra", credits: 1.0, department: "MATH" },
    "MATH 225": { code: "MATH 225", name: "Differential Equations", credits: 1.0, department: "MATH" },
  
    // ENAS Courses
    "ENAS 130": { code: "ENAS 130", name: "Intro to Engineering", credits: 1.0, department: "ENAS" },
    "ENAS 151": { code: "ENAS 151", name: "Multivariable Calculus", credits: 1.0, department: "ENAS" },
    "ENAS 194": { code: "ENAS 194", name: "Linear Algebra", credits: 1.0, department: "ENAS" },
  
    // PHYS Courses
    "PHYS 165L": { code: "PHYS 165L", name: "Physics Lab I", credits: 0.5, department: "PHYS" },
    "PHYS 166L": { code: "PHYS 166L", name: "Physics Lab II", credits: 0.5, department: "PHYS" },
    "PHYS 180": { code: "PHYS 180", name: "Physics I", credits: 1.0, department: "PHYS" },
    "PHYS 181": { code: "PHYS 181", name: "Physics II", credits: 1.0, department: "PHYS" },
    "PHYS 200": { code: "PHYS 200", name: "Fundamentals Physics I", credits: 1.0, department: "PHYS" },
    "PHYS 201": { code: "PHYS 201", name: "Fundamentals Physics II", credits: 1.0, department: "PHYS" },
    "PHYS 205L": { code: "PHYS 205L", name: "Fundamentals Lab I", credits: 0.5, department: "PHYS" },
    "PHYS 206L": { code: "PHYS 206L", name: "Fundamentals Lab II", credits: 0.5, department: "PHYS" },
  
    // CHEM Courses
    "CHEM 161": { code: "CHEM 161", name: "General Chemistry I", credits: 1.0, department: "CHEM" },
    "CHEM 165": { code: "CHEM 165", name: "Intensive General Chemistry", credits: 1.0, department: "CHEM" },
  
    // ECE Courses
    "ECE 200": { code: "ECE 200", name: "Electrical Engineering", credits: 1.0, department: "ECE" },
  
    // MENG Courses
    "MENG 110": { code: "MENG 110", name: "MechE Design", credits: 1.0, department: "MENG" },
    "MENG 211": { code: "MENG 211", name: "Thermodynamics", credits: 1.0, department: "MENG" },
    "MENG 231": { code: "MENG 231", name: "Mechanics of Materials", credits: 1.0, department: "MENG" },
    "MENG 261": { code: "MENG 261", name: "Dynamics", credits: 1.0, department: "MENG" },
    "MENG 261L": { code: "MENG 261L", name: "Dynamics Lab", credits: 0.5, department: "MENG" },
    "MENG 302L": { code: "MENG 302L", name: "MechE Lab", credits: 0.5, department: "MENG" },
    "MENG 312": { code: "MENG 312", name: "Fluid Mechanics", credits: 1.0, department: "MENG" },
    "MENG 332": { code: "MENG 332", name: "Materials Science", credits: 1.0, department: "MENG" },
    "MENG 342": { code: "MENG 342", name: "Heat Transfer", credits: 1.0, department: "MENG" },
    "MENG 342L": { code: "MENG 342L", name: "Heat Transfer Lab", credits: 0.5, department: "MENG" },
    "MENG 390": { code: "MENG 390", name: "Thermal Systems", credits: 1.0, department: "MENG" },
    "MENG 413L": { code: "MENG 413L", name: "Senior Design I", credits: 1.0, department: "MENG" },
    "MENG 414L": { code: "MENG 414L", name: "Senior Design II", credits: 0.5, department: "MENG" },
    "MENG 491": { code: "MENG 491", name: "Independent Study", credits: 1.0, department: "MENG" },
    "MENG 492": { code: "MENG 492", name: "Independent Study", credits: 1.0, department: "MENG" }
  };
  
  export const getCourseInfo = (code: string): CourseInfo | undefined => {
    return COURSE_CATALOG[code];
  };