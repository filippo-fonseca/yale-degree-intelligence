import { useEffect, useState } from "react";
import { Course } from "@/lib/types";
import { getCourseDistributionalsFromCode } from "@/lib/courseCatalog";
import { motion } from "framer-motion";
import { FiCheck, FiX, FiInfo } from "react-icons/fi";

interface DistributionalProgress {
  Hu: number;
  So: number;
  Sc: number;
  QR: number;
  WR: number;
  language: {
    completed: boolean;
    semesters: number;
    highestLevel: number;
    courses: { code: string; level: number }[];
  };
}

const languageDepartments = new Set([
  "LAT",
  "GRE",
  "HEB",
  "CHNS",
  "JAPN",
  "KORE",
  "FREN",
  "ITAL",
  "PORT",
  "SPAN",
  "RUSS",
  "GERM",
  "YIDD",
  "ARBC",
  "VIET",
  "CZEC",
  "POLI",
  "SWAH",
  "AKKD",
  "AMHR",
  "BENG",
  "HIND",
  "MALY",
  "PERS",
  "TAML",
  "TELU",
  "THAI",
  "TIBT",
  "TURK",
  "URDU",
  "WOLO",
  "ZULU",
  "SANS",
  "HEBR",
  "SYRI",
  "COPT",
  "ARAM",
  "UGAR",
  "EGYP",
  "SUMER",
]);

