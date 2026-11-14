import { adminDb } from "@/config/firebaseAdmin";
import { rateLimit } from "@/lib/apiAuth";
import { oauthDeps } from "@/lib/oauth";
import { protectedResourceMetadataUrl } from "@/lib/oauth/config";
import { corsPreflight, serverMisconfigured } from "@/lib/oauth/http";
import { FirestoreAuditLog } from "@/lib/mcp/audit";
import { FirestoreDegreeStore } from "@/lib/mcp/firestoreStore";
import { handleMcpRequest } from "@/lib/mcp/handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Per connection: generous for an agent working through a plan, low enough to stop a runaway loop. */
const CALLS_PER_TEN_MINUTES = 300;

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
    rateLimit: (access) => rateLimit(`mcp:${access.grantId}`, CALLS_PER_TEN_MINUTES, 10 * 60 * 1000),
  });
}

export const GET = handle;
export const POST = handle;
export const DELETE = handle;

export function OPTIONS() {
  return corsPreflight();
}
