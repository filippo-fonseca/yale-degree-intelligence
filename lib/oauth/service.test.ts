import { createHash } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { MemoryOAuthStore } from "./memoryStore";
import {
  OAuthError,
  RedirectableAuthorizeError,
  UnredirectableAuthorizeError,
  approveAuthorization,
  connectionStatus,
  createPersonalToken,
  denyAuthorization,
  exchangeToken,
  listConnections,
  registerClient,
  revokeConnection,
  revokeToken,
  validateAuthorizeRequest,
  verifyAccessToken,
  type OAuthDeps,
} from "./service";
import { checkRedirectUri, redirectUriMatches } from "./redirectUris";

const RESOURCE = "https://degreeint.test/mcp";
const ISSUER = "https://degreeint.test";
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";
const VERIFIER = "a".repeat(20) + "-verifier-" + "b".repeat(30);
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");

let store: MemoryOAuthStore;
let clock: number;
let deps: OAuthDeps;

beforeEach(() => {
  store = new MemoryOAuthStore();
  clock = Date.UTC(2026, 10, 14, 12);
  deps = { store, now: () => clock, resource: RESOURCE, issuer: ISSUER };
});

async function register(extra: Record<string, unknown> = {}) {
  return registerClient(deps, {
    client_name: "Claude",
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: "none",
    ...extra,
  });
}

function authParams(clientId: string, extra: Record<string, string> = {}) {
  return {
    response_type: "code",
    client_id: clientId,
    redirect_uri: REDIRECT,
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    state: "xyz",
    resource: RESOURCE,
    ...extra,
  };
}

async function connect(uid = "alice", scopes?: string[]) {
  const client = await register();
  const redirect = await approveAuthorization(deps, {
    uid,
    email: `${uid}@yale.edu`,
    params: authParams(client.client_id),
    grantedScopes: scopes,
  });
  const code = new URL(redirect).searchParams.get("code")!;
  const tokens = await exchangeToken(
    deps,
    { grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT, resource: RESOURCE },
    { clientId: client.client_id },
  );
  return { client, code, tokens };
}

async function expectOAuthError(p: Promise<unknown>, error: string) {
  await expect(p).rejects.toBeInstanceOf(OAuthError);
  await p.catch((e: OAuthError) => expect(e.error).toBe(error));
}

