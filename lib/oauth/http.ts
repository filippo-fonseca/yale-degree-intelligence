/**
 * HTTP plumbing shared by the OAuth and MCP routes. SERVER ONLY.
 *
 * CORS is open on these endpoints on purpose: browser-based MCP clients (the
 * MCP Inspector, web IDEs) call them cross-origin, and nothing here relies on
 * cookies. Every credential travels in a header or form field the caller
 * chose to send.
 */
import { NextResponse } from "next/server";
import { OAuthError, type ClientCredentials } from "./service";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Mcp-Protocol-Version, Last-Event-ID",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id, Mcp-Protocol-Version",
  "Access-Control-Max-Age": "86400",
};

export function corsPreflight(): NextResponse {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export function json(body: unknown, status = 200, extra: Record<string, string> = {}): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...CORS_HEADERS, "Cache-Control": "no-store", Pragma: "no-cache", ...extra },
  });
}

export function oauthErrorResponse(error: unknown): NextResponse {
  if (error instanceof OAuthError) {
    const extra: Record<string, string> =
      error.status === 401 ? { "WWW-Authenticate": 'Basic realm="degree-intelligence"' } : {};
    return json(error.toJSON(), error.status, extra);
  }
  console.error("[oauth] unexpected error", error);
  return json({ error: "server_error", error_description: "Unexpected server error" }, 500);
}

/** Reads a token-endpoint style body: form-encoded per spec, JSON tolerated. */
export async function readForm(req: Request): Promise<Record<string, string | undefined>> {
  const type = req.headers.get("content-type") ?? "";
  const text = await req.text();
  if (text.length > 16_384) throw new OAuthError("invalid_request", "request body too large");
  if (type.includes("application/json")) {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      return Object.fromEntries(
        Object.entries(parsed).map(([k, v]) => [k, typeof v === "string" ? v : undefined]),
      );
    } catch {
      throw new OAuthError("invalid_request", "body is not valid JSON");
    }
  }
  return Object.fromEntries(new URLSearchParams(text).entries());
}

/** Client credentials from HTTP Basic or the form body (RFC 6749 2.3.1). */
export function clientCredentials(
  req: Request,
  form: Record<string, string | undefined>,
): ClientCredentials {
  const header = req.headers.get("authorization");
  if (header?.toLowerCase().startsWith("basic ")) {
    try {
      const decoded = Buffer.from(header.slice(6).trim(), "base64").toString("utf8");
      const idx = decoded.indexOf(":");
      if (idx > 0) {
        return {
          clientId: decodeURIComponent(decoded.slice(0, idx)),
          clientSecret: decodeURIComponent(decoded.slice(idx + 1)),
          via: "basic",
        };
      }
    } catch {
      throw new OAuthError("invalid_client", "malformed Basic credentials", 401);
    }
  }
  return {
    clientId: form.client_id,
    clientSecret: form.client_secret,
    via: form.client_secret ? "post" : undefined,
  };
}

/** Best-effort caller IP for rate limiting. */
export function callerIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function serverMisconfigured(): NextResponse {
  return json(
    { error: "temporarily_unavailable", error_description: "Server is not configured for OAuth" },
    503,
  );
}
