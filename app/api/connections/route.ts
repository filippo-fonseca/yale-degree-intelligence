import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebaseAdmin";
import { isAuthError, rateLimit, requireAuth } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import { mcpResourceUrl } from "@/lib/oauth/config";
import {
  OAuthError,
  createPersonalToken,
  listConnections,
  revokeAllConnections,
  revokeConnection,
} from "@/lib/oauth/service";
import { FirestoreAuditLog } from "@/lib/mcp/audit";

export const dynamic = "force-dynamic";

/** Revoked connections stay listed this long so the student sees what they cut. */
const SHOW_REVOKED_FOR_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Settings > Connected apps. The student's own connections, the MCP server
 * URL to paste into a client, and the recent changes those apps made.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (isAuthError(auth)) return auth;
  const limited = await rateLimit(`connections:${auth.uid}`, 300, 60 * 60 * 1000);
  if (limited) return limited;

  const deps = oauthDeps(req);
  if (!deps || !adminDb) {
    return NextResponse.json({ error: "Connecting apps is not configured" }, { status: 503 });
  }
  const now = Date.now();
  const [connections, activity] = await Promise.all([
    listConnections(deps, auth.uid),
    new FirestoreAuditLog(adminDb).list(auth.uid, 25),
  ]);
  return NextResponse.json(
    {
      serverUrl: mcpResourceUrl(req),
      connections: connections.filter((c) => !c.revokedAt || now - c.revokedAt < SHOW_REVOKED_FOR_MS),
      activity: activity.map(({ id, at, clientName, tool, summary, grantId }) => ({
        id,
        at,
        clientName,
        tool,
        summary,
        connectionId: grantId,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Create a personal access token for a client that can't run OAuth (the Grok
 * API, a bot, a script). The token is returned once and only its hash is kept.
 *
 * Body: { name: string, scopes: string[], days: number }
 * Reply: { token, connectionId, scopes, expiresAt }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;
  const limited = await rateLimit(`connections-token:${auth.uid}`, 20, 60 * 60 * 1000);
  if (limited) return limited;

  const deps = oauthDeps(req);
  if (!deps) {
    return NextResponse.json({ error: "Connecting apps is not configured" }, { status: 503 });
  }
  let body: { name?: unknown; scopes?: unknown; days?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  try {
    const result = await createPersonalToken(deps, {
      uid: auth.uid,
      email: auth.email ?? "",
      name: typeof body.name === "string" ? body.name : "",
      scopes: Array.isArray(body.scopes)
        ? body.scopes.filter((s): s is string => typeof s === "string")
        : [],
      days: typeof body.days === "number" ? body.days : NaN,
    });
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof OAuthError) {
      return NextResponse.json({ error: error.description }, { status: 400 });
    }
    console.error("[connections] personal token failed", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/** Body: { id: string } to disconnect one app, or { all: true } for every app. */
export async function DELETE(req: NextRequest) {
  const auth = await requireAuth(req, { checkRevoked: true });
  if (isAuthError(auth)) return auth;
  const limited = await rateLimit(`connections-revoke:${auth.uid}`, 60, 60 * 60 * 1000);
  if (limited) return limited;

  const deps = oauthDeps(req);
  if (!deps) {
    return NextResponse.json({ error: "Connecting apps is not configured" }, { status: 503 });
  }
  let body: { id?: unknown; all?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
  if (body.all === true) {
    const revoked = await revokeAllConnections(deps, auth.uid);
    return NextResponse.json({ revoked });
  }
  if (typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: "Missing connection id" }, { status: 400 });
  }
  const ok = await revokeConnection(deps, auth.uid, body.id);
  if (!ok) return NextResponse.json({ error: "Connection not found" }, { status: 404 });
  return NextResponse.json({ revoked: 1 });
}
