/**
 * End to end over HTTP: a client registers, the student consents, the client
 * swaps the code for tokens and then speaks MCP to /mcp with them. Everything
 * runs in memory through the same handler the route uses.
 */
import { createHash } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryOAuthStore } from "@/lib/oauth/memoryStore";
import {
  approveAuthorization,
  exchangeToken,
  registerClient,
  revokeConnection,
  type OAuthDeps,
} from "@/lib/oauth/service";
import { SCOPE_READ, SCOPE_WRITE } from "@/lib/oauth/config";
import { MemoryDatabase } from "./memoryStore";
import { MemoryAuditLog } from "./audit";
import { handleMcpRequest, type McpHandlerOptions } from "./handler";

const BASE = "https://degreeint.test";
const RESOURCE = `${BASE}/mcp`;
const METADATA = `${BASE}/.well-known/oauth-protected-resource/mcp`;
const REDIRECT = "http://127.0.0.1:33418/callback";
const VERIFIER = "v".repeat(50);
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");

let deps: OAuthDeps;
let db: MemoryDatabase;
let audit: MemoryAuditLog;
let opts: McpHandlerOptions;

beforeEach(() => {
  deps = { store: new MemoryOAuthStore(), resource: RESOURCE, issuer: BASE };
  db = new MemoryDatabase();
  audit = new MemoryAuditLog();
  db.users.set("alice", { majors: ["CPSC_BS"], graduationYear: 2029 });
  opts = {
    deps,
    resourceMetadataUrl: METADATA,
    context: (access) => ({ store: db.storeFor(access.uid), audit, access, now: () => new Date(Date.UTC(2026, 10, 14)) }),
  };
});

async function connect(uid: string, scopes?: string[]) {
  const client = await registerClient(deps, {
    client_name: "Inspector",
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: "none",
  });
  const redirect = await approveAuthorization(deps, {
    uid,
    email: `${uid}@yale.edu`,
    params: {
      response_type: "code",
      client_id: client.client_id,
      redirect_uri: REDIRECT,
      code_challenge: CHALLENGE,
      code_challenge_method: "S256",
      resource: RESOURCE,
    },
    grantedScopes: scopes,
  });
  const code = new URL(redirect).searchParams.get("code")!;
  const tokens = await exchangeToken(
    deps,
    { grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT, resource: RESOURCE },
    { clientId: client.client_id },
  );
  return tokens;
}

let rpcId = 0;
async function rpc(token: string | null, method: string, params: Record<string, unknown> = {}) {
  const res = await handleMcpRequest(
    new Request(RESOURCE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: ++rpcId, method, params }),
    }),
    opts,
  );
  return res;
}

async function body(res: Response) {
  return (await res.json()) as { result?: Record<string, unknown>; error?: { message: string } };
}

describe("/mcp", () => {
  it("challenges a request without a token with the resource metadata URL", async () => {
    const res = await rpc(null, "tools/list");
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toBe(`Bearer resource_metadata="${METADATA}"`);
    expect(res.headers.get("Access-Control-Expose-Headers")).toMatch(/WWW-Authenticate/);
  });

  it("rejects an unknown token as invalid_token", async () => {
    const res = await rpc("dia_nope", "tools/list");
    expect(res.status).toBe(401);
    expect(res.headers.get("WWW-Authenticate")).toMatch(/error="invalid_token"/);
  });

  it("initializes, lists tools and calls one with a real token", async () => {
    const { access_token } = await connect("alice");
    const init = await body(
      await rpc(access_token, "initialize", {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "test", version: "1" },
      }),
    );
    expect((init.result!.serverInfo as { name: string }).name).toBe("degree-intelligence");
    expect(init.result!.instructions).toMatch(/dry_run/);

    const list = await body(await rpc(access_token, "tools/list"));
    const names = (list.result!.tools as Array<{ name: string }>).map((t) => t.name);
    expect(names).toContain("get_plan_progress");
    expect(names).toContain("add_planned_course");

    const added = await body(
      await rpc(access_token, "tools/call", {
        name: "add_courses",
        arguments: { courses: [{ code: "CPSC 2010", term: "Fall 2025", grade: "A" }] },
      }),
    );
    expect(added.result!.isError).toBeFalsy();
    expect((await db.storeFor("alice").listCourses()).map((c) => c.code)).toEqual(["CPSC 2010"]);
    expect(audit.events.get("alice")![0]).toMatchObject({ clientName: "Inspector", tool: "add_courses" });
  });

  it("hides write tools from a read-only connection", async () => {
    const { access_token } = await connect("alice", [SCOPE_READ]);
    const list = await body(await rpc(access_token, "tools/list"));
    const names = (list.result!.tools as Array<{ name: string }>).map((t) => t.name);
    expect(names).toContain("get_profile");
    expect(names).not.toContain("add_courses");
    const call = await body(
      await rpc(access_token, "tools/call", { name: "add_courses", arguments: { courses: [] } }),
    );
    expect(JSON.stringify(call)).toMatch(/not found|Tool add_courses/i);
    expect(db.courses.size).toBe(0);
  });

  it("stops working the moment the student revokes the connection", async () => {
    const { access_token } = await connect("alice", [SCOPE_READ, SCOPE_WRITE]);
    expect((await rpc(access_token, "tools/list")).status).toBe(200);
    const [grant] = await deps.store.listGrantsForUser("alice");
    expect(await revokeConnection(deps, "alice", grant.grantId)).toBe(true);
    const res = await rpc(access_token, "tools/list");
    expect(res.status).toBe(401);
  });

  it("answers GET with 405 since the server keeps no stream", async () => {
    const { access_token } = await connect("alice");
    const res = await handleMcpRequest(
      new Request(RESOURCE, { method: "GET", headers: { Authorization: `Bearer ${access_token}` } }),
      opts,
    );
    expect(res.status).toBe(405);
  });

  it("applies the per-connection rate limit", async () => {
    const { access_token } = await connect("alice");
    opts.rateLimit = async () => new Response("slow down", { status: 429 });
    expect((await rpc(access_token, "tools/list")).status).toBe(429);
  });
});
