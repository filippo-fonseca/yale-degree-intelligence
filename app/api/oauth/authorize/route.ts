import { NextRequest, NextResponse } from "next/server";
import { isAuthError, rateLimit, requireAuth } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import {
  RedirectableAuthorizeError,
  UnredirectableAuthorizeError,
  approveAuthorization,
  denyAuthorization,
  type AuthorizeParams,
} from "@/lib/oauth/service";

export const dynamic = "force-dynamic";

const PARAM_KEYS = [
  "response_type",
  "client_id",
  "redirect_uri",
  "scope",
  "state",
  "code_challenge",
  "code_challenge_method",
  "resource",
] as const;

/**
 * The consent screen's decision. Authenticated with the student's Firebase ID
 * token in the Authorization header (never a cookie), so another site cannot
 * submit it on their behalf; the consent page itself cannot be framed.
 *
 * Body: { params: AuthorizeParams, decision: "allow" | "deny", scopes?: string[] }
 * Reply: { redirectTo } on success.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;

  const limited = await rateLimit(`oauth-consent:${auth.uid}`, 30, 60 * 60 * 1000);
  if (limited) return limited;

  const deps = oauthDeps(req);
  if (!deps) {
    return NextResponse.json({ error: "Connecting apps is not configured" }, { status: 503 });
  }

  let body: { params?: Record<string, unknown>; decision?: string; scopes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  const params: AuthorizeParams = {};
  for (const key of PARAM_KEYS) {
    const value = body.params?.[key];
    params[key] = typeof value === "string" ? value : null;
  }
  const scopes = Array.isArray(body.scopes)
    ? body.scopes.filter((s): s is string => typeof s === "string")
    : undefined;

  try {
    const redirectTo =
      body.decision === "allow"
        ? await approveAuthorization(deps, {
            uid: auth.uid,
            email: auth.email ?? "",
            params,
            grantedScopes: scopes,
          })
        : await denyAuthorization(deps, params);
    return NextResponse.json({ redirectTo }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RedirectableAuthorizeError) {
      return NextResponse.json({ redirectTo: error.redirectTo });
    }
    if (error instanceof UnredirectableAuthorizeError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("[oauth] consent decision failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
