import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const { text } = await req.json();

  const prompt = `
You are given a university transcript in raw text format.
Extract the courses semester by semester and format your answer like this:

Semester: Fall 2023
- CPSC 201: Introduction to Computer Science — A
- ENAS 194: Linear Algebra — A-

Semester: Spring 2024
- PHYS 180: University Physics — A
- FREN S164: Advanced French — A+

Only include terms that contain grades. Don't include in-progress or placeholder sections. Only output the list.
  
Transcript:
${text}
`;

  const chat = await openai.chat.completions.create({
    model: "gpt-4o-mini", // or "gpt-3.5-turbo"
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2,
  });

  return NextResponse.json({ result: chat.choices[0].message.content });
}
