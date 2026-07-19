import { Course } from "@/lib/types";
import type { MaybeCreditFields, Semester } from "./simulatorTypes";

export const getCourseCredits = (c: Course & MaybeCreditFields): number => {
  const raw = c.credits ?? c.credit ?? c.units ?? c.yaleCredits ?? c.ECTS;

  const n =
    typeof raw === "string"
      ? parseFloat(raw)
      : typeof raw === "number"
        ? raw
        : NaN;

  return Number.isFinite(n) ? (n as number) : 1; // default to 1 if missing
};

export const getSemesterCredits = (sem: Semester): number =>
  sem.courses.reduce(
    (sum, c) => sum + getCourseCredits(c as Course & MaybeCreditFields),
    0,
  );

export function compareSemesters(a: string, b: string) {
  const [semA, yearA] = a.split(" ");
  const [semB, yearB] = b.split(" ");
  const yA = parseInt(yearA, 10);
  const yB = parseInt(yearB, 10);
  if (yA !== yB) return yA - yB;
  const order: Record<"Spring" | "Fall", number> = { Spring: 0, Fall: 1 };
  return order[semA as "Spring" | "Fall"] - order[semB as "Spring" | "Fall"];
}

export function isPastSemester(semesterName: string) {
  const [sem, yearStr] = semesterName.split(" ");
  const year = parseInt(yearStr, 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0 = Jan

  if (year < currentYear) return true;
  if (year > currentYear) return false;

  // Coarse cutoffs so you can't alter clearly past terms:
  // Fall of current year is editable until January of the next year
  // (at which point year < currentYear catches it)
  // Spring is past once it ends (June+)
  if (sem === "Fall" && currentMonth > 11) return true; // > Dec (never true, handled by next year check)
  if (sem === "Spring" && currentMonth >= 5) return true; // June 1+ (Spring ended)
  return false;
}
