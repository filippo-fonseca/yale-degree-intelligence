import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Models to try (Gemini first, OpenAI fallback)
const GEMINI_MODELS = ["gemini-1.5-flash", "gemini-2.0-flash-lite"];

// Build COMPACT context - only essential info
function buildContext(userContext: any): string {
  const u = userContext.user;
  const stats = userContext.academicData?.stats;
  const courses = userContext.academicData?.courses || [];
  const majors = u.majors || [];

  // Determine year and semesters from graduation
  const gradYear = u.graduationYear;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  // Cutoff is June 1st: from June onward the current term is Fall.
  const isSpring = currentMonth < 5;
  const currentSemester = isSpring ? "Spring" : "Fall";

  const yearsLeft = gradYear ? gradYear - currentYear : null;
  let yearLabel = "";
  let semestersLeft = 0;
  if (yearsLeft !== null) {
    if (yearsLeft >= 4) { yearLabel = "Freshman"; semestersLeft = isSpring ? 7 : 8; }
    else if (yearsLeft >= 3) { yearLabel = "Sophomore"; semestersLeft = isSpring ? 5 : 6; }
    else if (yearsLeft >= 2) { yearLabel = "Junior"; semestersLeft = isSpring ? 3 : 4; }
    else if (yearsLeft >= 1) { yearLabel = "Senior"; semestersLeft = isSpring ? 1 : 2; }
    else { yearLabel = "Senior"; semestersLeft = 1; }
  }

  // Compact but complete user info
  let ctx = `**Student:** ${u.name || "Student"}\n`;
  ctx += `**Year:** ${yearLabel} (Class of ${gradYear || "?"}) — ${semestersLeft} semesters left, currently ${currentSemester} ${currentYear}\n`;
  ctx += `**Majors:** ${majors.length > 1 ? "DOUBLE MAJOR: " : ""}${majors.join(" + ") || "Undeclared"}\n`;
  ctx += `**GPA:** ${stats?.gpa || "N/A"} | **Credits:** ${stats?.totalCredits || 0} total | **Courses:** ${stats?.completedCourses || 0} completed, ${stats?.inProgressCourses || 0} in-progress\n`;

  // Compact course list - just codes
  const completed = courses.filter((c: any) => c.status === "completed").map((c: any) => c.code);
  const inProgress = courses.filter((c: any) => c.status === "in-progress").map((c: any) => c.code);
  const skipped = courses.filter((c: any) => c.skipped).map((c: any) => c.code);

  if (completed.length) ctx += `**Completed:** ${completed.join(", ")}\n`;
  if (inProgress.length) ctx += `**In-Progress:** ${inProgress.join(", ")}\n`;
  if (skipped.length) ctx += `**Skipped:** ${skipped.join(", ")}\n`;

  // Handle multiple majors - show progress for each
  const allMajorProgress = userContext.academicData?.allMajorProgress || {};
  const singleProgress = userContext.academicData?.majorProgress;

  if (Object.keys(allMajorProgress).length > 0) {
    // Multiple majors with separate progress
    for (const [majorId, mp] of Object.entries(allMajorProgress) as any) {
      ctx += `\n**${majorId} Progress:** ${mp.completedCredits || 0}/${mp.totalCredits || 0} credits (${mp.percentage?.toFixed(0) || 0}%)\n`;
      const remaining = mp.remainingRequirements || [];
      if (remaining.length > 0) {
        ctx += `Still need for ${majorId}:\n`;
        for (const r of remaining.slice(0, 5)) {
          const opts = r.options?.filter((o: any) => !o.completed && !o.inProgress).slice(0, 3).map((o: any) => o.code) || [];
          ctx += `- ${r.name}${opts.length ? ": " + opts.join("/") : ""}\n`;
        }
      }
    }
  } else if (singleProgress) {
    // Single major progress
    ctx += `**Major Progress:** ${singleProgress.completedCredits || 0}/${singleProgress.totalCredits || 0} credits (${singleProgress.percentage?.toFixed(0) || 0}%)\n`;
    const remaining = singleProgress.remainingRequirements || [];
    if (remaining.length > 0) {
      ctx += `**Still Need:**\n`;
      for (const r of remaining.slice(0, 6)) {
        const opts = r.options?.filter((o: any) => !o.completed && !o.inProgress).slice(0, 3).map((o: any) => o.code) || [];
        ctx += `- ${r.name}${opts.length ? ": " + opts.join("/") : ""}\n`;
      }
    }
  }

  return ctx;
}

