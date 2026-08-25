import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/config/firebaseAdmin";
import {
  normalizeEmail,
  unsubscribeSecret,
  verifyUnsubscribe,
} from "@/lib/emailUnsubscribe";

/**
 * Campaign unsubscribe.
 *
 * POST is the one that acts, for two reasons. It is what RFC 8058 one-click
 * requires, so Gmail's own Unsubscribe button lands here directly; and mail
 * scanners follow links in messages, so an unsubscribe that happened on GET
 * would fire the moment a security appliance previewed the email. GET is
 * handled by the page, which asks first.
 *
 * The address is written to email_unsubscribes, keyed by the address itself so
 * a second click is a no-op rather than a duplicate.
 */

function readParams(url: URL, body: Record<string, string> | null) {
  const email = body?.email ?? url.searchParams.get("e") ?? "";
  const token = body?.token ?? url.searchParams.get("t") ?? "";
  return { email: normalizeEmail(email), token };
}

export async function POST(req: NextRequest) {
  const secret = unsubscribeSecret();
  if (!secret || !adminDb) {
    return NextResponse.json(
      { error: "Unsubscribe is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);

  // One-click posts form-encoded (List-Unsubscribe=One-Click) with the address
  // in the URL; our own page posts JSON. Accept both.
  let body: Record<string, string> | null = null;
  const contentType = req.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    body = await req.json().catch(() => null);
  }

  const { email, token } = readParams(url, body);
  if (!email || !token) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }
  if (!verifyUnsubscribe(email, token, secret)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  await adminDb
    .collection("email_unsubscribes")
    .doc(email)
    .set(
      {
        email,
        unsubscribedAt: FieldValue.serverTimestamp(),
        source: body ? "page" : "one-click",
      },
      { merge: true },
    );

  return NextResponse.json({ ok: true, email });
}

/** Status only, so the page can tell someone they are already off the list. */
export async function GET(req: NextRequest) {
  const secret = unsubscribeSecret();
  if (!secret || !adminDb) {
    return NextResponse.json(
      { error: "Unsubscribe is not configured" },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const { email, token } = readParams(url, null);
  if (!email || !token || !verifyUnsubscribe(email, token, secret)) {
    return NextResponse.json({ error: "Invalid link" }, { status: 403 });
  }

  const doc = await adminDb.collection("email_unsubscribes").doc(email).get();
  return NextResponse.json({ email, unsubscribed: doc.exists });
}
