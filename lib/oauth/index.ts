/**
 * Wires the OAuth service to Firestore and this request's URLs. SERVER ONLY.
 */
import { adminDb } from "@/config/firebaseAdmin";
import { issuerUrl, mcpResourceUrl } from "./config";
import { FirestoreOAuthStore } from "./firestoreStore";
import type { OAuthDeps } from "./service";

export function oauthDeps(req: Request): OAuthDeps | null {
  if (!adminDb) return null;
  return {
    store: new FirestoreOAuthStore(adminDb),
    resource: mcpResourceUrl(req),
    issuer: issuerUrl(req),
  };
}
