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
import { gradePoints } from "@/lib/constants";

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

  // Update the parseAndStoreCourses function in src/app/page.tsx
  const parseAndStoreCourses = async (extractedText: string) => {
    if (!user) return;

    // Get existing courses to prevent duplicates
    const existingCoursesQuery = query(
      collection(db, "courses"),
      where("userId", "==", user.uid)
    );
    const existingSnapshot = await getDocs(existingCoursesQuery);
    const existingCourseKeys = new Set(
      existingSnapshot.docs.map(
        (doc) => `${doc.data().semester}-${doc.data().year}-${doc.data().code}`
      )
    );

    const semesterBlocks = extractedText
      .split("Semester: ")
      .filter((block) => block.trim() !== "");
    const coursesToAdd: Omit<Course, "id">[] = [];

    // Track seen courses in this parse to prevent duplicates
    const seenInThisParse = new Set<string>();

    for (const block of semesterBlocks) {
      const [semesterInfo, ...courseLines] = block.split("\n");
      const [season, year] = semesterInfo.split(" ");

      for (const line of courseLines) {
        if (line.trim() === "") continue;

        // Match completed courses (with grades and credits)
        const completedMatch = line.match(
          /^- (.+?): (.+?) — (.+?) \((\d+\.\d+)\)$/
        );
        if (completedMatch) {
          const [, code, name, grade, credits] = completedMatch;
          const courseKey = `${season.trim()}-${year.trim()}-${code.trim()}`;

          // Skip if already exists or seen in this parse
          if (
            existingCourseKeys.has(courseKey) ||
            seenInThisParse.has(courseKey)
          )
            continue;
          seenInThisParse.add(courseKey);

          coursesToAdd.push({
            code: code.trim(),
            name: name.trim(),
            grade: grade.trim(),
            semester: season.trim(),
            year: parseInt(year.trim()),
            userId: user.uid,
            status: "completed",
            credits: parseFloat(credits),
          });
          continue;
        }

        // Match in-progress courses (without grades but with credits)
        const inProgressMatch = line.match(
          /^- (.+?): (.+?) — (?:In Progress|IP) \((\d+\.\d+)\)$/
        );
        if (inProgressMatch) {
          const [, code, name, credits] = inProgressMatch;
          const courseKey = `${season.trim()}-${year.trim()}-${code.trim()}`;

          // Skip if already exists or seen in this parse
          if (
            existingCourseKeys.has(courseKey) ||
            seenInThisParse.has(courseKey)
          )
            continue;
          seenInThisParse.add(courseKey);

          coursesToAdd.push({
            code: code.trim(),
            name: name.trim(),
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

    // Only proceed if there are new courses to add
    if (coursesToAdd.length > 0) {
      const batchWrites = coursesToAdd.map((course) => {
        const docRef = doc(collection(db, "courses"));
        return setDoc(docRef, course);
      });

      await Promise.all(batchWrites);
    }

    await fetchCourses();
  };

  // Add this to your existing code, somewhere before the return statement

  // Update the calculateStats function in src/app/page.tsx
  const calculateStats = () => {
    if (courses.length === 0) return null;

    let totalCredits = 0;
    let totalGradePoints = 0;
    let completedCoursesWithGrades = 0;
    let inProgressCourses = 0;
    const distribution: Record<string, number> = {};

    courses.forEach((course) => {
      if (
        course.status === "completed" &&
        course.grade &&
        gradePoints[course.grade]
      ) {
        completedCoursesWithGrades++;
        totalCredits += course.credits || 0;
        totalGradePoints += gradePoints[course.grade] * (course.credits || 1.0);
        distribution[course.grade] = (distribution[course.grade] || 0) + 1;
      } else if (course.status === "in-progress") {
        inProgressCourses++;
        totalCredits += course.credits || 0;
      }
    });

    const gpa = totalCredits > 0 ? totalGradePoints / totalCredits : 0;

    return {
      gpa: gpa.toFixed(2),
      totalCredits,
      completedCourses: completedCoursesWithGrades,
      inProgressCourses,
      distribution,
    };
  };

  const stats = calculateStats();

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
                                      <div className="flex items-center mt-1 space-x-2">
                                        {course.status === "in-progress" && (
                                          <span className="inline-block px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                                            In Progress
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-500">
                                          {course.credits} credit
                                          {course.credits !== 1 ? "s" : ""}
                                        </span>
                                      </div>
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
                    {hasData && stats && (
                      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                        <h3 className="font-medium mb-3">Academic Summary</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-sm text-gray-500">GPA</p>
                            <p className="text-2xl font-medium">{stats.gpa}</p>
                          </div>
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-sm text-gray-500">Credits</p>
                            <p className="text-2xl font-medium">
                              {stats.totalCredits}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-sm text-gray-500">Completed</p>
                            <p className="text-2xl font-medium">
                              {stats.completedCourses}
                            </p>
                          </div>
                          <div className="p-3 bg-white rounded border border-gray-200">
                            <p className="text-sm text-gray-500">In Progress</p>
                            <p className="text-2xl font-medium">
                              {stats.inProgressCourses}
                            </p>
                          </div>
                        </div>

                        {Object.keys(stats.distribution).length > 0 && (
                          <div className="mt-4">
                            <h4 className="text-sm font-medium mb-2">
                              Grade Distribution
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(stats.distribution)
                                .sort(
                                  ([gradeA], [gradeB]) =>
                                    gradePoints[gradeB] - gradePoints[gradeA]
                                )
                                .map(([grade, count]) => (
                                  <div
                                    key={grade}
                                    className="flex items-center bg-white px-3 py-1 rounded-full border border-gray-200"
                                  >
                                    <span className="font-medium mr-1">
                                      {grade}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                      ×{count}
                                    </span>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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
