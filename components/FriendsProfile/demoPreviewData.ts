import { Course } from "@/lib/types";

/** Demo data for the Friends tab “what your page could look like” preview. */
export const DEMO_PREVIEW_USER = {
  displayName: "Emir Ahmed",
  // EECS, so the major matches what the bio says. The id is the one in
  // lib/data/all_reqs.json; a code the catalog does not know would render as
  // a bare string on the example page.
  majors: ["EECS"],
  graduationYear: 2027,
  bio: "EECS major interested in robotics.",
};

export const DEMO_PREVIEW_COURSES: Course[] = [
  {
    id: "demo-1",
    code: "CPSC 201",
    grade: null,
    semester: "Fall",
    year: 2024,
    userId: "demo",
    status: "completed",
    credits: 1,
    distributionals: ["QR"],
  },
  {
    id: "demo-2",
    code: "ECON 115",
    grade: null,
    semester: "Spring",
    year: 2025,
    userId: "demo",
    status: "completed",
    credits: 1,
    distributionals: ["So"],
  },
  {
    id: "demo-3",
    code: "PHIL 115",
    grade: null,
    semester: "Fall",
    year: 2025,
    userId: "demo",
    status: "in-progress",
    credits: 1,
    distributionals: ["Hu"],
  },
];
