import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { MemoryOAuthStore } from "@/lib/oauth/memoryStore";
import { createPersonalToken, type OAuthDeps } from "@/lib/oauth/service";
import { SCOPE_WRITE } from "@/lib/oauth/config";
import { MemoryDatabase } from "./memoryStore";
import { MemoryAuditLog } from "./audit";
import { handleMcpRequest } from "./handler";
import { renderToolReference, type ListedTool } from "./toolDocs";

const RESOURCE = "https://degreeint.test/mcp";
const DOC = join(process.cwd(), "docs/mcp/tools.md");

async function rpc(token: string, method: string, deps: OAuthDeps) {
  const db = new MemoryDatabase();
  const audit = new MemoryAuditLog();
  const res = await handleMcpRequest(
    new Request(RESOURCE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params: method === "initialize" ? { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "docs", version: "1" } } : {},
      }),
    }),
    {
      deps,
      resourceMetadataUrl: `${RESOURCE}/meta`,
      context: (access) => ({ store: db.storeFor(access.uid), audit, access, now: () => new Date() }),
    },
  );
  return ((await res.json()) as { result: Record<string, unknown> }).result;
}

describe("docs/mcp/tools.md", () => {
  it("matches what the server advertises", async () => {
    const deps: OAuthDeps = { store: new MemoryOAuthStore(), resource: RESOURCE, issuer: "https://degreeint.test" };
    const { token } = await createPersonalToken(deps, {
      uid: "docs",
      email: "docs@yale.edu",
      name: "docs",
      scopes: [SCOPE_WRITE],
      days: 1,
    });
    const init = await rpc(token, "initialize", deps);
    const list = await rpc(token, "tools/list", deps);
    const rendered = renderToolReference(list.tools as ListedTool[], init.instructions as string);
    if (process.env.UPDATE_MCP_DOCS) writeFileSync(DOC, rendered);
    expect(existsSync(DOC), "run UPDATE_MCP_DOCS=1 npx vitest run lib/mcp/toolDocs.test.ts").toBe(true);
    expect(readFileSync(DOC, "utf8"), "docs/mcp/tools.md is stale: run UPDATE_MCP_DOCS=1 npx vitest run lib/mcp/toolDocs.test.ts").toBe(rendered);
  });
});
