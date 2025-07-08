// src/lib/courseOperations.ts

import { db } from "@/config/firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { getCourseInfo } from "../courseCatalog";

export async function skipCourse(
  userId: string,
  courseCode: string,
  courseName: string
): Promise<void> {
  const courseInfo = getCourseInfo(courseCode);
  const courseRef = doc(db, "courses", `${userId}_${courseCode}`);
  await setDoc(courseRef, {
    code: courseCode,
    name: courseName,
    grade: null,
    semester: "Skipped",
    year: new Date().getFullYear(),
    userId: userId,
    status: "completed",
    credits: courseInfo?.credits || 0,
    skipped: true,
  });
}

export async function unskipCourse(
  userId: string,
  courseCode: string
): Promise<void> {
  const courseRef = doc(db, "courses", `${userId}_${courseCode}`);
  await deleteDoc(courseRef);
}