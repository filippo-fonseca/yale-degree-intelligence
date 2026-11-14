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

/**
 * The same deps for a server component, which has headers but no Request.
 */
export async function oauthDepsForPage(): Promise<OAuthDeps | null> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return oauthDeps(new Request(`${proto}://${host}/oauth/authorize`, { headers: h }));
}