describe("redirect URI rules", () => {
  it("allows https, loopback http and app schemes", () => {
    expect(checkRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect").ok).toBe(true);
    expect(checkRedirectUri("http://localhost:6274/oauth/callback").ok).toBe(true);
    expect(checkRedirectUri("http://127.0.0.1:33418/callback").ok).toBe(true);
    expect(checkRedirectUri("cursor://anysphere.cursor-retrieval/oauth/callback").ok).toBe(true);
  });

  it("refuses dangerous or sloppy URIs", () => {
    expect(checkRedirectUri("javascript:alert(1)").ok).toBe(false);
    expect(checkRedirectUri("data:text/html,hi").ok).toBe(false);
    expect(checkRedirectUri("http://evil.example/cb").ok).toBe(false);
    expect(checkRedirectUri("https://claude.ai/cb#frag").ok).toBe(false);
    expect(checkRedirectUri("https://user:pw@claude.ai/cb").ok).toBe(false);
    expect(checkRedirectUri("not a url").ok).toBe(false);
  });

  it("lets loopback redirects change port but nothing else", () => {
    expect(redirectUriMatches("http://localhost:1234/cb", "http://localhost:5555/cb")).toBe(true);
    expect(redirectUriMatches("http://localhost:1234/cb", "http://localhost:5555/other")).toBe(false);
    expect(redirectUriMatches("https://a.com/cb", "https://a.com/cb2")).toBe(false);
  });
});

describe("dynamic client registration", () => {
  it("registers a public client without a secret", async () => {
    const res = await register();
    expect(res.client_id).toMatch(/^dicl_/);
    expect(res.client_secret).toBeUndefined();
    expect(res.token_endpoint_auth_method).toBe("none");
    expect(store.clients.get(res.client_id)?.clientName).toBe("Claude");
  });

  it("issues a secret to confidential clients and stores only its hash", async () => {
    const res = await register({ token_endpoint_auth_method: "client_secret_post" });
    expect(res.client_secret).toMatch(/^dics_/);
    const stored = store.clients.get(res.client_id)!;
    expect(JSON.stringify(stored)).not.toContain(res.client_secret!);
  });

  it("rejects bad metadata", async () => {
    await expectOAuthError(registerClient(deps, { redirect_uris: [] }), "invalid_redirect_uri");
    await expectOAuthError(registerClient(deps, { redirect_uris: ["javascript:x"] }), "invalid_redirect_uri");
    await expectOAuthError(
      registerClient(deps, { redirect_uris: [REDIRECT], grant_types: ["client_credentials"] }),
      "invalid_client_metadata",
    );
    await expectOAuthError(
      registerClient(deps, { redirect_uris: [REDIRECT], scope: "admin" }),
      "invalid_client_metadata",
    );
  });
});

describe("authorization request validation", () => {
  it("does not redirect when the client or redirect is in doubt", async () => {
    await expect(validateAuthorizeRequest(deps, authParams("dicl_nope"))).rejects.toBeInstanceOf(
      UnredirectableAuthorizeError,
    );
    const client = await register();
    await expect(
      validateAuthorizeRequest(deps, authParams(client.client_id, { redirect_uri: "https://evil.example/cb" })),
    ).rejects.toBeInstanceOf(UnredirectableAuthorizeError);
  });

  it("requires PKCE with S256", async () => {
    const client = await register();
    const noPkce = validateAuthorizeRequest(deps, { ...authParams(client.client_id), code_challenge: null });
    await expect(noPkce).rejects.toBeInstanceOf(RedirectableAuthorizeError);
    const plain = validateAuthorizeRequest(deps, authParams(client.client_id, { code_challenge_method: "plain" }));
    await plain.catch((e: RedirectableAuthorizeError) => {
      expect(e.redirectTo).toContain("error=invalid_request");
      expect(e.redirectTo).toContain("state=xyz");
      expect(e.redirectTo.startsWith(REDIRECT)).toBe(true);
    });
  });

  it("rejects unknown scopes and foreign resources", async () => {
    const client = await register();
    await validateAuthorizeRequest(deps, authParams(client.client_id, { scope: "degree:read admin" })).catch(
      (e: RedirectableAuthorizeError) => expect(e.error).toBe("invalid_scope"),
    );
    await validateAuthorizeRequest(deps, authParams(client.client_id, { resource: "https://other.test/mcp" })).catch(
      (e: RedirectableAuthorizeError) => expect(e.error).toBe("invalid_target"),
    );
  });

  it("defaults to read and write, accepts the origin as the resource, and adds read to write", async () => {
    const client = await register();
    const v = await validateAuthorizeRequest(deps, authParams(client.client_id, { resource: ISSUER + "/" }));
    expect(v.scopes).toEqual(["degree:read", "degree:write"]);
    expect(v.resource).toBe(RESOURCE);
    const w = await validateAuthorizeRequest(deps, authParams(client.client_id, { scope: "degree:write" }));
    expect(w.scopes).toEqual(["degree:read", "degree:write"]);
  });

  it("sends a denial back as access_denied", async () => {
    const client = await register();
    const url = new URL(await denyAuthorization(deps, authParams(client.client_id)));
    expect(url.searchParams.get("error")).toBe("access_denied");
    expect(url.searchParams.get("iss")).toBe(ISSUER);
  });
});

describe("authorization code flow", () => {
  it("issues tokens that resolve to the right student", async () => {
    const { tokens } = await connect("alice");
    expect(tokens.access_token).toMatch(/^dia_/);
    expect(tokens.refresh_token).toMatch(/^dir_/);
    expect(tokens.scope).toBe("degree:read degree:write");
    const ctx = await verifyAccessToken(deps, tokens.access_token);
    expect(ctx).toMatchObject({ uid: "alice", email: "alice@yale.edu", clientName: "Claude" });
  });

  it("never stores a token in the clear", async () => {
    const { tokens } = await connect();
    const dump = JSON.stringify([...Array.from(store.tokens.values()), ...Array.from(store.codes.values())]);
    expect(dump).not.toContain(tokens.access_token);
    expect(dump).not.toContain(tokens.refresh_token);
  });

  it("honours a read-only choice on the consent screen", async () => {
    const { tokens } = await connect("alice", ["degree:read"]);
    expect(tokens.scope).toBe("degree:read");
  });

  it("rejects a wrong PKCE verifier, a wrong redirect, and another client's code", async () => {
    const client = await register();
    const other = await register();
    const mint = async () =>
      new URL(
        await approveAuthorization(deps, { uid: "a", email: "a@yale.edu", params: authParams(client.client_id) }),
      ).searchParams.get("code")!;

    await expectOAuthError(
      exchangeToken(
        deps,
        { grant_type: "authorization_code", code: await mint(), code_verifier: "x".repeat(50), redirect_uri: REDIRECT },
        { clientId: client.client_id },
      ),
      "invalid_grant",
    );
    await expectOAuthError(
      exchangeToken(
        deps,
        { grant_type: "authorization_code", code: await mint(), code_verifier: VERIFIER, redirect_uri: "https://claude.ai/other" },
        { clientId: client.client_id },
      ),
      "invalid_grant",
    );
    await expectOAuthError(
      exchangeToken(
        deps,
        { grant_type: "authorization_code", code: await mint(), code_verifier: VERIFIER, redirect_uri: REDIRECT },
        { clientId: other.client_id },
      ),
      "invalid_grant",
    );
  });

  it("expires codes after five minutes", async () => {
    const client = await register();
    const code = new URL(
      await approveAuthorization(deps, { uid: "a", email: "a@yale.edu", params: authParams(client.client_id) }),
    ).searchParams.get("code")!;
    clock += 6 * 60 * 1000;
    await expectOAuthError(
      exchangeToken(
        deps,
        { grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT },
        { clientId: client.client_id },
      ),
      "invalid_grant",
    );
  });

  it("revokes the grant when a code is replayed", async () => {
    const { client, code, tokens } = await connect();
    await expectOAuthError(
      exchangeToken(
        deps,
        { grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT },
        { clientId: client.client_id },
      ),
      "invalid_grant",
    );
    expect(await verifyAccessToken(deps, tokens.access_token)).toBeNull();
  });

  it("checks confidential client secrets", async () => {
    const client = await register({ token_endpoint_auth_method: "client_secret_basic" });
    const code = new URL(
      await approveAuthorization(deps, { uid: "a", email: "a@yale.edu", params: authParams(client.client_id) }),
    ).searchParams.get("code")!;
    const form = { grant_type: "authorization_code", code, code_verifier: VERIFIER, redirect_uri: REDIRECT };
    await expectOAuthError(exchangeToken(deps, form, { clientId: client.client_id, clientSecret: "dics_wrong" }), "invalid_client");
  });
});

describe("refresh tokens", () => {
  it("rotates on every use", async () => {
    const { client, tokens } = await connect();
    const next = await exchangeToken(
      deps,
      { grant_type: "refresh_token", refresh_token: tokens.refresh_token },
      { clientId: client.client_id },
    );
    expect(next.refresh_token).not.toBe(tokens.refresh_token);
    expect(await verifyAccessToken(deps, next.access_token)).not.toBeNull();
  });

  it("forgives a quick retry but revokes on a late replay", async () => {
    const { client, tokens } = await connect();
    const next = await exchangeToken(
      deps,
      { grant_type: "refresh_token", refresh_token: tokens.refresh_token },
      { clientId: client.client_id },
    );
    clock += 2000;
    await expectOAuthError(
      exchangeToken(deps, { grant_type: "refresh_token", refresh_token: tokens.refresh_token }, { clientId: client.client_id }),
      "invalid_grant",
    );
    expect(await verifyAccessToken(deps, next.access_token)).not.toBeNull();

    clock += 60_000;
    await expectOAuthError(
      exchangeToken(deps, { grant_type: "refresh_token", refresh_token: tokens.refresh_token }, { clientId: client.client_id }),
      "invalid_grant",
    );
    expect(await verifyAccessToken(deps, next.access_token)).toBeNull();
  });

  it("can only narrow scope", async () => {
    const { client, tokens } = await connect("a", ["degree:read"]);
    await expectOAuthError(
      exchangeToken(
        deps,
        { grant_type: "refresh_token", refresh_token: tokens.refresh_token, scope: "degree:read degree:write" },
        { clientId: client.client_id },
      ),
      "invalid_scope",
    );
  });
});

describe("access tokens at the resource server", () => {
  it("expire after an hour", async () => {
    const { tokens } = await connect();
    clock += 61 * 60 * 1000;
    expect(await verifyAccessToken(deps, tokens.access_token)).toBeNull();
  });

  it("are bound to this resource", async () => {
    const { tokens } = await connect();
    const elsewhere = { ...deps, resource: "https://other.test/mcp" };
    expect(await verifyAccessToken(elsewhere, tokens.access_token)).toBeNull();
  });

  it("reject garbage", async () => {
    expect(await verifyAccessToken(deps, "dia_nope")).toBeNull();
    expect(await verifyAccessToken(deps, "Bearer x")).toBeNull();
    expect(await verifyAccessToken(deps, null)).toBeNull();
  });

  it("stop working after RFC 7009 revocation of the refresh token", async () => {
    const { client, tokens } = await connect();
    await revokeToken(deps, tokens.refresh_token, { clientId: client.client_id });
    expect(await verifyAccessToken(deps, tokens.access_token)).toBeNull();
  });
});

describe("the student's connections", () => {
  it("lists only their own and lets only them revoke", async () => {
    const alice = await connect("alice");
    await connect("bob");
    const list = await listConnections(deps, "alice");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ clientName: "Claude", redirectHost: "claude.ai", status: "active" });

    expect(await revokeConnection(deps, "bob", list[0].id)).toBe(false);
    expect(await verifyAccessToken(deps, alice.tokens.access_token)).not.toBeNull();

    expect(await revokeConnection(deps, "alice", list[0].id)).toBe(true);
    expect(await verifyAccessToken(deps, alice.tokens.access_token)).toBeNull();
    expect((await listConnections(deps, "alice"))[0].status).toBe("revoked");
  });

  it("reports idle and expired connections", async () => {
    await connect("alice");
    const grant = Array.from(store.grants.values())[0];
    expect(connectionStatus(grant, clock + 8 * 24 * 3600 * 1000)).toBe("idle");
    expect(connectionStatus(grant, clock + 31 * 24 * 3600 * 1000)).toBe("expired");
  });
});

