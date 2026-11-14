import { adminDb } from "@/config/firebaseAdmin";
import { rateLimit } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import { protectedResourceMetadataUrl } from "@/lib/oauth/config";
import { corsPreflight, serverMisconfigured } from "@/lib/oauth/http";
import { FirestoreAuditLog } from "@/lib/mcp/audit";
import { FirestoreDegreeStore } from "@/lib/mcp/firestoreStore";
import { handleMcpRequest } from "@/lib/mcp/handler";
import {
  CALLS_PER_CONNECTION,
  CALLS_PER_STUDENT_PER_DAY,
  CONNECTION_WINDOW_MS,
  STUDENT_WINDOW_MS,
  type LimitHit,
} from "@/lib/mcp/limits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function retryAfterSeconds(limited: Response): number {
  return Math.max(1, Number(limited.headers.get("Retry-After")) || 60);
}

/**
 * Per connection first, so one runaway app is stopped before it eats the
 * student's daily budget for every other app they have connected.
 */
async function chargeCalls(grantId: string, uid: string, calls: number): Promise<LimitHit | null> {
  const perConnection = await rateLimit(`mcp:${grantId}`, CALLS_PER_CONNECTION, CONNECTION_WINDOW_MS, calls);
  if (perConnection) return { scope: "connection", retryAfterSeconds: retryAfterSeconds(perConnection) };
  const perStudent = await rateLimit(`mcp-student:${uid}`, CALLS_PER_STUDENT_PER_DAY, STUDENT_WINDOW_MS, calls);
  if (perStudent) return { scope: "student", retryAfterSeconds: retryAfterSeconds(perStudent) };
  return null;
}

async function handle(req: Request) {
  const deps = oauthDeps(req);
  const db = adminDb;
  if (!deps || !db) return serverMisconfigured();
  return handleMcpRequest(req, {
    deps,
    resourceMetadataUrl: protectedResourceMetadataUrl(req),
    context: (access) => ({
      store: new FirestoreDegreeStore(db, access.uid),
      audit: new FirestoreAuditLog(db),
      access,
      now: () => new Date(),
    }),
    rateLimit: (access, calls) => chargeCalls(access.grantId, access.uid, calls),
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export function OPTIONS() {
  return corsPreflight();
}