const DistributionalsView = ({ courses }: { courses: Course[] }) => {
  const [progress, setProgress] = useState<DistributionalProgress>({
    Hu: 0,
    So: 0,
    Sc: 0,
    QR: 0,
    WR: 0,
    language: {
      completed: false,
      semesters: 0,
      highestLevel: 0,
      courses: [],
    },
  });

  useEffect(() => {
    if (courses.length === 0) return;

    const newProgress: DistributionalProgress = {
      Hu: 0,
      So: 0,
      Sc: 0,
      QR: 0,
      WR: 0,
      language: {
        completed: false,
        semesters: 0,
        highestLevel: 0,
        courses: [],
      },
    };

    courses.forEach((course) => {
      if (course.skipped || course.status === "in-progress") return;

      // Check distributionals
      const distributionals = getCourseDistributionalsFromCode(course.code);
      if (distributionals) {
        distributionals.forEach((dist) => {
          if (dist === "Hu") newProgress.Hu++;
          if (dist === "So") newProgress.So++;
          if (dist === "Sc") newProgress.Sc++;
          if (dist === "QR") newProgress.QR++;
          if (dist === "WR") newProgress.WR++;
        });
      }

      // Check for language courses
      const [dept, number] = course.code.split(/\s+/);
      if (languageDepartments.has(dept.toUpperCase())) {
        // Extract level from course number (first digit)
        let level = 1;
        if (number) {
          const firstDigitMatch = number.match(/^[1-5]/);
          if (firstDigitMatch) {
            level = parseInt(firstDigitMatch[0]);
          }
        }

        newProgress.language.courses.push({
          code: course.code,
          level,
        });
      }
    });

    // Process language courses
    if (newProgress.language.courses.length > 0) {
      const semesters = newProgress.language.courses.length;
      const highestLevel = Math.max(
        ...newProgress.language.courses.map((c) => c.level),
        0
      );

      // Check completion conditions
      const hasL5 = newProgress.language.courses.some((c) => c.level === 5);
      const hasL4 = newProgress.language.courses.some((c) => c.level === 4);
      const hasThreeSemesters = semesters >= 3;

      newProgress.language = {
        courses: newProgress.language.courses,
        semesters,
        highestLevel,
        completed: hasL5 || (hasL4 && hasL5) || hasThreeSemesters,
      };
    }

    setProgress(newProgress);
  }, [courses]);

  const distributionalRequirements = [
    {
      code: "Hu",
      name: "Humanities",
      required: 2,
      completed: progress.Hu >= 2,
    },
    {
      code: "So",
      name: "Social Sciences",
      required: 2,
      completed: progress.So >= 2,
    },
    { code: "Sc", name: "Sciences", required: 2, completed: progress.Sc >= 2 },
    {
      code: "QR",
      name: "Quantitative Reasoning",
      required: 2,
      completed: progress.QR >= 2,
    },
    { code: "WR", name: "Writing", required: 2, completed: progress.WR >= 2 },
  ];

  const getLanguageStatus = () => {
    if (progress.language.completed) {
      return "Completed";
    }
    if (progress.language.semesters === 0) {
      return "Not started";
    }
    return `In progress (${progress.language.semesters} semesters, highest level: L${progress.language.highestLevel})`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="mb-6">
        <h2 className="text-3xl font-medium bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-purple-200">
          Your Distributional Progress
        </h2>
        <p className="mt-2">
          Yale requires 2 courses in each area (Hu, So, Sc, QR, WR) and
          completion of the language requirement.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {distributionalRequirements.map((req) => (
          <motion.div
            key={req.code}
            whileHover={{ y: -2 }}
            className={`p-5 rounded-xl bg-gray-900/50 backdrop-blur-sm border ${
              req.completed ? "border-emerald-500/30" : "border-gray-800"
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-medium text-lg flex items-center gap-2">
                  {req.name} ({req.code})
                  {req.completed && (
                    <span className="text-emerald-400">
                      <FiCheck />
                    </span>
                  )}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {Math.min(
                    progress[
                      req.code as keyof Omit<DistributionalProgress, "language">
                    ],
                    req.required
                  )}{" "}
                  of {req.required} completed
                </p>
              </div>
              <div className="flex items-center">
                <div className="relative w-12 h-12">
                  <svg className="w-full h-full" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845
                        a 15.9155 15.9155 0 0 1 0 31.831
                        a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke={req.completed ? "#34d399" : "#3b82f6"}
                      strokeWidth="3"
                      strokeDasharray={`${
                        (progress[
                          req.code as keyof Omit<
                            DistributionalProgress,
                            "language"
                          >
                        ] /
                          req.required) *
                        100
                      }, 100`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                    {Math.round(
                      (progress[
                        req.code as keyof Omit<
                          DistributionalProgress,
                          "language"
                        >
                      ] /
                        req.required) *
                        100
                    )}
                    %
                  </div>
                </div>
              </div>
            </div>
            {progress[
              req.code as keyof Omit<DistributionalProgress, "language">
            ] > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-800">
                <h4 className="text-xs font-medium text-gray-400 mb-1">
                  Completed courses:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {courses
                    .filter((course) => {
                      const dist = getCourseDistributionalsFromCode(
                        course.code
                      );
                      return (
                        dist &&
                        dist.includes(req.code) &&
                        !course.skipped &&
                        course.status !== "in-progress"
                      );
                    })
                    .map((course) => (
                      <span
                        key={course.id}
                        className="text-xs px-2 py-1 bg-gray-800 rounded-md"
                      >
                        {course.code}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <motion.div
        whileHover={{ y: -2 }}
        className={`p-5 rounded-xl bg-gray-900/50 backdrop-blur-sm border ${
          progress.language.completed
            ? "border-emerald-500/30"
            : "border-gray-800"
        }`}
      >
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-lg flex items-center gap-2">
              Language Requirement
              {progress.language.completed ? (
                <span className="text-emerald-400">
                  <FiCheck />
                </span>
              ) : (
                <span className="text-amber-400">
                  <FiX />
                </span>
              )}
            </h3>
            <p className="text-sm text-gray-400 mt-1">{getLanguageStatus()}</p>
          </div>
          <div className="flex items-center">
            <div className="relative w-12 h-12">
              <svg className="w-full h-full" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845
                    a 15.9155 15.9155 0 0 1 0 31.831
                    a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={progress.language.completed ? "#34d399" : "#3b82f6"}
                  strokeWidth="3"
                  strokeDasharray={`${
                    progress.language.completed
                      ? 100
                      : Math.min((progress.language.semesters / 3) * 100, 100)
                  }, 100`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {progress.language.completed
                  ? "100%"
                  : `${Math.round((progress.language.semesters / 3) * 100)}%`}
              </div>
            </div>
          </div>
        </div>
        {progress.language.courses.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-800">
            <h4 className="text-xs font-medium text-gray-400 mb-1">
              Language courses:
            </h4>
            <div className="flex flex-wrap gap-2">
              {progress.language.courses.map((course) => (
                <span
                  key={course.code}
                  className="text-xs px-2 py-1 bg-gray-800 rounded-md flex items-center gap-1"
                >
                  {course.code}{" "}
                  <span className="text-gray-500">(L{course.level})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Information section with different styling */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="p-5 rounded-xl"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400">
            <FiInfo size={18} />
          </div>
          <div>
            <h3 className="font-medium text-lg mb-3">
              About Distributional Requirements
            </h3>
            <div className="text-sm text-gray-400 space-y-3">
              <p>
                Yale College requires students to complete distributional
                requirements to ensure a broad liberal arts education.
              </p>

              <div>
                <h4 className="font-medium text-gray-300 mb-1">
                  Area Requirements:
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>2 courses in Humanities (Hu)</li>
                  <li>2 courses in Social Sciences (So)</li>
                  <li>2 courses in Sciences (Sc)</li>
                  <li>2 courses in Quantitative Reasoning (QR)</li>
                  <li>2 courses in Writing (WR)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-gray-300 mb-1">
                  Language Requirement Options:
                </h4>
                <ul className="list-disc pl-5 space-y-1">
                  <li>3 semesters of any level (L1-L5)</li>
                  <li>L4 + L5 (two semesters)</li>
                  <li>Just L5 (one semester)</li>
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  Note: You should always talk to your Dean or DUS about your
                  specific requirements, as they can vary by major and college.
                  This tool provides a general overview based on what we know
                  generally is the case. This applies not only to
                  distributionals, but to anything related to your academics and
                  course selection at Yale.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DistributionalsView;
