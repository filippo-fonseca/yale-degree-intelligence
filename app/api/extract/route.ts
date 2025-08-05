// app/api/extract/route.ts
import { NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(request: Request) {
  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text in request body' },
        { status: 400 }
      )
    }

    const prompt = `
You are given a university transcript in raw text format.
Extract the courses semester by semester and format your answer EXACTLY like this:

Semester: Fall 2023
- CPSC 201: Introduction to Computer Science — A (1.0)
- ENAS 194: Linear Algebra — A- (1.0)
- PHYS 180: University Physics — In Progress (1.5)

Semester: Spring 2024
- FREN S164: Advanced French — A+ (1.0)
- MATH 222: Calculus III — IP (0.5)

Important Rules:
1. Include both completed and in-progress courses
2. For completed courses, use: — [Grade] (Credits)
3. For in-progress courses, use: — In Progress (Credits) or — IP (Credits)
4. Always use this exact format:
   Semester: [Season] [Year]
   - [Course Code]: [Course Name] — [Grade/Status] (Credits)
5. Course codes should preserve their original formatting
6. Course names should be properly capitalized
7. Credits should be in the format (X.X) where X.X is the number of credits (like 0.5, 1.0, 1.5, etc.)
8. NOTE: Some transcripts may have a course code that has "YC" appended to the end. Remove this in your output. Example: if MENG 185YC is obtained, output it as MENG 185.

Never output the same course twice for the same semester.

Transcript:
${text}
`

    const chat = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 2000
    })

    const result = chat.choices[0].message?.content ?? ''
    console.log("the openai result is:", result);
    return NextResponse.json({ result })
  } catch (error) {
    console.error('OpenAI error:', error)
    return NextResponse.json(
      { error: 'Failed to extract courses' },
      { status: 500 }
    )
  }
}