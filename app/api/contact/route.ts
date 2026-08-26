import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/config/firebaseAdmin";
import { rateLimit } from "@/lib/apiAuth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

function hasEmailProvider(): boolean {
  return !!(
    process.env.RESEND_API_KEY ||
    process.env.SENDGRID_API_KEY ||
    process.env.SMTP_HOST ||
    process.env.CONTACT_EMAIL_PROVIDER
  );
}

function buildMailtoFallback(body: {
  name: string;
  email: string;
  category?: string;
  subject: string;
  message: string;
}) {
  const to = "filippo.fonseca@yale.edu";
  const mailSubject = encodeURIComponent(
    `[${body.category || "contact"}] ${body.subject}`,
  );
  const mailBody = encodeURIComponent(
    `From: ${body.name} <${body.email}>\n\n${body.message}`,
  );
  return `mailto:${to}?subject=${mailSubject}&body=${mailBody}`;
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const limited = await rateLimit(`contact:${ip}`, 5, 3600000);
  if (limited) return limited;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const subject =
    typeof body.subject === "string" ? body.subject.trim() : "Contact form";
  const category =
    typeof body.category === "string" ? body.category.trim() : "other";

  if (!name || !email || !message) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 },
    );
  }

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please provide a valid email address." },
      { status: 400 },
    );
  }

  if (message.length > 5000) {
    return NextResponse.json(
      { error: "Message is too long (max 5000 characters)." },
      { status: 400 },
    );
  }

  const payload = { name, email, category, subject, message };

  if (hasEmailProvider()) {
    return NextResponse.json({
      success: true,
      mailto: buildMailtoFallback(payload),
      note: "Email provider configured; use mailto fallback or wire provider send.",
    });
  }

  if (!adminDb) {
    return NextResponse.json(
      { error: "Contact service temporarily unavailable." },
      { status: 503 },
    );
  }

  try {
    await adminDb.collection("contact_messages").add({
      ...payload,
      ip,
      createdAt: FieldValue.serverTimestamp(),
      status: "new",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to save contact message:", error);
    return NextResponse.json(
      { error: "Failed to save message. Please try again later." },
      { status: 500 },
    );
  }
}