const SYSTEM_INSTRUCTION = `You are Dan, the friendly Yale bulldog academic advisor. You're a smart, experienced tutor who knows Yale inside and out.

## PERSONALITY
- Friendly and encouraging, like a loyal dog
- Occasionally use phrases like "let me dig into that", "sniffing out options", "fetch you some recommendations" (sparingly - max 1 per response)
- You're helpful first, cute second

## YALE COURSE LOAD KNOWLEDGE
- Average Yale student takes ~5 classes per semester (range: 4-6)
- Most courses = 1 credit. Some are 0.5 credits, some are 1.5 credits
- Freshmen typically take 4-4.5 credits first semester (lighter load to adjust)
- Sophomores/Juniors often take 5-5.5, sometimes 6 credits
- 6.5 credits is the maximum allowed per semester
- Plan schedules realistically based on the student's year and workload capacity

## DOUBLE MAJOR HANDLING
- When a student has multiple majors, consider BOTH sets of requirements
- Look for courses that satisfy requirements in BOTH majors (double-counting opportunities)
- Help balance progress across both majors - don't neglect one
- Be strategic: prioritize overlapping requirements and prerequisites
- If one major is falling behind, flag it and suggest catch-up strategies

## WHAT YOU ALREADY KNOW (don't ask about these)
- Student's name, year (freshman/sophomore/junior/senior), graduation year
- Their major(s) and progress in each
- All courses completed, in-progress, and skipped
- GPA and total credits
- What requirements they still need

## ONLY ASK ABOUT THINGS YOU DON'T KNOW
- Preferences: "Do you want a challenging semester or a balanced one?"
- Interests: "Any areas you're particularly interested in exploring?"
- Constraints: "Are there specific days/times you need to keep free?"
- Goals: "Trying to finish early, or taking your time?"
- Tradeoffs: "Option A is faster but harder. Option B is steadier. Which fits you better?"

## BE STRATEGIC
- Think ahead: "If you take X now, it unlocks Y and Z next semester"
- Spot opportunities: "This course counts for BOTH your majors"
- Flag concerns: "You're behind on [major] - want to prioritize that?"

## RESPONSE RULES
- Be CONCISE but thorough when planning.
- Use bullet points for lists.
- Reference specific course codes.
- NEVER recommend courses already completed, in-progress, or skipped.
- Suggest realistic credit loads based on their year.
- When building schedules, show your reasoning briefly.

## CONTEXT
You know the student's profile, both majors' progress, and their course history. Be strategic and help them think through decisions.`;

async function tryGemini(
  modelName: string,
  message: string,
  conversationHistory: any[]
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION,
  });

  const chat = model.startChat({
    history: conversationHistory,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 800, // Keep responses concise
      topP: 0.9,
    },
  });

  const result = await chat.sendMessage(message);
  return result.response.text();
}

async function tryOpenAI(
  message: string,
  conversationHistory: any[]
): Promise<string> {
  // Convert to OpenAI format
  const messages: any[] = [
    { role: "system", content: SYSTEM_INSTRUCTION },
  ];

  // Add conversation history
  for (const msg of conversationHistory) {
    messages.push({
      role: msg.role === "model" ? "assistant" : "user",
      content: msg.parts[0].text,
    });
  }

  // Add current message
  messages.push({ role: "user", content: message });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    temperature: 0.7,
    max_tokens: 800, // Keep responses concise
  });

  return response.choices[0].message.content || "";
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, context } = await req.json();
    const userContext = JSON.parse(context);

    // Build conversation history for Gemini format
    const rawHistory = (userContext.conversationHistory || []).map(
      (msg: any) => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.content }],
      })
    );

    // Ensure history starts with user message (Gemini requirement)
    let conversationHistory = rawHistory;
    while (conversationHistory.length > 0 && conversationHistory[0].role === "model") {
      conversationHistory = conversationHistory.slice(1);
    }

    // Smart context: only send on first message OR if data changed
    const isFirstMsg = conversationHistory.length === 0;
    const lastHash = userContext.lastContextHash || "";
    const currentHash = `${userContext.academicData?.stats?.totalCredits}-${userContext.academicData?.stats?.completedCourses}`;
    const dataChanged = lastHash && lastHash !== currentHash;

    let message: string;

    if (isFirstMsg || dataChanged) {
      // First message or data changed: send compact context
      const ctx = buildContext(userContext);
      message = `${ctx}\n---\n${prompt}`;
    } else {
      // Subsequent: just the question (context in history)
      message = prompt;
    }

    // Try Gemini models first, fall back to OpenAI
    let response: string | null = null;
    let lastError: any = null;

    for (const modelName of GEMINI_MODELS) {
      try {
        response = await tryGemini(modelName, message, conversationHistory);
        break; // Success
      } catch (error: any) {
        lastError = error;
        // Continue to next model
      }
    }

    // If all Gemini models failed, try OpenAI
    if (!response) {
      try {
        response = await tryOpenAI(message, conversationHistory);
      } catch (error: any) {
        lastError = error;
      }
    }

    if (response) {
      return NextResponse.json({ response });
    }

    // All providers failed
    throw lastError;
  } catch (error: any) {
    console.error("Error with CleoAI:", error);

    if (error?.status === 429 || error?.message?.includes("429")) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: "Error processing your request. Please try again." },
      { status: 500 }
    );
  }
}
