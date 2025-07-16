// src/lib/majors.ts
import { CourseInfo, getCourseInfo, getCanonicalCode, isValidCourseCode } from "./courseCatalog";
import allReqs from './data/all_reqs.json';

type RequirementOption = {
  type: 'course';
  code: string; // Canonical course code
} | {
  type: 'group';
  options: string[]; // Array of canonical course codes
  required: number; // Number of courses required from this group
  description?: string;
};

type MajorRequirement = {
  id: string;
  name: string;
  description: string;
  requirements: {
    name: string;
    description?: string;
    required: number;
    options: RequirementOption[];
  }[];
  creditRequirements: {
    total: number;
  };
};

// Create a typed version of allReqs
const majorRequirements: Record<string, MajorRequirement> = allReqs as Record<string, MajorRequirement>;

export const MAJORS = Object.values(majorRequirements).reduce((acc, major) => {
  acc[major.id] = major.name;
  return acc;
}, {} as Record<string, string>);

type CompletedRequirement = {
  name: string;
  description?: string;
  completed: number;
  required: number;
  satisfied: boolean;
  options: {
    code: string;
    name: string;
    completed: boolean;
    inProgress: boolean;
    required: boolean;
    credits: number;
    skipped?: boolean;
  }[];
};

export type MajorProgress = {
  completedRequirements: CompletedRequirement[];
  inProgressRequirements: CompletedRequirement[];
  remainingRequirements: CompletedRequirement[];
  completedCredits: number;
  inProgressCredits: number;
  remainingCredits: number;
  totalCredits: number;
  percentage: number;
  inProgressPercentage: number;
};

export const calculateMajorProgress = (
  majorId: string,
  completedCourseCodes: string[],
  inProgressCourseCodes: string[] = [],
  skippedCourseCodes: string[] = []
): MajorProgress => {
  const major = majorRequirements[majorId];
  if (!major) throw new Error(`Major ${majorId} not found`);

  // Normalize all course codes
  const canonicalCompleted = completedCourseCodes.map(code => getCanonicalCode(code) || code);
  const canonicalInProgress = inProgressCourseCodes.map(code => getCanonicalCode(code) || code);
  const canonicalSkipped = skippedCourseCodes.map(code => getCanonicalCode(code) || code);

  let totalCompletedCredits = 0;
  let totalInProgressCredits = 0;
  const requirementProgress: CompletedRequirement[] = [];

  for (const req of major.requirements) {
    let reqCompleted = 0;
    let reqInProgress = 0;
    const reqOptions: CompletedRequirement['options'] = [];

    for (const option of req.options) {
      if (option.type === 'course') {
        const code = option.code;
        const course = getCourseInfo(code);
        if (!course) continue;

        const completed = canonicalCompleted.includes(code);
        const inProgress = canonicalInProgress.includes(code);
        const skipped = canonicalSkipped.includes(code);

        reqOptions.push({
          code,
          name: course.name,
          completed: completed || skipped,
          inProgress: inProgress && !completed && !skipped,
          required: true,
          credits: course.credits,
          skipped
        });

        if (completed || skipped) {
          reqCompleted += 1; // Count courses, not credits for requirement completion
          totalCompletedCredits += course.credits;
        } else if (inProgress) {
          reqInProgress += 1;
          totalInProgressCredits += course.credits;
        }
      } else if (option.type === 'group') {
        let groupCompleted = 0;
        let groupInProgress = 0;
        let groupCredits = 0;

        option.options.forEach((code: string) => {
          const course = getCourseInfo(code);
          if (!course) return;

          const completed = canonicalCompleted.includes(code);
          const inProgress = canonicalInProgress.includes(code);
          const skipped = canonicalSkipped.includes(code);

          reqOptions.push({
            code,
            name: course.name,
            completed: completed || skipped,
            inProgress: inProgress && !completed && !skipped,
            required: (groupCompleted + groupInProgress) < option.required,
            credits: course.credits,
            skipped
          });

          if ((completed || skipped) && groupCompleted < option.required) {
            groupCompleted++;
            groupCredits += course.credits;
          } else if (inProgress && (groupCompleted + groupInProgress) < option.required) {
            groupInProgress++;
          }
        });

        reqCompleted += groupCompleted;
        reqInProgress += groupInProgress;
        totalCompletedCredits += groupCredits;
      }
    }

    requirementProgress.push({
      name: req.name,
      description: req.description,
      completed: reqCompleted,
      required: req.required,
      satisfied: reqCompleted >= req.required,
      options: reqOptions
    });
  }

  // Categorize requirements
  const completedReqs = requirementProgress.filter(r => r.satisfied);
  const inProgressReqs = requirementProgress.filter(r => 
    !r.satisfied && r.completed > 0
  );
  const remainingReqs = requirementProgress.filter(r => 
    !r.satisfied && r.completed === 0
  );

  // Calculate percentages
  const percentage = Math.min(100, (totalCompletedCredits / major.creditRequirements.total) * 100);
  const inProgressPercentage = Math.min(100, 
    ((totalCompletedCredits + totalInProgressCredits) / major.creditRequirements.total) * 100
  );

  return {
    completedRequirements: completedReqs,
    inProgressRequirements: inProgressReqs,
    remainingRequirements: remainingReqs,
    completedCredits: totalCompletedCredits,
    inProgressCredits: totalInProgressCredits,
    remainingCredits: Math.max(0, major.creditRequirements.total - totalCompletedCredits - totalInProgressCredits),
    totalCredits: major.creditRequirements.total,
    percentage,
    inProgressPercentage
  };
};