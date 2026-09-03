"use client";

import type { User } from "firebase/auth";
import { motion } from "framer-motion";
import { doc, deleteDoc } from "firebase/firestore";
import { db } from "@/config/firebase";
import { Course } from "@/lib/types";
import { MyCoursesView } from "./dynamicTabs";

interface UploadTabPanelProps {
  user: User;
  courses: Course[];
  hasData: boolean;
  coursesLoading: boolean;
  isBrandNew: boolean;
  onManualAdd: (semester?: string) => void;
  onReupload: () => void;
  onUploadSuccess: (extractedText: string) => Promise<void>;
  fetchCourses: () => Promise<void>;
  updateCourse: (
    courseId: string,
    updates: Partial<Omit<Course, "id" | "userId">>,
  ) => Promise<void>;
  toggleDistributional: (courseId: string, dist: string) => Promise<void>;
  onOpenSimulator?: () => void;
}

export function UploadTabPanel({
  user,
  courses,
  hasData,
  coursesLoading,
  isBrandNew,
  onManualAdd,
  onReupload,
  onUploadSuccess,
  fetchCourses,
  updateCourse,
  toggleDistributional,
  onOpenSimulator,
}: UploadTabPanelProps) {
  return (
    <motion.div
      key="upload"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <MyCoursesView
        courses={courses}
        hasData={hasData}
        coursesLoading={coursesLoading}
        user={user}
        isBrandNew={isBrandNew}
        onManualAdd={onManualAdd}
        onReupload={onReupload}
        onUploadSuccess={onUploadSuccess}
        onDeleteCourse={async (course) => {
          if (!user || !course?.id) return;
          await deleteDoc(doc(db, "courses", course.id));
          await fetchCourses();
        }}
        onUpdateCourse={updateCourse}
        onToggleDistributional={async (courseId, dist) => {
          await toggleDistributional(courseId, dist);
        }}
        onOpenSimulator={onOpenSimulator}
      />
    </motion.div>
  );
}
