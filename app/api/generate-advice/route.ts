import { calculateMajorProgress } from "@/lib/majors";
import { Course } from "@/lib/types";
import { coursesToPromptString } from "@/lib/utils/utils";
import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

type MajorRequirements = Record<string, any>;

export async function POST(req: NextRequest) {
  
  try {
    console.log("Received request to generate advice");
    const body = await req.json();
    const {
      coursesToAdd: courses,
      requirementsJson,
      selectedMajor,
      currentDate,
      graduationYear,
      currentSemester,
      currentYear,
      userId, 
    } = body;

    const majorRequirements = requirementsJson[selectedMajor];
    if (!majorRequirements) {
      return NextResponse.json(
        { error: `Major "${selectedMajor}" not found.` },
        { status: 400 }
      );
    }

    // Format transcript for display
    const coursesBySemester: Record<string, Course[]> = {};
    courses.forEach((course: Course) => {
      const key = `${course.semester} ${course.year}`;
      if (!coursesBySemester[key]) coursesBySemester[key] = [];
      coursesBySemester[key].push(course);
    });

    // Format transcript for display
const formatTranscript = (courses: Course[]) => {
  // Group by semester
  const coursesBySemester: Record<string, Course[]> = {};
  courses.forEach((course) => {
    const key = `${course.semester} ${course.year}`;
    if (!coursesBySemester[key]) coursesBySemester[key] = [];
    coursesBySemester[key].push(course);
  });

  // Sort semesters chronologically
  const sortedSemesters = Object.entries(coursesBySemester).sort(([aSem], [bSem]) => {
    const [aSeason, aYear] = aSem.split(' ');
    const [bSeason, bYear] = bSem.split(' ');
    
    // Convert to comparable format
    const aValue = parseInt(aYear) * 2 + (aSeason === 'Spring' ? 0 : 1);
    const bValue = parseInt(bYear) * 2 + (bSeason === 'Spring' ? 0 : 1);
    
    return aValue - bValue;
  });

  // Format each semester's courses
  return sortedSemesters.map(([semester, semCourses]) => {
    const coursesList = semCourses.map(course => {
      let status = '';
      if (course.skipped) status = ' [skipped]';
      else if (course.grade === 'In Progress') status = ' [in progress]';
      
      return `- ${course.code}: ${course.grade || 'No grade'} (${course.credits} credits)${status}`;
    }).join('\n');
    
    return `Semester: ${semester}\n${coursesList}`;
  }).join('\n\n');
  };

  // const transcriptBlurb = formatTranscript(courses);
  const transcriptBlurb = coursesToPromptString(courses);

    // const transcriptBlurb = Object.entries(coursesBySemester)
    //   .sort(([aSem], [bSem]) => {
    //     const [aS, aY] = aSem.split(" ");
    //     const [bS, bY] = bSem.split(" ");
    //     if (aY !== bY) return Number(aY) - Number(bY);
    //     return aS.localeCompare(bS);
    //   })
    //   .map(([sem, semCourses]) =>
    //     [
    //       `Semester: ${sem}`,
    //       ...semCourses.map(
    //         (c) =>
    //           `- ${c.code}: ${c.grade ?? "In Progress"} (${c.credits})${c.skipped ? " [skipped]" : ""}`
    //       ),
    //     ].join("\n")
    //   )
    //   .join("\n\n");

   /**
 * Return an array of semesters (e.g. ["Fall 2025","Spring 2026",…])
 * during which the student can still choose courses,
 * up through the final Spring semester in gradYear.
 *
 * @param currentSemester  "Spring" or "Fall"
 * @param currentYear      e.g. 2025
 * @param gradYear         expected graduation year, e.g. 2028
 * @param currentDateStr   ISO date string, e.g. "2025-07-18"
 */
   const getSemestersLeft = (
    currentSemester: "Spring" | "Fall",
    currentYear: number,
    gradYear: number,
    currentDateStr: string
  ): string[] => {
    const now = new Date(currentDateStr);
    const month = now.getMonth() + 1;  // 1 = Jan … 12 = Dec
  
    // Determine if current semester is still open for registration
    const includeCurrent =
      (currentSemester === "Spring" && month <= 1) ||
      (currentSemester === "Fall"   && month <= 9);
  
    const semesters: string[] = [];
    let year = currentYear;
    let sem  = currentSemester;
  
    // If it’s still open, count it — then bump
    if (includeCurrent) {
      semesters.push(`${sem} ${year}`);
      if (sem === "Spring") {
        sem = "Fall";
      } else {
        sem = "Spring";
        year++;
      }
    } else {
      // Already past registration: start at next one
      if (sem === "Spring") {
        sem = "Fall";
      } else {
        sem = "Spring";
        year++;
      }
    }
  
    // Now collect through the final Spring of gradYear
    while (year < gradYear || (year === gradYear && sem === "Spring")) {
      semesters.push(`${sem} ${year}`);
      if (sem === "Spring") {
        sem = "Fall";
      } else {
        sem = "Spring";
        year++;
      }
    }
  
    return semesters;
  };
  

// …and then, in your POST handler, swap out the old call:
const semestersLeftArr = getSemestersLeft(
  currentSemester as "Spring" | "Fall",
  currentYear,
  graduationYear,
  currentDate    // pass in the string you already have
);
const semestersLeft = semestersLeftArr.length;

    // Calculate major credits properly
    const totalMajorCredits = majorRequirements.creditRequirements?.total ?? 0;
    
    // Get all major course codes from requirements (handling colon variations)
    const allMajorCourseCodes = new Set<string>();
    (majorRequirements.requirements || []).forEach((req: any) => {
      (req.options || []).forEach((opt: any) => {
        if (opt.code) {
          const cleanCode = opt.code.replace(":", "").trim();
          allMajorCourseCodes.add(cleanCode);
        }
      });
    });

    // Calculate completed credits (only count completed courses that are in major requirements)
    const completedCredits = courses
      .filter(
        (c: Course) =>
          c.status === "completed" &&
          !c.skipped &&
          allMajorCourseCodes.has(c.code.replace(":", "").trim())
      )
      .reduce((sum: any, c: { credits: any; }) => sum + (c.credits || 0), 0);

    // Calculate in-progress credits
    // const inProgressCredits = courses
    //   .filter(
    //     (c: { grade: string; skipped: any; code: string; }) =>
    //       c.grade === "In Progress" &&
    //       !c.skipped &&
    //       allMajorCourseCodes.has(c.code.replace(":", "").trim())
    //   )
    //   .reduce((sum: any, c: { credits: any; }) => sum + (c.credits || 0), 0);

    // const remainingCredits = Math.max(totalMajorCredits - completedCredits, 0);
    // const avgPerSemester =
    //   semestersLeft > 0
    //     ? Math.round((remainingCredits / semestersLeft) * 10) / 10
    //     : remainingCredits;

    const getMajorProgress = () => {
      const completedCourseCodes = courses
        .filter(
          (course: Course) =>
            course.status === "completed" &&
            ((course.grade !== null && course.grade !== "In Progress") ||
              course.skipped)
        )
        .map((course: Course) => course.code);
  
      const inProgressCourseCodes = courses
        .filter((course: Course) => course.grade === "In Progress" && !course.skipped)
        .map((course: Course) => course.code);
  
      const skippedCourseCodes = courses
        .filter((course: Course) => course.skipped)
        .map((course: Course) => course.code);
  
      return calculateMajorProgress(
        selectedMajor,
        completedCourseCodes,
        inProgressCourseCodes,
        skippedCourseCodes
      );
    };

    const { remainingCredits } = getMajorProgress();

    const avgPerSemester =
      semestersLeft > 0
        ? Math.round((remainingCredits / semestersLeft) * 10) / 10
        : remainingCredits;
    console.log("Remaining credits:", remainingCredits);
    console.log("Average per semester:", avgPerSemester);

    const prompt = `
You are an experienced academic advisor for undergraduates at a top U.S. university (Yale). Given a student's course history, their major, the official requirements (in JSON), the current semester and year, today's date, and expected graduation, write a concise, supportive, actionable blurb of advice.
Address whether they're on track, ahead, or behind; recommend next steps; highlight strengths/risks; and mention if anything is missing or should be planned ahead. 

In your advice, please include the following planning information:
- The current semester and year.
- The number of semesters remaining after this one (list them).
- The total number of major credits required, major credits completed, and major credits still needed.
- The average number of major credits the student should take per remaining semester to graduate on time. If this is low, note that they have space for electives or lighter semesters.

Keep your advice student-centered and friendly, like a Yale College advisor. Use 3-5 sentences.

Student's transcript:
${transcriptBlurb}

Major requirements (JSON):
${JSON.stringify(majorRequirements, null, 2)}

Today's date: ${currentDate}
Current semester: ${currentSemester} ${currentYear}
Semesters remaining after this one: ${semestersLeft} (${semestersLeftArr.join(", ")})
Major credits required: ${totalMajorCredits}
Major credits completed: ${completedCredits}
Major credits still needed: ${remainingCredits}
Average major credits per remaining semester needed to finish on time: ${avgPerSemester}

Remember to be nice, but also be critical and don't be afraid to tell them to lock in if they have to - these are Yale students, so be supportvive and realistic but if they're slacking let em know. Also, remember to give advice that is pertinent to now, and to give advice to courses in the lower levels that haven't been completed yet - i.e. if a student hasn't cimpleted some courses in the 1000s, 2000s, or even 3000s, why would we even suggest a 4000 level class? etc. stuff relevant to right now and a snapshot of where they're at and what they should focus on moving forward for their major.
    `.trim();

    console.log("Generated prompt:", prompt);

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.5,
    });

    const advice =
      completion.choices[0]?.message?.content?.trim() ||
      "Could not generate advice at this time.";

    return NextResponse.json({ advice }, { status: 200 });
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: "some server error" + err?.message || "Unknown error" },
      { status: 500 }
    );
  }
}