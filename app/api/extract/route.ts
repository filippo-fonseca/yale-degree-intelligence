// app/api/extract/route.ts
import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { requireAuth, isAuthError, rateLimit } from '@/lib/apiAuth'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const MAX_TEXT_LENGTH = 50_000

export async function POST(request: NextRequest) {
  const user = await requireAuth(request)
  if (isAuthError(user)) return user

  const limited = rateLimit(`extract:${user.uid}`, 15, 60 * 60 * 1000)
  if (limited) return limited

  try {
    const { text } = await request.json()

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid text in request body' },
        { status: 400 }
      )
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return NextResponse.json(
        { error: 'Transcript text exceeds maximum allowed length' },
        { status: 400 }
      )
    }

    const prompt = `
You are given a university transcript in raw text format.
Extract the courses semester by semester and format your answer EXACTLY like this:

Semester: Fall 2023
- CPSC 201: Introduction to Computer Science — A (1.0) [QR]
- ENAS 194: Linear Algebra — A- (1.0) [QR, Sc]
- PHYS 180: University Physics — In Progress (1.5)

Semester: Spring 2024
- ENGL 120: Reading and Writing — A- (1.0) [Hu, WR]
- FREN S164: Advanced French — A+ (1.0) [L2]
- MATH 222: Calculus III — IP (0.5)

Important Rules:
1. Include both completed and in-progress courses
2. For completed courses, use: — [Grade] (Credits)
3. For in-progress courses, use: — In Progress (Credits) or — IP (Credits)
4. Always use this exact format:
   Semester: [Season] [Year]
   - [Course Code]: [Course Name] — [Grade/Status] (Credits) [Distributionals]
5. Course codes should preserve their original formatting
6. Course names should be properly capitalized
7. Credits should be in the format (X.X) where X.X is the number of credits (like 0.5, 1.0, 1.5, etc.)
8. NOTE: Some transcripts may have a course code that has "YC" appended to the end. Remove this in your output. Example: if MENG 185YC is obtained, output it as MENG 185.
9. Distributional designations (optional): Yale transcripts often list area/skill tags near each course. When present on the transcript, append them in square brackets after the credits, comma-separated. Valid tags: Hu, So, Sc, QR, WR, L1, L2, L3, L4, L5 (case-sensitive). Examples: [QR], [Hu, WR], [L1]. Only include tags explicitly shown on the transcript for that course — do NOT infer or invent tags from the course subject or department. If the transcript shows no distributionals for a course, omit the brackets entirely or use [].

Never output the same course twice for the same semester.

Transcript:
${text}
`

    const chat = await openai.chat.completions.create({
      model: 'gpt-4.1',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 4000
    })

    const result = chat.choices[0].message?.content ?? ''
    return NextResponse.json({ result })
  } catch (error) {
    console.error('OpenAI error:', error)
    return NextResponse.json(
      { error: 'Failed to extract courses' },
      { status: 500 }
    )
  }
}
