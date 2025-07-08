// src/components/MajorProgressView.tsx
"use client";

import { MajorProgress } from "@/lib/majors";
import { getCourseInfo } from "@/lib/courseCatalog";
import { MAJORS } from "@/lib/majors";

interface MajorProgressViewProps {
  selectedMajor: string;
  progress: MajorProgress;
}

export default function MajorProgressView({
  selectedMajor,
  progress,
}: MajorProgressViewProps) {
  return (
    <div className="mb-8 p-6 bg-gray-50 rounded-xl border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold">
            {MAJORS[selectedMajor].name}
          </h3>
          <p className="text-sm text-gray-600">
            {MAJORS[selectedMajor].description}
          </p>
        </div>
        <div className="text-3xl font-bold">
          {progress.percentage.toFixed(0)}%
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-3 mb-6">
        <div
          className="bg-blue-600 h-3 rounded-full"
          style={{ width: `${progress.percentage}%` }}
        ></div>
      </div>

      {/* Credit summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Credits</p>
          <p className="text-2xl font-medium">
            {progress.completedCredits}/{progress.totalCredits}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Core Courses</p>
          <p className="text-2xl font-medium">
            {progress.completedCore.length}/
            {MAJORS[selectedMajor].coreCourses.length}
          </p>
        </div>
        {progress.electiveProgress.map((elective, index) => (
          <div
            key={index}
            className="p-4 bg-white rounded-lg border border-gray-200"
          >
            <p className="text-sm text-gray-500">{elective.name}</p>
            <p className="text-2xl font-medium">
              {elective.completed}/{elective.required}
            </p>
          </div>
        ))}
      </div>

      {/* Core courses */}
      <div className="mb-6">
        <h4 className="font-medium mb-3">Core Requirements</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {MAJORS[selectedMajor].coreCourses.map((code) => {
            const completed = progress.completedCore.includes(code);
            const course = getCourseInfo(code);
            return (
              <div
                key={code}
                className={`p-3 rounded-lg border ${
                  completed
                    ? "bg-green-50 border-green-200"
                    : "bg-gray-50 border-gray-200"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">{code}</span>
                  {completed && <span className="text-green-600">✓</span>}
                </div>
                <p className="text-sm text-gray-600 truncate">{course?.name}</p>
                <p className="text-xs text-gray-500">
                  {course?.credits} credit{course?.credits !== 1 ? "s" : ""}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Electives and other requirements */}
      {[
        ...progress.electiveProgress,
        ...progress.otherRequirementsProgress,
      ].map((req, index) => (
        <div key={index} className="mb-6">
          <h4 className="font-medium mb-2">
            {req.name} ({req.completed}/{req.required})
          </h4>
          {req.description && (
            <p className="text-sm text-gray-600 mb-3">{req.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {req.options?.map((option) => {
              const course = getCourseInfo(option.code);
              return (
                <div
                  key={option.code}
                  className={`px-3 py-1.5 text-sm rounded-full ${
                    option.completed
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                  title={course?.name}
                >
                  {option.code}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
