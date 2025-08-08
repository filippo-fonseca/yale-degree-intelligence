// app/api/contact/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { render } from "@react-email/render";
import ContactEmail from "@/components/ContactEmail/ContactEmail";

export const runtime = "nodejs"; // important: NOT edge

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  category: z.enum(["bug", "feature", "data", "other"]).default("other"),
  subject: z.string().min(1),
  message: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const { name, email, category, subject, message } = parsed.data;

    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.CONTACT_TO_EMAIL;
    const fromEmail =
      process.env.CONTACT_FROM_EMAIL || "DegreeIntelligence <onboarding@resend.dev>";

    if (!resendKey || !toEmail) {
      return NextResponse.json(
        { error: "Email configuration missing on server." },
        { status: 500 }
      );
    }

    const resend = new Resend(resendKey);

    // 👇 Render to HTML explicitly (avoids this.renderAsync issue)
    const html = render(
      ContactEmail({ name, email, category, subject, message }),
      { pretty: true }
    );

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `[${category.toUpperCase()}] ${subject}`,
      html: await html,
      replyTo: email,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Unknown error" }, { status: 500 });
  }
}
