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
import {
  resolveCanonicalCode,
} from "@/lib/courseCatalog";
import { db } from "@/config/firebase";
import { syncFriendsPublicData } from "@/lib/syncFriendsPublicData";
import { toggleDistributionalTag } from "@/lib/distributionalTags";
import { distributionalEditBase } from "@/lib/utils/effectiveDistributionals";
import type { UserProfile } from "./types";

const VALID_DIST_TAGS = new Set([
  "Hu",
  "So",
  "Sc",
  "QR",
  "WR",
  "L1",
  "L2",
  "L3",
  "L4",
  "L5",
]);

/** Parse optional `[Hu, WR]` suffix from an extracted course line. */
function parseDistributionalsFromBracket(
  raw: string | undefined,
): string[] | undefined {
  if (raw === undefined) return undefined;
  const tags = raw
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => VALID_DIST_TAGS.has(tag));
  return tags;
}

/**
 * What an imported course stores for distributionals.
 *
 * Only real tags are written down. An empty bracket is silence, not a
 * statement: the extraction prompt itself treats "omit the brackets entirely
 * or use []" as the same instruction, so storing [] would freeze the course at
 * "no distributionals" and lock out the catalog's own tags. Leaving the field
 * off lets the course pick them up, and the student can still override.
 */
function distributionalFields(
  raw: string | undefined,
): Pick<Course, "distributionals"> | Record<string, never> {
  const distributionals = parseDistributionalsFromBracket(raw);
  if (!distributionals || distributionals.length === 0) return {};
  return { distributionals };
}

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
        const codeKey = resolveCanonicalCode(course.code);
        const key = `${course.semester}-${course.year}-${codeKey}-${
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
      const canonicalCode = resolveCanonicalCode(data.code);
      const key = `${data.semester}-${data.year}-${canonicalCode}`;
      existingCoursesMap.set(key, {
        docId: docSnap.id,
        grade: data.grade || null,
      });
    });

    const findExistingCourse = (semester: string, year: string, code: string) => {
      const canonicalCode = resolveCanonicalCode(code);
      return (
        existingCoursesMap.get(`${semester}-${year}-${canonicalCode}`) ??
        existingCoursesMap.get(`${semester}-${year}-${code.trim()}`)
      );
    };

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
          /^- (.+?): (.+?) — (.+?) \((\d+\.\d+)\)(?: \[(.*?)\])?$/,
        );
        if (completedMatch) {
          const [, rawCode, , grade, credits, distRaw] = completedMatch;
          const canonicalCode = resolveCanonicalCode(rawCode.trim());
          const courseKey = `${season.trim()}-${year.trim()}-${canonicalCode}-${grade.trim()}`;

          if (seenInThisParse.has(courseKey)) continue;
          seenInThisParse.add(courseKey);

          const existingCourse = findExistingCourse(
            season.trim(),
            year.trim(),
            rawCode.trim(),
          );
          if (existingCourse) {
            if (existingCourse.grade !== grade.trim()) {
              await deleteDoc(doc(db, "courses", existingCourse.docId));
            } else {
              continue;
            }
          }

          coursesToAdd.push({
            code: canonicalCode,
            grade: grade.trim(),
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status:
              grade.trim() === "In Progress" ? "in-progress" : "completed",
            credits: parseFloat(credits),
            ...distributionalFields(distRaw),
          });
          continue;
        }

        const inProgressMatch = line.match(
          /^- (.+?): (.+?) — (?:In Progress|IP) \((\d+\.\d+)\)(?: \[(.*?)\])?$/,
        );
        if (inProgressMatch) {
          const [, rawCode, , credits, distRaw] = inProgressMatch;
          const canonicalCode = resolveCanonicalCode(rawCode.trim());
          const courseKey = `${season.trim()}-${year.trim()}-${canonicalCode}-null`;

          if (seenInThisParse.has(courseKey)) continue;
          seenInThisParse.add(courseKey);

          const existingCourse = findExistingCourse(
            season.trim(),
            year.trim(),
            rawCode.trim(),
          );
          if (existingCourse) {
            if (existingCourse.grade !== null) {
              await deleteDoc(doc(db, "courses", existingCourse.docId));
            } else {
              continue;
            }
          }

          coursesToAdd.push({
            code: canonicalCode,
            grade: null,
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "in-progress",
            credits: parseFloat(credits),
            ...distributionalFields(distRaw),
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
    // Editing materializes: a course that was still riding the catalog's tags
    // gets them written down first, so removing one keeps the others and the
    // removal survives the next reload.
    const updated = toggleDistributionalTag(
      distributionalEditBase(course),
      dist,
    );
    const stored = course.distributionals;
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
          c.id === courseId ? { ...c, distributionals: stored } : c,
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
