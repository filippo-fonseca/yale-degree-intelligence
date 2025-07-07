"use client";

import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import FileUpload from "@/components/file-upload";
import { useEffect, useState } from "react";
import { FiUpload, FiSettings, FiLogOut } from "react-icons/fi";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc,
} from "firebase/firestore";
import { Course } from "@/lib/types";
import { db } from "@/config/firebase";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  const fetchCourses = async () => {
    if (!user) return;

    const q = query(collection(db, "courses"), where("userId", "==", user.uid));
    const querySnapshot = await getDocs(q);
    const coursesData: Course[] = [];

    querySnapshot.forEach((doc) => {
      coursesData.push({ id: doc.id, ...doc.data() } as Course);
    });

    setCourses(coursesData);
    setHasData(coursesData.length > 0);
  };

  const parseAndStoreCourses = async (extractedText: string) => {
    if (!user) return;

    // Clear existing courses for this user to prevent duplicates
    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid)
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);

    // Delete existing courses if needed (or skip if they exist)
    // const deletePromises = existingSnapshot.docs.map(doc => deleteDoc(doc.ref));
    // await Promise.all(deletePromises);

    const semesterBlocks = extractedText
      .split("Semester: ")
      .filter((block) => block.trim() !== "");
    const coursesToAdd: Omit<Course, "id">[] = [];

    // Track seen courses to prevent duplicates in the same parse
    const seenCourses = new Set<string>();

    for (const block of semesterBlocks) {
      const [semesterInfo, ...courseLines] = block.split("\n");
      const [season, year] = semesterInfo.split(" ");

      for (const line of courseLines) {
        if (line.trim() === "") continue;

        // Create a unique key for each course
        const courseKey = `${season}-${year}-${line.trim()}`;

        // Skip if we've already seen this course in this parse
        if (seenCourses.has(courseKey)) continue;
        seenCourses.add(courseKey);

        // Match completed courses (with grades)
        const completedMatch = line.match(/^- (.+?): (.+?) — (.+)$/);
        if (completedMatch) {
          const [, code, name, grade] = completedMatch;
          coursesToAdd.push({
            code: code.trim(),
            name: name.trim(),
            grade: grade.trim(),
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "completed",
          });
          continue;
        }

        // Match in-progress courses (without grades)
        const inProgressMatch = line.match(/^- (.+?): (.+?)( — (.*))?$/);
        if (inProgressMatch) {
          const [, code, name, , status] = inProgressMatch;
          coursesToAdd.push({
            code: code.trim(),
            name: name.trim(),
            grade: null,
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "in-progress",
          });
        }
      }
    }

    // Check for existing courses before adding new ones
    const existingCourseKeys = new Set(
      existingSnapshot.docs.map(
        (doc) => `${doc.data().semester}-${doc.data().year}-${doc.data().code}`
      )
    );

    // Filter out courses that already exist
    const newCoursesToAdd = coursesToAdd.filter(
      (course) =>
        !existingCourseKeys.has(
          `${course.semester}-${course.year}-${course.code}`
        )
    );

    // Only proceed if there are new courses to add
    if (newCoursesToAdd.length > 0) {
      const batchWrites = newCoursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });

      await Promise.all(batchWrites);
    }

    await fetchCourses();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-white">
        <div className="animate-pulse text-black">Loading...</div>
      </main>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <header className="flex justify-between items-center py-6 border-b border-gray-200">
          <h1 className="text-2xl font-medium tracking-tight">
            Yale DegreeIntelligence
          </h1>
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-sm hover:text-gray-600 transition-colors"
          >
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </header>

        {/* Main Content */}
        <div className="flex flex-col md:flex-row gap-8 py-8">
          {/* Sidebar */}
          <aside className="w-full md:w-64">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("upload")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                  activeTab === "upload"
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <FiUpload size={18} />
                <span>{hasData ? "Add More" : "Import Data"}</span>
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left transition-colors ${
                  activeTab === "settings"
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <FiSettings size={18} />
                <span>Settings</span>
              </button>
            </nav>
          </aside>

          {/* Main Panel */}
          <div className="flex-1">
            {activeTab === "upload" && (
              <div>
                {hasData ? (
                  <div>
                    <h2 className="text-xl font-medium mb-6">Your Courses</h2>
                    <div className="space-y-6">
                      {Array.from(
                        new Set(courses.map((c) => `${c.semester} ${c.year}`))
                      ).map((semester) => (
                        <div key={semester} className="mb-8">
                          <h3 className="text-lg font-medium mb-4">
                            {semester}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses
                              .filter(
                                (c) => `${c.semester} ${c.year}` === semester
                              )
                              .map((course) => (
                                <div
                                  key={course.id}
                                  className={`p-4 border rounded-lg ${
                                    course.status === "in-progress"
                                      ? "border-blue-200 bg-blue-50"
                                      : "border-gray-200"
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium">
                                        {course.code}
                                      </h4>
                                      <p className="text-sm text-gray-600">
                                        {course.name}
                                      </p>
                                      {course.status === "in-progress" && (
                                        <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                          In Progress
                                        </span>
                                      )}
                                    </div>
                                    {course.grade && (
                                      <span className="text-lg font-medium">
                                        {course.grade}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <h2 className="text-xl font-medium mb-6">
                      Import Your Transcript
                    </h2>
                    <div className="w-full max-w-md">
                      <FileUpload onSuccess={parseAndStoreCourses} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <div>
                <h2 className="text-xl font-medium mb-6">Settings</h2>
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-6">
                    <h3 className="font-medium mb-4">Account</h3>
                    <p className="text-sm">{user.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
