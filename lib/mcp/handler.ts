/**
 * The /mcp request pipeline, independent of Next and Firestore so tests can
 * drive it end to end: bearer token -> grant -> scoped server -> transport.
 */
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/oauth/config";
import { verifyAccessToken, type AccessContext, type OAuthDeps } from "@/lib/oauth/service";
import { CORS_HEADERS } from "@/lib/oauth/http";
import { limitMessage, type LimitHit } from "./limits";
import { createMcpServer } from "./server";
import type { ToolContext } from "./tools";

export type McpHandlerOptions = {
  deps: OAuthDeps;
  /** URL clients fetch to learn which authorization server to use (RFC 9728). */
  resourceMetadataUrl: string;
  context: (access: AccessContext) => ToolContext;
  /**
   * Charges `calls` tool calls to the budget. Returns which limit was hit, or
   * null when the calls may run.
   */
  rateLimit?: (access: AccessContext, calls: number) => Promise<LimitHit | null>;
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

type RpcMessage = { jsonrpc?: string; id?: string | number | null; method?: string };

/** The tools/call messages in a request body, and whether it was a batch. */
async function toolCalls(req: Request): Promise<{ calls: RpcMessage[]; batch: boolean }> {
  const parsed = (await req
    .clone()
    .json()
    .catch(() => null)) as RpcMessage | RpcMessage[] | null;
  const batch = Array.isArray(parsed);
  const messages = batch ? parsed : parsed ? [parsed] : [];
  return {
    calls: messages.filter((m) => m && typeof m === "object" && m.method === "tools/call"),
    batch,
  };
}

/**
 * A refused call answered as a tool result with isError, not as an HTTP 429:
 * clients hand tool results to the model, while a transport error often
 * reaches it as a bare failure with no reason and no time to wait.
 */
function limitedResponse(calls: RpcMessage[], hit: LimitHit, batch: boolean): Response {
  const results = calls.map((m) => ({
    jsonrpc: "2.0",
    id: m.id ?? null,
    result: { content: [{ type: "text", text: limitMessage(hit) }], isError: true },
  }));
  return withCors(
    new Response(JSON.stringify(batch ? results : results[0]), {
      status: 200,
      headers: { "Content-Type": "application/json", "Retry-After": String(hit.retryAfterSeconds) },
    }),
  );
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

  // Only tool calls are charged: the handshake and tools/list stay free, so a
  // client reconnecting or refreshing its tool list costs nothing.
  if (opts.rateLimit) {
    const { calls, batch } = await toolCalls(req);
    if (calls.length > 0) {
      const hit = await opts.rateLimit(access, calls.length);
      if (hit) return limitedResponse(calls, hit, batch);
    }
  }

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
