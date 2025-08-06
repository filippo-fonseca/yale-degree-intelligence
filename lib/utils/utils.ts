import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { Course } from "../types";
import { getCourseNameFromCode } from "../courseCatalog";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const truncate = (str: string | null, n: number) => {
  return str && str?.length > n ? `${str?.substring(0, n - 1)}...` : str ?? "";
};

export function coursesToPromptString(courses: Course[]): string {
  if (!courses.length) return "No courses available.";

  // You can adjust this line to add/remove fields as needed
  return courses.map((c, i) =>
    `${i + 1}. ${c.code} - ${getCourseNameFromCode(c.code)}${c.credits ? ` (${c.credits} credits)` : ""}${c.grade ? `, Grade: ${c.grade}` : ""}${c.semester ? `, Semester: ${c.semester}` : ""}`
  ).join('\n');
}

export const getGPAColor = (gpa: string) => {
  if (gpa == "A" || gpa == "A-") return "text-emerald-400";
  if (gpa == "B+" || gpa == "B" || gpa == "B-") return "text-amber-400";
  if (gpa == "In Progress") return "text-blue-400";
  return "text-red-400";
};
