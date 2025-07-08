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

export default function Home() {
  const { user, loading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("upload");
  const [courses, setCourses] = useState<Course[]>([]);
  const [hasData, setHasData] = useState(false);

  const [selectedMajor, setSelectedMajor] = useState<string>("MENG");

  const getMajorProgress = () => {
    if (!user || courses.length === 0) return null;
    const completedCourseCodes = courses
      .filter((course) => course.status === "completed" && course.grade)
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
    if (numericGPA >= 3.7) return "text-green-600";
    if (numericGPA >= 3.3) return "text-blue-600";
    if (numericGPA >= 2.7) return "text-yellow-600";
    return "text-red-600";
  };

  const getCreditsColor = (credits: number) => {
    if (credits >= 32) return "text-green-600";
    if (credits >= 24) return "text-blue-600";
    if (credits >= 16) return "text-yellow-600";
    return "text-red-600";
  };

  if (loading)
    return <div className="animate-pulse text-black">Loading...</div>;
  if (!user) return <LoginPage />;

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="max-w-6xl mx-auto px-4">
        <header className="flex justify-between items-center py-6 border-b border-gray-200">
          <h1 className="text-2xl font-medium tracking-tight">
            Yale DegreeIntelligence
          </h1>
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-sm hover:text-gray-600"
          >
            <FiLogOut size={16} />
            <span>Logout</span>
          </button>
        </header>

        <div className="flex flex-col md:flex-row gap-8 py-8">
          {/* Sidebar Navigation */}
          <aside className="w-full md:w-64">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("upload")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left ${
                  activeTab === "upload"
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                My courses
              </button>

              <button
                onClick={() => setActiveTab("stats")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left ${
                  activeTab === "stats"
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <FiBarChart2 size={18} />
                <span>Academic Stats</span>
              </button>

              <button
                onClick={() => setActiveTab("major")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left ${
                  activeTab === "major"
                    ? "bg-black text-white"
                    : "hover:bg-gray-100"
                }`}
              >
                <FiBook size={18} />
                <span>Major Progress</span>
              </button>

              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left ${
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

          {/* Main Content Area */}
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
                                          <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-300 rounded">
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
                                      <span className="text-gray-800 font-medium">
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

            {activeTab === "stats" && stats && (
              <div>
                <h2 className="text-xl font-medium mb-6">
                  Academic Statistics
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-500">GPA</p>
                    <p
                      className={`text-2xl font-medium ${getGPAColor(
                        stats.gpa
                      )}`}
                    >
                      {stats.gpa}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-500">Credits</p>
                    <p
                      className={`text-2xl font-medium ${getCreditsColor(
                        stats.totalCredits
                      )}`}
                    >
                      {stats.totalCredits}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-500">Completed</p>
                    <p className="text-2xl font-medium">
                      {stats.completedCourses}
                    </p>
                  </div>
                  <div className="p-4 bg-white rounded border border-gray-200">
                    <p className="text-sm text-gray-500">In Progress</p>
                    <p className="text-2xl font-medium">
                      {stats.inProgressCourses}
                    </p>
                  </div>
                </div>

                {Object.keys(stats.distribution).length > 0 && (
                  <div className="p-4 bg-white rounded border border-gray-200">
                    <h3 className="font-medium mb-3">Grade Distribution</h3>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(stats.distribution)
                        .sort(
                          ([gradeA], [gradeB]) =>
                            gradePoints[gradeB] - gradePoints[gradeA]
                        )
                        .map(([grade, count]) => (
                          <div
                            key={grade}
                            className="flex items-center bg-gray-50 px-3 py-1 rounded-full border"
                          >
                            <span className="font-medium mr-1">{grade}</span>
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

            {activeTab === "major" && getMajorProgress() && (
              <div>
                <h2 className="text-xl font-medium mb-6">Major Progress</h2>
                <MajorProgressView
                  selectedMajor={selectedMajor}
                  progress={getMajorProgress()!}
                />
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