describe("personal access tokens", () => {
  const make = (extra: Record<string, unknown> = {}) =>
    createPersonalToken(deps, {
      uid: "alice",
      email: "alice@yale.edu",
      name: "Grok bot",
      scopes: ["degree:read"],
      days: 30,
      ...extra,
    });

  it("work as a bearer token until they expire", async () => {
    const result = await make();
    const access = await verifyAccessToken(deps, result.token);
    expect(access).toMatchObject({ uid: "alice", clientName: "Grok bot", scopes: ["degree:read"] });
    clock += 31 * 24 * 3600 * 1000;
    expect(await verifyAccessToken(deps, result.token)).toBeNull();
  });

  it("show up as connections and stop working when revoked", async () => {
    const result = await make({ scopes: ["degree:write"] });
    expect(result.scopes).toEqual(["degree:read", "degree:write"]);
    const [conn] = await listConnections(deps, "alice");
    expect(conn).toMatchObject({ kind: "personal", clientName: "Grok bot", status: "active" });
    expect(await revokeConnection(deps, "alice", conn.id)).toBe(true);
    expect(await verifyAccessToken(deps, result.token)).toBeNull();
  });

  it("store only the hash and validate input", async () => {
    const result = await make();
    expect(JSON.stringify(Array.from(store.tokens.values()))).not.toContain(result.token);
    await expectOAuthError(make({ days: 365 }), "invalid_request");
    await expectOAuthError(make({ name: "" }), "invalid_request");
    await expectOAuthError(make({ scopes: [] }), "invalid_scope");
    await expectOAuthError(make({ scopes: ["admin"] }), "invalid_scope");
  });

  it("can't be refreshed or used by a registered client", async () => {
    const result = await make();
    const client = await register();
    await revokeToken(deps, result.token, { clientId: client.client_id });
    expect(await verifyAccessToken(deps, result.token)).not.toBeNull();
  });
});
