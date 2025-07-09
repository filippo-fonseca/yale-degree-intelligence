// src/app/page.tsx
"use client";

import { useAuth } from "@/context/AuthContext";
import LoginPage from "@/components/LoginPage";
import FileUpload from "@/components/file-upload";
import { useEffect, useState } from "react";
import {
  FiUpload,
  FiSettings,
  FiLogOut,
  FiBarChart2,
  FiBook,
} from "react-icons/fi";
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
import { calculateMajorProgress } from "@/lib/majors";
import MajorProgressView from "@/components/MajorProgressView";
import StatsView from "@/components/StatsView";

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);
  const [selectedMajor, setSelectedMajor] = useState<string>("MENG");

  const getMajorProgress = () => {
    if (!user || courses.length === 0) return null;
    const completedCourseCodes = courses
      .filter(
        (course) =>
          course.status === "completed" && (course.grade || course.skipped)
      )
      .map((course) => course.code);
    return calculateMajorProgress(selectedMajor, completedCourseCodes);
  };

  useEffect(() => {
    if (user) fetchCourses();
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
    // ... (existing parseAndStoreCourses implementation)
    await fetchCourses();
  };

  const calculateStats = () => {
    if (courses.length === 0) return null;
    let totalCredits = 0;
    let totalGradePoints = 0;
    let completedCoursesWithGrades = 0;
    let inProgressCourses = 0;
    const distribution: Record<string, number> = {};

    courses.forEach((course) => {
      if (course.status === "in-progress") {
        inProgressCourses++;
        return;
      }
      if (course.skipped) return;

      if (course.grade && gradePoints[course.grade]) {
        completedCoursesWithGrades++;
        totalCredits += course.credits || 0;
        totalGradePoints += gradePoints[course.grade] * (course.credits || 1.0);
        distribution[course.grade] = (distribution[course.grade] || 0) + 1;
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

  const getGPAColor = (gpa: string) => {
    const numericGPA = parseFloat(gpa);
    if (numericGPA >= 3.7) return "text-emerald-400";
    if (numericGPA >= 3.3) return "text-blue-400";
    if (numericGPA >= 2.7) return "text-yellow-400";
    return "text-red-400";
  };

  const getCreditsColor = (credits: number) => {
    if (credits >= 32) return "text-emerald-400";
    if (credits >= 24) return "text-blue-400";
    if (credits >= 16) return "text-yellow-400";
    return "text-red-400";
  };

  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="neumorphic-loader animate-pulse"></div>
      </div>
    );
  if (!user) return <LoginPage />;

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <header className="flex justify-between items-center py-6">
          <h1 className="font-louize text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
            Yale DegreeIntelligence
          </h1>
          <button
            onClick={logout}
            className="neumorphic-btn flex items-center space-x-2 text-sm px-4 py-2 rounded-lg hover:bg-gray-800 transition-all"
          >
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </header>

        <div className="flex flex-col md:flex-row gap-8 py-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64">
            <nav className="space-y-2">
              <button
                onClick={() => setActiveTab("upload")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-all ${
                  activeTab === "upload"
                    ? "neumorphic-btn-active bg-gradient-to-br from-purple-500 to-blue-600 text-white"
                    : "neumorphic-btn hover:bg-gray-800"
                }`}
              >
                <FiUpload size={18} />
                <span>My Courses</span>
              </button>

              <button
                onClick={() => setActiveTab("stats")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-all ${
                  activeTab === "stats"
                    ? "neumorphic-btn-active bg-gradient-to-br from-purple-500 to-blue-600 text-white"
                    : "neumorphic-btn hover:bg-gray-800"
                }`}
              >
                <FiBarChart2 size={18} />
                <span>Academic Stats</span>
              </button>

              <button
                onClick={() => setActiveTab("major")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left rounded-xl transition-all ${
                  activeTab === "major"
                    ? "neumorphic-btn-active bg-gradient-to-br from-purple-500 to-blue-600 text-white"
                    : "neumorphic-btn hover:bg-gray-800"
                }`}
              >
                <FiBook size={18} />
                <span>Major Progress</span>
              </button>
            </nav>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1">
            {activeTab === "upload" && (
              <div>
                {hasData ? (
                  <div>
                    <h2 className="text-xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                      Your Courses
                    </h2>
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
                                  className={`p-4 rounded-xl neumorphic-card ${
                                    course.status === "in-progress"
                                      ? "border-l-4 border-blue-400"
                                      : course.skipped
                                      ? "border-l-4 border-gray-500"
                                      : ""
                                  }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h4 className="font-medium">
                                        {course.code}
                                        {course.skipped && (
                                          <span className="ml-2 text-xs text-gray-400">
                                            (skipped)
                                          </span>
                                        )}
                                      </h4>
                                      <p className="text-sm text-gray-400">
                                        {course.name}
                                      </p>
                                      <div className="flex items-center mt-1 space-x-2">
                                        {course.status === "in-progress" && (
                                          <span className="inline-block px-2 py-0.5 bg-blue-900/30 text-blue-400 rounded-full text-xs">
                                            In Progress
                                          </span>
                                        )}
                                        <span className="text-xs text-gray-500">
                                          {course.credits} credit
                                          {course.credits !== 1 ? "s" : ""}
                                        </span>
                                      </div>
                                    </div>
                                    {course.grade && !course.skipped && (
                                      <span
                                        className={`text-lg font-medium ${getGPAColor(
                                          course.grade
                                        )}`}
                                      >
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
                    <h2 className="text-xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                      Import Your Transcript
                    </h2>
                    <div className="w-full max-w-md neumorphic-card p-6 rounded-xl">
                      <FileUpload onSuccess={parseAndStoreCourses} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "stats" && <StatsView courses={courses} />}
            {activeTab === "major" && getMajorProgress() && (
              <div>
                <h2 className="text-xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-500">
                  Major Progress
                </h2>
                <MajorProgressView
                  selectedMajor={selectedMajor}
                  progress={getMajorProgress()!}
                  onRequirementChange={fetchCourses}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
