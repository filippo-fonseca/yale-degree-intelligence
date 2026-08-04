import { NextRequest, NextResponse } from "next/server";
import { isAdminEmail } from "@/lib/admin";
import { isAuthError, requireAuth } from "@/lib/apiAuth";

/**
 * Who the caller is, as far as this deployment is concerned.
 *
 * Exists so the client can gate operator-only UI without shipping the operator
 * list. Client components used to import lib/admin directly, which put every
 * admin address into the JS bundle for anyone to read. Now they ask here and get
 * back a boolean about themselves and nothing about anybody else.
 *
 * This is not the security boundary. It answers a question about the caller's
 * own token, and every privileged route re-checks admin status itself.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;

  return NextResponse.json(
    {
      uid: auth.uid,
      email: auth.email ?? null,
      isAdmin: isAdminEmail(auth.email),
    },
    // Per-user answer that depends on server config; never cache it.
    { headers: { "Cache-Control": "no-store" } },
  );
}
