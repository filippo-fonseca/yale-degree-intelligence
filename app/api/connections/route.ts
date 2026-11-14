import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/config/firebaseAdmin";
import { isAuthError, rateLimit, requireAuth } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import { mcpResourceUrl } from "@/lib/oauth/config";
import { listConnections, revokeAllConnections, revokeConnection } from "@/lib/oauth/service";
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
