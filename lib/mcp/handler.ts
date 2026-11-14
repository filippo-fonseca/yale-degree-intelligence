/**
 * The /mcp request pipeline, independent of Next and Firestore so tests can
 * drive it end to end: bearer token -> grant -> scoped server -> transport.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/oauth/config";
import { verifyAccessToken, type AccessContext, type OAuthDeps } from "@/lib/oauth/service";
import { CORS_HEADERS } from "@/lib/oauth/http";
import { createMcpServer } from "./server";
import type { ToolContext } from "./tools";

export type McpHandlerOptions = {
  deps: OAuthDeps;
  /** URL clients fetch to learn which authorization server to use (RFC 9728). */
  resourceMetadataUrl: string;
  context: (access: AccessContext) => ToolContext;
  /** Returns a response to send instead (429) when the grant is over its limit. */
  rateLimit?: (access: AccessContext) => Promise<Response | null>;
};

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  headers.set("Cache-Control", "no-store");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

function bearerToken(req: Request): string | null {
  const header = req.headers.get("authorization");
  if (!header) return null;
  const [scheme, value] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" && value ? value.trim() : null;
}

function challenge(
  opts: McpHandlerOptions,
  status: 401 | 403,
  error: "invalid_token" | "insufficient_scope" | null,
  description: string,
): Response {
  const parts = [`resource_metadata="${opts.resourceMetadataUrl}"`];
  if (error) parts.push(`error="${error}"`, `error_description="${description}"`);
  if (status === 403) parts.push(`scope="${SCOPE_READ} ${SCOPE_WRITE}"`);
  return withCors(
    new Response(JSON.stringify({ error: error ?? "unauthorized", error_description: description }), {
      status,
      headers: { "Content-Type": "application/json", "WWW-Authenticate": `Bearer ${parts.join(", ")}` },
    }),
  );
}

export async function handleMcpRequest(req: Request, opts: McpHandlerOptions): Promise<Response> {
  const token = bearerToken(req);
  if (!token) return challenge(opts, 401, null, "Sign in to DegreeIntelligence to use this server.");
  const access = await verifyAccessToken(opts.deps, token);
  if (!access) return challenge(opts, 401, "invalid_token", "The access token is invalid, expired or revoked.");
  if (!access.scopes.includes(SCOPE_READ) && !access.scopes.includes(SCOPE_WRITE)) {
    return challenge(opts, 403, "insufficient_scope", "This token grants no DegreeIntelligence access.");
  }

  if (req.method !== "POST") {
    // Stateless JSON server: no standalone SSE stream and no sessions to end.
    return withCors(new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS" } }));
  }

  const limited = await opts.rateLimit?.(access);
  if (limited) return withCors(limited);

  const server = createMcpServer(opts.context(access));
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    const res = await transport.handleRequest(req, {
      authInfo: {
        token,
        clientId: access.clientId,
        scopes: access.scopes,
        resource: new URL(opts.deps.resource),
        extra: { uid: access.uid, grantId: access.grantId },
      },
    });
    return withCors(res);
  } finally {
    // Stateless: the server and transport live for this one request.
    await server.close().catch(() => undefined);
  }
}
