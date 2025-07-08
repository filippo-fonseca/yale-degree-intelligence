// src/components/MajorProgressView.tsx
"use client";

import { MajorProgress } from "@/lib/majors";
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
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Total Credits</p>
          <p className="text-2xl font-medium">
            {progress.completedCredits}/{progress.totalCredits}
          </p>
        </div>
        <div className="p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm text-gray-500">Requirements Completed</p>
          <p className="text-2xl font-medium">
            {progress.completedRequirements.length}/
            {progress.completedRequirements.length +
              progress.remainingRequirements.length}
          </p>
        </div>
      </div>

      {/* Requirements grid */}
      <div className="space-y-8">
        {/* Completed requirements */}
        {progress.completedRequirements.length > 0 && (
          <div>
            <h4 className="font-medium text-lg mb-4 text-green-700">
              Completed Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.completedRequirements.map((req, i) => (
                <div
                  key={i}
                  className="p-4 bg-green-50 rounded-lg border border-green-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-green-800">{req.name}</h5>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      ✓ Complete
                    </span>
                  </div>
                  {req.description && (
                    <p className="text-xs text-green-600 mb-2">
                      {req.description}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5">
                    {req.options
                      .filter((o) => o.completed)
                      .map((opt, j) => (
                        <div
                          key={j}
                          className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs flex items-center"
                        >
                          {opt.code}
                          <span className="ml-1 text-[0.65rem]">
                            ({opt.credits}cr)
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Remaining requirements */}
        {progress.remainingRequirements.length > 0 && (
          <div>
            <h4 className="font-medium text-lg mb-4 text-red-700">
              Remaining Requirements
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {progress.remainingRequirements.map((req, i) => (
                <div
                  key={i}
                  className="p-4 bg-red-50 rounded-lg border border-red-200"
                >
                  <div className="flex justify-between items-center mb-2">
                    <h5 className="font-medium text-red-800">{req.name}</h5>
                    <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
                      {req.completed}/{req.required}
                    </span>
                  </div>
                  {req.description && (
                    <p className="text-xs text-red-600 mb-2">
                      {req.description}
                    </p>
                  )}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      {req.options
                        .filter((o) => o.required)
                        .map((opt, j) => (
                          <div
                            key={j}
                            className={`px-2 py-0.5 rounded-full text-xs flex items-center ${
                              opt.completed
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {opt.code}
                            {opt.completed && (
                              <span className="ml-1 text-[0.65rem]">✓</span>
                            )}
                          </div>
                        ))}
                    </div>
                    {req.options.some((o) => !o.required && o.completed) && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Extra completed:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {req.options
                            .filter((o) => !o.required && o.completed)
                            .map((opt, j) => (
                              <div
                                key={`extra-${j}`}
                                className="px-2 py-0.5 bg-gray-100 text-gray-800 rounded-full text-xs"
                              >
                                {opt.code}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
