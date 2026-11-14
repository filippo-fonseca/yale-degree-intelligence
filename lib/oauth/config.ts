/**
 * Constants and URL helpers for the OAuth 2.1 authorization server that
 * guards the MCP endpoint. SERVER ONLY.
 *
 * The deployment is both the authorization server and the protected resource:
 * one issuer, one resource (`<base>/mcp`).
 */

export const SCOPE_READ = "degree:read";
export const SCOPE_WRITE = "degree:write";
export const SUPPORTED_SCOPES = [SCOPE_READ, SCOPE_WRITE] as const;
export type Scope = (typeof SUPPORTED_SCOPES)[number];

/** What each scope means, in words a student reads on the consent screen. */
export const SCOPE_DESCRIPTIONS: Record<Scope, string> = {
  [SCOPE_READ]:
    "See your profile, courses, grades, saved plans and degree progress",
  [SCOPE_WRITE]:
    "Change your profile, courses and saved plans on your behalf",
};

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days, rotated on use
export const AUTH_CODE_TTL_SECONDS = 5 * 60;
/**
 * A rotated refresh token presented again inside this window is refused but
 * does not kill the connection: clients retry on flaky networks. After the
 * window, a replay is treated as theft and the whole grant is revoked.
 */
export const REFRESH_REUSE_GRACE_SECONDS = 10;

/** Path of the MCP endpoint, relative to the deployment origin. */
export const MCP_PATH = "/mcp";

/**
 * The public origin of this deployment, without a trailing slash.
 *
 * PUBLIC_BASE_URL wins when set (production should set it, so the issuer never
 * depends on a request header). Otherwise the request's own origin is used,
 * which is what local development and preview deployments want.
 */
export function publicBaseUrl(req?: Request): string {
  const configured = process.env.PUBLIC_BASE_URL?.trim();
  if (configured) return configured.replace(/\/+$/, "");
  if (req) {
    const url = new URL(req.url);
    const forwardedHost = req.headers.get("x-forwarded-host");
    const forwardedProto = req.headers.get("x-forwarded-proto");
    if (forwardedHost) {
      return `${forwardedProto ?? url.protocol.replace(":", "")}://${forwardedHost}`;
    }
    return url.origin;
  }
  return "http://localhost:3000";
}

export function issuerUrl(req?: Request): string {
  return publicBaseUrl(req);
}

export function mcpResourceUrl(req?: Request): string {
  return `${publicBaseUrl(req)}${MCP_PATH}`;
}

export function protectedResourceMetadataUrl(req?: Request): string {
  return `${publicBaseUrl(req)}/.well-known/oauth-protected-resource${MCP_PATH}`;
}

/** Splits a space-delimited scope string, dropping blanks and duplicates. */
export function parseScopes(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(new Set(raw.split(/\s+/).filter(Boolean)));
}

export function isSupportedScope(scope: string): scope is Scope {
  return (SUPPORTED_SCOPES as readonly string[]).includes(scope);
}

/**
 * Write implies read: an agent that may change a plan has to be able to see
 * it first. Normalised here so every grant that holds write also holds read.
 */
export function normalizeScopes(scopes: string[]): Scope[] {
  const kept = scopes.filter(isSupportedScope);
  if (kept.includes(SCOPE_WRITE) && !kept.includes(SCOPE_READ)) {
    kept.unshift(SCOPE_READ);
  }
  return SUPPORTED_SCOPES.filter((s) => kept.includes(s));
}
