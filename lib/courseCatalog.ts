import courses from './courses.json';

export type CourseInfo = {
  codes: string[]; // First code (i.e. codes[0]) is the canonical/default
  name: string;
  credits: number;
  department: string;
  distributionals?: string[];
};

// Create a lookup map from all codes to their canonical course info
const COURSE_CODE_MAP: Record<string, CourseInfo> = {};

(courses as CourseInfo[]).forEach(course => {
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

export const getCourseNameFromCode = (code: string): string | undefined => {
  const course = getCourseInfo(code);
  return course ? course.name : "Course";
}

export const getCourseCreditsFromCode = (code: string): number | undefined => { 
  const course = getCourseInfo(code);
  return course?.credits;
}

export const getCourseDistributionalsFromCode = (code: string): string[] | undefined => {
  const course = getCourseInfo(code);
  return course?.distributionals;
}

//get all OTHER codes for a course (excluding the canonical one)
export const getOtherCodesForCourse = (code: string): string[] => {
  const course = getCourseInfo(code);
  return course ? course.codes.slice(1) : [];
}