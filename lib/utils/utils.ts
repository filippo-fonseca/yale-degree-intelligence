import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Course } from "../types";
import { getCourseNameFromCode } from "../courseCatalog";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function coursesToPromptString(courses: Course[]): string {
  if (!courses.length) return "No courses available.";

  // You can adjust this line to add/remove fields as needed
  return courses.map((c, i) =>
    `${i + 1}. ${c.code} - ${getCourseNameFromCode(c.code)}${c.credits ? ` (${c.credits} credits)` : ""}${c.grade ? `, Grade: ${c.grade}` : ""}${c.semester ? `, Semester: ${c.semester}` : ""}`
  ).join('\n');
}
