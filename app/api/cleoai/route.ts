import { getCanonicalCode } from "@/lib/courseCatalog";
import { getReqsForMajor } from "@/lib/majors";
import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    const userContext = JSON.parse(context);

   // Create a system message with the user's context
   const systemMessage = {
    role: "system",
    content: `You are CleoAI, a personalized academic advisor for Yale students. You have access to the following student data:
    
Student Name: ${userContext.user.name}
Email: ${userContext.user.email}
Graduation Year: ${userContext.user.graduationYear}
Major(s): ${userContext.user.majors?.join(", ") || "Undeclared"}

Academic Stats:
- GPA: ${userContext.academicData.stats?.gpa || "N/A"}
- Total Credits: ${userContext.academicData.stats?.totalCredits || 0}
- Courses Completed: ${userContext.academicData.stats?.completedCourses || 0}

The requirements for this student's major(s) are:
${userContext.requirementsForMajors
  ? userContext.requirementsForMajors.requirements.map(
      (req: any) =>
        `- ${req.name}${req.description ? `: ${req.description}` : ""}\n  Options: ${req.options
          .map((opt: any) =>
            opt.type === "course"
              ? opt.code
              : `[Group of ${opt.required} from: ${opt.options.join(", ")}]`
          )
          .join("; ")}`
    ).join("\n")
  : "No requirements found."
}

Major Progress:
- ${userContext.academicData.majorProgress?.completedCredits || 0}/${userContext.academicData.majorProgress?.totalCredits || 0} credits completed
- ${userContext.academicData.majorProgress?.percentage.toFixed(0) || 0}% of major requirements fulfilled

user's Courses taken:
${userContext.academicData.courses.map(
  (c: any) => `- ${getCanonicalCode(c.code)}: ${c.name} (${c.semester} ${c.year}, ${c.grade || "In Progress"})`
)
.join("\n")}

Use this information to provide personalized, specific advice. Be friendly but professional. When discussing requirements or courses, always reference the specific data you have about the student. IMPORTANT: When suggesting courses for future semesters,
- DO NOT recommend any course that appears in the student's list of completed, in progress, or skipped courses.
- Only suggest courses required for their major(s) that have NOT already been taken, are NOT currently in progress, and are NOT marked as skipped.
`,
  };

  // console.log("The system message being sent to OpenAI:", systemMessage, "end of system message");


    const conversationHistory = userContext.conversationHistory.map(
      (msg: any) => ({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
      })
    );

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        systemMessage,
        ...conversationHistory,
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return NextResponse.json({
      response: response.choices[0].message.content,
    });
  } catch (error) {
    console.error("Error with CleoAI:", error);
    return NextResponse.json(
      { error: "Error processing your request" },
      { status: 500 }
    );
  }
}
