import { adminDb } from "@/config/firebaseAdmin";
import { createHash, randomBytes } from "crypto";

// Per-user MCP bearer tokens. We store only the SHA-256 hash of each token at
// rest (never the plaintext), keyed by uid, so a database leak cannot be used
// to impersonate users. The plaintext is shown to the user exactly once at
// generation time. Server-only; never import into client code.

const TOKENS_COLLECTION = "mcp_tokens";
const TOKEN_PREFIX = "di_mcp_";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export interface McpTokenStatus {
  connected: boolean;
  last4?: string | null;
  createdAt?: string | null;
  lastUsedAt?: string | null;
}

// Generate a fresh token (rotating any existing one), persist only its hash,
// and return the plaintext to the caller a single time.
export async function generateToken(uid: string): Promise<string> {
  if (!adminDb) throw new Error("Admin SDK not configured");
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  await adminDb.collection(TOKENS_COLLECTION).doc(uid).set({
    tokenHash: hashToken(token),
    last4: token.slice(-4),
    createdAt: new Date().toISOString(),
    lastUsedAt: null,
  });
  return token;
}

export async function getTokenStatus(uid: string): Promise<McpTokenStatus> {
  if (!adminDb) return { connected: false };
  const snap = await adminDb.collection(TOKENS_COLLECTION).doc(uid).get();
  if (!snap.exists) return { connected: false };
  const d = snap.data()!;
  return {
    connected: true,
    last4: d.last4 ?? null,
    createdAt: d.createdAt ?? null,
    lastUsedAt: d.lastUsedAt ?? null,
  };
}

export async function revokeToken(uid: string): Promise<void> {
  if (!adminDb) return;
  await adminDb.collection(TOKENS_COLLECTION).doc(uid).delete();
}

// Resolve a presented bearer token to its owning uid, or null if unknown.
// Updates lastUsedAt best-effort. Constant-prefix check avoids hashing junk.
export async function resolveToken(token: string): Promise<string | null> {
  if (!adminDb || !token.startsWith(TOKEN_PREFIX)) return null;
  const q = await adminDb
    .collection(TOKENS_COLLECTION)
    .where("tokenHash", "==", hashToken(token))
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  doc.ref.update({ lastUsedAt: new Date().toISOString() }).catch(() => {});
  return doc.id;
}
