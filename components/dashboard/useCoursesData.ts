import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  writeBatch,
  deleteDoc,
} from "firebase/firestore";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";
import { syncFriendsPublicData } from "@/lib/syncFriendsPublicData";
import { toggleDistributionalTag } from "@/lib/distributionalTags";
import type { UserProfile } from "./types";

interface UseCoursesDataOptions {
  user: User | null;
  getFriendsEnabled: () => boolean;
  userProfile: UserProfile | null;
  showUpdateModal: boolean;
  setShowUpdateModal: (open: boolean) => void;
  setShowManualEntryModal: (open: boolean) => void;
}

export function useCoursesData({
  user,
  getFriendsEnabled,
  userProfile,
  showUpdateModal,
  setShowUpdateModal,
  setShowManualEntryModal,
}: UseCoursesDataOptions) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCoursesLoading(false);
      setCourses([]);
      setHasData(false);
    }
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;

    try {
      const q = query(
        collection(db, "courses"),
        where("userId", "==", user.uid),
      );
      const querySnapshot = await getDocs(q);
      const coursesData: Course[] = [];

      querySnapshot.forEach((docSnap) => {
        coursesData.push({ id: docSnap.id, ...docSnap.data() } as Course);
      });

      setCourses((prevCourses) => {
        if (JSON.stringify(prevCourses) !== JSON.stringify(coursesData)) {
          return coursesData;
        }
        return prevCourses;
      });

      setHasData(coursesData.length > 0);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setCoursesLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const syncFriendsIfEnabled = async () => {
    if (!user || !getFriendsEnabled()) return;
    const q = query(
      collection(db, "courses"),
      where("userId", "==", user.uid),
    );
    const snap = await getDocs(q);
    const freshCourses = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Course[];
    await syncFriendsPublicData(user.uid, freshCourses, userProfile, {
      displayName: user.displayName,
      email: user.email,
      photoURL: user.photoURL,
    });
  };

  const checkAndRemoveDuplicates = async (userId: string) => {
    if (!userId) return;

    try {
      const q = query(collection(db, "courses"), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);

      const coursesMap = new Map<string, { id: string; count: number }>();

      querySnapshot.forEach((docSnap) => {
        const course = docSnap.data() as Course;
        const key = `${course.semester}-${course.year}-${course.code}-${
          course.grade || "null"
        }`;

        if (coursesMap.has(key)) {
          const existing = coursesMap.get(key)!;
          coursesMap.set(key, { ...existing, count: existing.count + 1 });
        } else {
          coursesMap.set(key, { id: docSnap.id, count: 1 });
        }
      });

      const batch = writeBatch(db);
      let duplicatesFound = 0;

      coursesMap.forEach((value) => {
        if (value.count > 1) {
          batch.delete(doc(db, "courses", value.id));
          duplicatesFound++;
        }
      });

      if (duplicatesFound > 0) {
        await batch.commit();
      }

      return duplicatesFound;
    } catch (error) {
      console.error("Error checking for duplicates:", error);
      throw error;
    }
  };

  const parseAndStoreCourses = async (extractedText: string) => {
    if (!user) return;

    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid),
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);

    const existingCoursesMap = new Map<
      string,
      { docId: string; grade: string | null }
    >();
    existingSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const key = `${data.semester}-${data.year}-${data.code}`;
      existingCoursesMap.set(key, {
        docId: docSnap.id,
        grade: data.grade || null,
      });
    });

    const semesterBlocks = extractedText
      .split("Semester: ")
      .filter((block) => block.trim() !== "");
    const coursesToAdd: Omit<Course, "id">[] = [];

    const seenInThisParse = new Set<string>();

    for (const block of semesterBlocks) {
      const [semesterInfo, ...courseLines] = block.split("\n");
      const [season, year] = semesterInfo.split(" ");

      for (const line of courseLines) {
        if (line.trim() === "") continue;

        const completedMatch = line.match(
          /^- (.+?): (.+?) — (.+?) \((\d+\.\d+)\)$/,
        );
        if (completedMatch) {
          const [, code, , grade, credits] = completedMatch;
          const key = `${season.trim()}-${year.trim()}-${code.trim()}`;
          const courseKey = `${key}-${grade.trim()}`;

          if (seenInThisParse.has(courseKey)) continue;
          seenInThisParse.add(courseKey);

          const existingCourse = existingCoursesMap.get(key);
          if (existingCourse) {
            if (existingCourse.grade !== grade.trim()) {
              await deleteDoc(doc(db, "courses", existingCourse.docId));
            } else {
              continue;
            }
          }

          coursesToAdd.push({
            code: code.trim(),
            grade: grade.trim(),
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status:
              grade.trim() === "In Progress" ? "in-progress" : "completed",
            credits: parseFloat(credits),
          });
          continue;
        }

        const inProgressMatch = line.match(
          /^- (.+?): (.+?) — (?:In Progress|IP) \((\d+\.\d+)\)$/,
        );
        if (inProgressMatch) {
          const [, code, , credits] = inProgressMatch;
          const key = `${season.trim()}-${year.trim()}-${code.trim()}`;
          const courseKey = `${key}-null`;

          if (seenInThisParse.has(courseKey)) continue;
          seenInThisParse.add(courseKey);

          const existingCourse = existingCoursesMap.get(key);
          if (existingCourse) {
            if (existingCourse.grade !== null) {
              await deleteDoc(doc(db, "courses", existingCourse.docId));
            } else {
              continue;
            }
          }

          coursesToAdd.push({
            code: code.trim(),
            grade: null,
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "in-progress",
            credits: parseFloat(credits),
          });
        }
      }
    }

    if (coursesToAdd.length > 0) {
      const batchWrites = coursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });
      await Promise.all(batchWrites);
    }

    await fetchCourses();

    try {
      await checkAndRemoveDuplicates(user.uid);
      await fetchCourses();
    } catch (error) {
      console.error("Error during duplicate check:", error);
    }

    await syncFriendsIfEnabled();

    if (showUpdateModal) setShowUpdateModal(false);
  };

  const handleManualCourseEntry = async (
    coursesToAdd: Omit<Course, "id">[],
  ) => {
    if (!user) return;

    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid),
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);

    const existingCoursesMap = new Map<
      string,
      { docId: string; grade: string | null }
    >();
    existingSnapshot.docs.forEach((docSnap) => {
      const data = docSnap.data();
      const key = `${data.semester}-${data.year}-${data.code}`;
      existingCoursesMap.set(key, {
        docId: docSnap.id,
        grade: data.grade || null,
      });
    });

    const newCoursesToAdd: Omit<Course, "id">[] = [];

    for (const course of coursesToAdd) {
      const key = `${course.semester}-${course.year}-${course.code}`;
      const existingCourse = existingCoursesMap.get(key);

      if (existingCourse) {
        if (existingCourse.grade !== course.grade) {
          await deleteDoc(doc(db, "courses", existingCourse.docId));
          newCoursesToAdd.push(course);
        }
      } else {
        newCoursesToAdd.push(course);
      }
    }

    if (newCoursesToAdd.length > 0) {
      const batchWrites = newCoursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });
      await Promise.all(batchWrites);
    }

    await fetchCourses();

    try {
      await checkAndRemoveDuplicates(user.uid);
      await fetchCourses();
    } catch (error) {
      console.error("Error during duplicate check:", error);
    }

    await syncFriendsIfEnabled();

    setShowManualEntryModal(false);
  };

  const toggleDistributional = async (courseId: string, dist: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;
    const current = course.distributionals || [];
    const updated = toggleDistributionalTag(current, dist);
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId ? { ...c, distributionals: updated } : c,
      ),
    );
    try {
      await updateDoc(doc(db, "courses", courseId), {
        distributionals: updated,
      });
    } catch (error) {
      console.error("Error updating distributionals:", error);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId ? { ...c, distributionals: current } : c,
        ),
      );
    }
  };

  return {
    courses,
    setCourses,
    hasData,
    coursesLoading,
    fetchCourses,
    parseAndStoreCourses,
    handleManualCourseEntry,
    toggleDistributional,
  };
}
