/**
 * The OAuth 2.1 authorization server behind the MCP endpoint. SERVER ONLY.
 *
 * Implements what the MCP authorization spec asks of a server:
 * - Dynamic client registration (RFC 7591)
 * - Authorization code grant with mandatory PKCE S256 (OAuth 2.1)
 * - Refresh tokens, rotated on every use, with replay detection
 * - Resource indicators (RFC 8707): tokens are bound to the MCP resource
 * - Token revocation (RFC 7009)
 *
 * Pure over an OAuthStore and a clock, so the whole flow is unit-tested
 * against the in-memory store. Identity comes from the app's existing Firebase
 * sign-in: by the time approveAuthorization runs, the route has verified a
 * Firebase ID token and the Yale email gate.
 */

import {
  ACCESS_TOKEN_TTL_SECONDS,
  AUTH_CODE_TTL_SECONDS,
  REFRESH_REUSE_GRACE_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  SCOPE_READ,
  SCOPE_WRITE,
  isSupportedScope,
  normalizeScopes,
  parseScopes,
} from "./config";
import {
  isValidCodeChallenge,
  randomToken,
  safeEqual,
  sha256Hex,
  verifyPkceS256,
} from "./crypto";
import {
  checkRedirectUri,
  redirectDisplayHost,
  redirectUriMatches,
} from "./redirectUris";
import type {
  Grant,
  OAuthClient,
  OAuthStore,
  TokenEndpointAuthMethod,
  TokenRecord,
} from "./types";
import { knownMetadataClient } from "./knownClients";

/** A registered client: one of ours from /register, or a pinned metadata-document client. */
async function lookupClient(deps: OAuthDeps, clientId: string): Promise<OAuthClient | null> {
  return knownMetadataClient(clientId) ?? deps.store.getClient(clientId);
}

export class OAuthError extends Error {
  constructor(
    public readonly error: string,
    public readonly description: string,
    public readonly status = 400,
  ) {
    super(description);
  }

  toJSON() {
    return { error: this.error, error_description: this.description };
  }
}

export type OAuthDeps = {
  store: OAuthStore;
  now?: () => number;
  /** The MCP resource URL tokens are issued for (RFC 8707 audience). */
  resource: string;
  /** This server's issuer, echoed as `iss` on redirects (RFC 9207). */
  issuer: string;
};

const ACCESS_PREFIX = "dia_";
const REFRESH_PREFIX = "dir_";
const CODE_PREFIX = "dic_";

const now = (deps: OAuthDeps) => (deps.now ? deps.now() : Date.now());

// ---------------------------------------------------------------------------
// Dynamic client registration (RFC 7591)
// ---------------------------------------------------------------------------

export type RegistrationResponse = {
  client_id: string;
  client_id_issued_at: number;
  client_secret?: string;
  client_secret_expires_at?: number;
  client_name: string;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: TokenEndpointAuthMethod;
  scope: string;
  client_uri?: string;
  logo_uri?: string;
};

const AUTH_METHODS: TokenEndpointAuthMethod[] = [
  "none",
  "client_secret_post",
  "client_secret_basic",
];

function optionalUrl(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") {
    throw new OAuthError("invalid_client_metadata", `${field} must be a string`);
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
  } catch {
    throw new OAuthError("invalid_client_metadata", `${field} must be an http(s) URL`);
  }
  return value;
}

function optionalString(value: unknown, field: string, max = 200): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== "string" || value.length > max) {
    throw new OAuthError("invalid_client_metadata", `${field} must be a string of at most ${max} characters`);
  }
  return value;
}

export async function registerClient(
  deps: OAuthDeps,
  metadata: Record<string, unknown>,
): Promise<RegistrationResponse> {
  const rawUris = metadata.redirect_uris;
  if (!Array.isArray(rawUris) || rawUris.length === 0) {
    throw new OAuthError("invalid_redirect_uri", "redirect_uris must be a non-empty array");
  }
  if (rawUris.length > 10) {
    throw new OAuthError("invalid_redirect_uri", "at most 10 redirect_uris may be registered");
  }
  for (const uri of rawUris) {
    const check = checkRedirectUri(uri);
    if (!check.ok) throw new OAuthError("invalid_redirect_uri", check.reason);
  }
  const redirectUris = rawUris as string[];

  const grantTypes = (metadata.grant_types as unknown) ?? ["authorization_code", "refresh_token"];
  if (
    !Array.isArray(grantTypes) ||
    grantTypes.some((g) => g !== "authorization_code" && g !== "refresh_token") ||
    !grantTypes.includes("authorization_code")
  ) {
    throw new OAuthError(
      "invalid_client_metadata",
      "grant_types must include authorization_code and may include refresh_token",
    );
  }

  const responseTypes = (metadata.response_types as unknown) ?? ["code"];
  if (!Array.isArray(responseTypes) || responseTypes.some((r) => r !== "code")) {
    throw new OAuthError("invalid_client_metadata", "response_types may only contain code");
  }

  // RFC 7591 defaults to client_secret_basic, but MCP clients are almost all
  // public clients that say "none". Honour whatever they ask for.
  const method = (metadata.token_endpoint_auth_method ?? "client_secret_basic") as TokenEndpointAuthMethod;
  if (!AUTH_METHODS.includes(method)) {
    throw new OAuthError(
      "invalid_client_metadata",
      `token_endpoint_auth_method must be one of ${AUTH_METHODS.join(", ")}`,
    );
  }

  if (metadata.scope !== undefined) {
    const requested = parseScopes(String(metadata.scope));
    const unknown = requested.filter((s) => !isSupportedScope(s));
    if (unknown.length > 0) {
      throw new OAuthError("invalid_client_metadata", `unsupported scope: ${unknown.join(" ")}`);
    }
  }

  const clientName =
    optionalString(metadata.client_name, "client_name", 100)?.trim() ||
    redirectDisplayHost(redirectUris[0]);

  const issuedAt = now(deps);
  const clientId = `dicl_${randomToken(18)}`;
  const secret = method === "none" ? undefined : `dics_${randomToken(32)}`;

  const client: OAuthClient = {
    clientId,
    clientName,
    redirectUris,
    clientUri: optionalUrl(metadata.client_uri, "client_uri"),
    logoUri: optionalUrl(metadata.logo_uri, "logo_uri"),
    softwareId: optionalString(metadata.software_id, "software_id"),
    softwareVersion: optionalString(metadata.software_version, "software_version"),
    tokenEndpointAuthMethod: method,
    clientSecretHash: secret ? sha256Hex(secret) : undefined,
    grantTypes: grantTypes as string[],
    createdAt: issuedAt,
  };
  await deps.store.putClient(client);

  return {
    client_id: clientId,
    client_id_issued_at: Math.floor(issuedAt / 1000),
    ...(secret ? { client_secret: secret, client_secret_expires_at: 0 } : {}),
    client_name: clientName,
    redirect_uris: redirectUris,
    grant_types: client.grantTypes,
    response_types: ["code"],
    token_endpoint_auth_method: method,
    scope: `${SCOPE_READ} ${SCOPE_WRITE}`,
    ...(client.clientUri ? { client_uri: client.clientUri } : {}),
    ...(client.logoUri ? { logo_uri: client.logoUri } : {}),
  };
}

// ---------------------------------------------------------------------------
// Authorization endpoint
// ---------------------------------------------------------------------------

export type AuthorizeParams = {
  response_type?: string | null;
  client_id?: string | null;
  redirect_uri?: string | null;
  scope?: string | null;
  state?: string | null;
  code_challenge?: string | null;
  code_challenge_method?: string | null;
  resource?: string | null;
};

export type ValidAuthorizeRequest = {
  client: OAuthClient;
  redirectUri: string;
  scopes: string[];
  state?: string;
  codeChallenge: string;
  resource: string;
};

/**
 * Errors that must not be sent back to the redirect URI, because the client
 * or the redirect URI itself is in doubt: the consent page shows them instead.
 */
export class UnredirectableAuthorizeError extends Error {}

/** An error the client should hear about, at its own redirect URI. */
export class RedirectableAuthorizeError extends Error {
  constructor(
    public readonly redirectTo: string,
    public readonly error: string,
    description: string,
  ) {
    super(description);
  }
}

export function errorRedirect(
  deps: OAuthDeps,
  redirectUri: string,
  error: string,
  description: string,
  state?: string | null,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  url.searchParams.set("error_description", description);
  if (state) url.searchParams.set("state", state);
  url.searchParams.set("iss", deps.issuer);
  return url.toString();
}

/** Accepts the resource as our MCP URL, with or without a trailing slash. */
function resolveResource(deps: OAuthDeps, raw: string | null | undefined): string | null {
  if (!raw) return deps.resource;
  const strip = (s: string) => s.replace(/\/+$/, "");
  if (strip(raw) === strip(deps.resource)) return deps.resource;
  // Some clients send the server's origin rather than the endpoint URL.
  try {
    if (strip(raw) === new URL(deps.resource).origin) return deps.resource;
  } catch {
    // fall through
  }
  return null;
}

export async function validateAuthorizeRequest(
  deps: OAuthDeps,
  params: AuthorizeParams,
): Promise<ValidAuthorizeRequest> {
  if (!params.client_id) {
    throw new UnredirectableAuthorizeError("The app that sent you here did not say who it is (missing client_id).");
  }
  const client = await lookupClient(deps, params.client_id);
  if (!client) {
    throw new UnredirectableAuthorizeError(
      "This app is not registered with Degree Intelligence. Try connecting again from the app.",
    );
  }

  let redirectUri: string | undefined;
  if (params.redirect_uri) {
    if (!client.redirectUris.some((r) => redirectUriMatches(r, params.redirect_uri!))) {
      throw new UnredirectableAuthorizeError(
        "The return address this app asked for does not match the one it registered.",
      );
    }
    redirectUri = params.redirect_uri;
  } else if (client.redirectUris.length === 1) {
    redirectUri = client.redirectUris[0];
  } else {
    throw new UnredirectableAuthorizeError("The app did not say where to send you back (missing redirect_uri).");
  }

  const state = params.state ?? undefined;
  const fail = (error: string, description: string) => {
    throw new RedirectableAuthorizeError(
      errorRedirect(deps, redirectUri!, error, description, state),
      error,
      description,
    );
  };

  if (params.response_type !== "code") {
    fail("unsupported_response_type", "response_type must be code");
  }
  if (!params.code_challenge) {
    fail("invalid_request", "code_challenge is required (PKCE)");
  }
  if (params.code_challenge_method !== "S256") {
    fail("invalid_request", "code_challenge_method must be S256");
  }
  if (!isValidCodeChallenge(params.code_challenge!)) {
    fail("invalid_request", "code_challenge is not a valid S256 challenge");
  }

  const requested = parseScopes(params.scope);
  const unknown = requested.filter((s) => !isSupportedScope(s));
  if (unknown.length > 0) {
    fail("invalid_scope", `unsupported scope: ${unknown.join(" ")}`);
  }
  // No scope requested means "everything this server offers"; the student
  // can still narrow it to read-only on the consent screen.
  const scopes = normalizeScopes(requested.length ? requested : [SCOPE_READ, SCOPE_WRITE]);

  const resource = resolveResource(deps, params.resource);
  if (!resource) {
    fail("invalid_target", "resource must be this server's MCP endpoint");
  }

  return {
    client,
    redirectUri: redirectUri!,
    scopes,
    state,
    codeChallenge: params.code_challenge!,
    resource: resource!,
  };
}

/**
 * The student said yes. Issues a single-use code and returns the URL to send
 * the browser to. `grantedScopes` may only narrow what was requested.
 */
export async function approveAuthorization(
  deps: OAuthDeps,
  input: {
    uid: string;
    email: string;
    params: AuthorizeParams;
    grantedScopes?: string[];
  },
): Promise<string> {
  const request = await validateAuthorizeRequest(deps, input.params);
  const granted = input.grantedScopes
    ? normalizeScopes(input.grantedScopes.filter((s) => request.scopes.includes(s)))
    : request.scopes;
  if (granted.length === 0) {
    return errorRedirect(deps, request.redirectUri, "access_denied", "No access was granted", request.state);
  }

  const code = `${CODE_PREFIX}${randomToken(32)}`;
  const issued = now(deps);
  await deps.store.putCode({
    codeHash: sha256Hex(code),
    clientId: request.client.clientId,
    uid: input.uid,
    email: input.email,
    redirectUri: request.redirectUri,
    codeChallenge: request.codeChallenge,
    scopes: granted,
    resource: request.resource,
    createdAt: issued,
    expiresAt: issued + AUTH_CODE_TTL_SECONDS * 1000,
  });

  const url = new URL(request.redirectUri);
  url.searchParams.set("code", code);
  if (request.state) url.searchParams.set("state", request.state);
  url.searchParams.set("iss", deps.issuer);
  return url.toString();
}

export async function denyAuthorization(
  deps: OAuthDeps,
  params: AuthorizeParams,
): Promise<string> {
  const request = await validateAuthorizeRequest(deps, params);
  return errorRedirect(
    deps,
    request.redirectUri,
    "access_denied",
    "The student declined to connect this app",
    request.state,
  );
}

// ---------------------------------------------------------------------------
// Token endpoint
// ---------------------------------------------------------------------------

export type TokenResponse = {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
};

export type ClientCredentials = {
  clientId?: string;
  clientSecret?: string;
  /** How the secret arrived, so it can be checked against the registration. */
  via?: "basic" | "post";
};

async function authenticateClient(
  deps: OAuthDeps,
  creds: ClientCredentials,
): Promise<OAuthClient> {
  if (!creds.clientId) throw new OAuthError("invalid_client", "client_id is required", 401);
  const client = await lookupClient(deps, creds.clientId);
  if (!client) throw new OAuthError("invalid_client", "unknown client", 401);

  if (client.tokenEndpointAuthMethod === "none") return client;

  if (!creds.clientSecret || !client.clientSecretHash) {
    throw new OAuthError("invalid_client", "client authentication failed", 401);
  }
  if (!safeEqual(sha256Hex(creds.clientSecret), client.clientSecretHash)) {
    throw new OAuthError("invalid_client", "client authentication failed", 401);
  }
  return client;
}

async function issueTokens(
  deps: OAuthDeps,
  grant: Grant,
  scopes: string[],
): Promise<TokenResponse> {
  const issued = now(deps);
  const access = `${ACCESS_PREFIX}${randomToken(32)}`;
  const refresh = `${REFRESH_PREFIX}${randomToken(32)}`;
  const base = {
    grantId: grant.grantId,
    uid: grant.uid,
    clientId: grant.clientId,
    scopes,
    resource: grant.resource,
    createdAt: issued,
  };
  const refreshExpiresAt = issued + REFRESH_TOKEN_TTL_SECONDS * 1000;
  await deps.store.putToken({
    ...base,
    tokenHash: sha256Hex(access),
    kind: "access",
    expiresAt: issued + ACCESS_TOKEN_TTL_SECONDS * 1000,
  });
  await deps.store.putToken({
    ...base,
    tokenHash: sha256Hex(refresh),
    kind: "refresh",
    expiresAt: refreshExpiresAt,
  });
  await deps.store.updateGrant(grant.grantId, { refreshExpiresAt });
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refresh,
    scope: scopes.join(" "),
  };
}

export async function revokeGrant(
  deps: OAuthDeps,
  grantId: string,
  reason: NonNullable<Grant["revokedReason"]>,
): Promise<void> {
  const grant = await deps.store.getGrant(grantId);
  if (!grant) return;
  if (!grant.revokedAt) {
    await deps.store.updateGrant(grantId, { revokedAt: now(deps), revokedReason: reason });
  }
  await deps.store.deleteTokensForGrant(grantId);
}

export async function exchangeToken(
  deps: OAuthDeps,
  form: Record<string, string | undefined>,
  creds: ClientCredentials,
): Promise<TokenResponse> {
  const grantType = form.grant_type;
  if (grantType === "authorization_code") return exchangeAuthorizationCode(deps, form, creds);
  if (grantType === "refresh_token") return exchangeRefreshToken(deps, form, creds);
  throw new OAuthError("unsupported_grant_type", "grant_type must be authorization_code or refresh_token");
}

async function exchangeAuthorizationCode(
  deps: OAuthDeps,
  form: Record<string, string | undefined>,
  creds: ClientCredentials,
): Promise<TokenResponse> {
  const client = await authenticateClient(deps, creds);
  if (!form.code) throw new OAuthError("invalid_request", "code is required");
  if (!form.code_verifier) throw new OAuthError("invalid_request", "code_verifier is required (PKCE)");

  const t = now(deps);
  const result = await deps.store.consumeCode(sha256Hex(form.code), t);
  if (result.status === "missing") {
    throw new OAuthError("invalid_grant", "authorization code is invalid");
  }
  if (result.status === "reused") {
    // RFC 6749 section 4.1.2: a replayed code revokes what it was exchanged for.
    if (result.code.grantId) await revokeGrant(deps, result.code.grantId, "code_reuse");
    throw new OAuthError("invalid_grant", "authorization code was already used");
  }
  const code = result.code;
  if (code.clientId !== client.clientId) {
    throw new OAuthError("invalid_grant", "authorization code was issued to another client");
  }
  if (code.expiresAt <= t) throw new OAuthError("invalid_grant", "authorization code expired");
  if (!form.redirect_uri || form.redirect_uri !== code.redirectUri) {
    throw new OAuthError("invalid_grant", "redirect_uri does not match the authorization request");
  }
  if (!verifyPkceS256(form.code_verifier, code.codeChallenge)) {
    throw new OAuthError("invalid_grant", "code_verifier does not match code_challenge");
  }
  if (form.resource) {
    const resource = resolveResource(deps, form.resource);
    if (resource !== code.resource) {
      throw new OAuthError("invalid_target", "resource does not match the authorization request");
    }
  }

  const grant: Grant = {
    grantId: `dig_${randomToken(18)}`,
    uid: code.uid,
    email: code.email,
    clientId: client.clientId,
    clientName: client.clientName,
    redirectUri: code.redirectUri,
    scopes: code.scopes,
    resource: code.resource,
    createdAt: t,
    refreshExpiresAt: t + REFRESH_TOKEN_TTL_SECONDS * 1000,
  };
  await deps.store.putGrant(grant);
  await deps.store.attachGrantToCode(code.codeHash, grant.grantId);
  return issueTokens(deps, grant, grant.scopes);
}

async function exchangeRefreshToken(
  deps: OAuthDeps,
  form: Record<string, string | undefined>,
  creds: ClientCredentials,
): Promise<TokenResponse> {
  const client = await authenticateClient(deps, creds);
  if (!form.refresh_token) throw new OAuthError("invalid_request", "refresh_token is required");

  const t = now(deps);
  const hash = sha256Hex(form.refresh_token);
  const existing = await deps.store.getToken(hash);
  if (!existing || existing.kind !== "refresh") {
    throw new OAuthError("invalid_grant", "refresh token is invalid");
  }
  if (existing.clientId !== client.clientId) {
    throw new OAuthError("invalid_grant", "refresh token was issued to another client");
  }

  const marked = await deps.store.markRefreshUsed(hash, t);
  if (marked.status === "missing") throw new OAuthError("invalid_grant", "refresh token is invalid");
  if (marked.status === "reused") {
    const usedAt = marked.token.usedAt ?? 0;
    if (t - usedAt > REFRESH_REUSE_GRACE_SECONDS * 1000) {
      await revokeGrant(deps, marked.token.grantId, "refresh_token_reuse");
    }
    throw new OAuthError("invalid_grant", "refresh token was already used");
  }
  const token = marked.token;
  if (token.expiresAt <= t) throw new OAuthError("invalid_grant", "refresh token expired");

  const grant = await deps.store.getGrant(token.grantId);
  if (!grant || grant.revokedAt) {
    throw new OAuthError("invalid_grant", "this connection was revoked");
  }

  let scopes = token.scopes;
  if (form.scope) {
    const requested = parseScopes(form.scope);
    if (requested.some((s) => !token.scopes.includes(s))) {
      throw new OAuthError("invalid_scope", "a refresh may only narrow scope");
    }
    scopes = normalizeScopes(requested);
  }
  if (form.resource && resolveResource(deps, form.resource) !== token.resource) {
    throw new OAuthError("invalid_target", "resource does not match this grant");
  }
  return issueTokens(deps, grant, scopes);
}

// ---------------------------------------------------------------------------
// Revocation (RFC 7009)
// ---------------------------------------------------------------------------

/** Always succeeds from the caller's view, as RFC 7009 asks. */
export async function revokeToken(
  deps: OAuthDeps,
  token: string | undefined,
  creds: ClientCredentials,
): Promise<void> {
  const client = await authenticateClient(deps, creds);
  if (!token) return;
  const record = await deps.store.getToken(sha256Hex(token));
  if (!record || record.clientId !== client.clientId) return;
  if (record.kind === "refresh") {
    await revokeGrant(deps, record.grantId, "client");
  } else {
    await deps.store.deleteToken(record.tokenHash);
  }
}

// ---------------------------------------------------------------------------
// Resource server: what /mcp calls on every request
// ---------------------------------------------------------------------------

export type AccessContext = {
  uid: string;
  email: string;
  grantId: string;
  clientId: string;
  clientName: string;
  scopes: string[];
};

const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export async function verifyAccessToken(
  deps: OAuthDeps,
  token: string | undefined | null,
): Promise<AccessContext | null> {
  if (!token || !token.startsWith(ACCESS_PREFIX)) return null;
  const record = await deps.store.getToken(sha256Hex(token));
  if (!record || record.kind !== "access") return null;
  const t = now(deps);
  if (record.expiresAt <= t) return null;
  if (record.resource !== deps.resource) return null;
  const grant = await deps.store.getGrant(record.grantId);
  if (!grant || grant.revokedAt || grant.uid !== record.uid) return null;

  // Last-used is display data for the Settings page, so it is written at
  // most every few minutes rather than on every tool call.
  if (!grant.lastUsedAt || t - grant.lastUsedAt > LAST_USED_WRITE_INTERVAL_MS) {
    await deps.store.updateGrant(grant.grantId, { lastUsedAt: t });
  }

  return {
    uid: record.uid,
    email: grant.email,
    grantId: grant.grantId,
    clientId: grant.clientId,
    clientName: grant.clientName,
    scopes: record.scopes,
  };
}

// ---------------------------------------------------------------------------
// The student's own view: Settings > Connected apps
// ---------------------------------------------------------------------------

export type ConnectionStatus = "active" | "idle" | "expired" | "revoked";

export type ConnectionSummary = {
  id: string;
  kind: "oauth" | "personal";
  clientName: string;
  redirectHost: string;
  scopes: string[];
  connectedAt: number;
  lastUsedAt: number | null;
  status: ConnectionStatus;
  revokedAt: number | null;
  /** When it stops working: the token's expiry, or the refresh token's for OAuth. */
  expiresAt: number;
};

/** Used within this window counts as active; otherwise idle until it expires. */
export const ACTIVE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function connectionStatus(grant: Grant, t: number): ConnectionStatus {
  if (grant.revokedAt) return "revoked";
  if (grant.refreshExpiresAt <= t) return "expired";
  const lastSeen = grant.lastUsedAt ?? grant.createdAt;
  return t - lastSeen <= ACTIVE_WINDOW_MS ? "active" : "idle";
}

export async function listConnections(
  deps: OAuthDeps,
  uid: string,
): Promise<ConnectionSummary[]> {
  const t = now(deps);
  const grants = await deps.store.listGrantsForUser(uid);
  return grants
    .filter((g) => g.uid === uid)
    .map((g) => ({
      id: g.grantId,
      kind: g.kind ?? "oauth",
      clientName: g.clientName,
      redirectHost: g.kind === "personal" ? "" : redirectDisplayHost(g.redirectUri),
      scopes: g.scopes,
      connectedAt: g.createdAt,
      lastUsedAt: g.lastUsedAt ?? null,
      status: connectionStatus(g, t),
      revokedAt: g.revokedAt ?? null,
      expiresAt: g.refreshExpiresAt,
    }))
    .sort((a, b) => (b.lastUsedAt ?? b.connectedAt) - (a.lastUsedAt ?? a.connectedAt));
}

// ---------------------------------------------------------------------------
// Personal access tokens, for clients that can't run the OAuth flow
// ---------------------------------------------------------------------------

export const PERSONAL_TOKEN_MAX_DAYS = 90;
export const PERSONAL_TOKEN_NAME_MAX = 60;

export type PersonalTokenResult = {
  token: string;
  connectionId: string;
  scopes: string[];
  expiresAt: number;
};

/**
 * Creates a token the student pastes into a client by hand. It is a grant like
 * any OAuth connection (listed, audited, revocable in Settings), carrying a
 * single access token that lives for `days` and cannot be refreshed. The
 * plaintext is returned once and never stored.
 */
export async function createPersonalToken(
  deps: OAuthDeps,
  input: { uid: string; email: string; name: unknown; scopes: unknown; days: unknown },
): Promise<PersonalTokenResult> {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (!name || name.length > PERSONAL_TOKEN_NAME_MAX) {
    throw new OAuthError("invalid_request", `name must be 1 to ${PERSONAL_TOKEN_NAME_MAX} characters`);
  }
  const days = input.days;
  if (typeof days !== "number" || !Number.isInteger(days) || days < 1 || days > PERSONAL_TOKEN_MAX_DAYS) {
    throw new OAuthError("invalid_request", `days must be a whole number from 1 to ${PERSONAL_TOKEN_MAX_DAYS}`);
  }
  const requested = Array.isArray(input.scopes) ? input.scopes.filter((x): x is string => typeof x === "string") : [];
  if (requested.some((x) => !isSupportedScope(x))) throw new OAuthError("invalid_scope", "unsupported scope");
  const scopes = normalizeScopes(requested);
  if (scopes.length === 0) throw new OAuthError("invalid_scope", "choose at least one scope");

  const t = now(deps);
  const expiresAt = t + days * 24 * 60 * 60 * 1000;
  const grant: Grant = {
    grantId: `dig_${randomToken(18)}`,
    uid: input.uid,
    email: input.email,
    clientId: "personal",
    clientName: name,
    redirectUri: "",
    scopes,
    resource: deps.resource,
    createdAt: t,
    refreshExpiresAt: expiresAt,
    kind: "personal",
  };
  await deps.store.putGrant(grant);
  const token = `${ACCESS_PREFIX}${randomToken(32)}`;
  await deps.store.putToken({
    tokenHash: sha256Hex(token),
    kind: "access",
    grantId: grant.grantId,
    uid: input.uid,
    clientId: grant.clientId,
    scopes,
    resource: deps.resource,
    createdAt: t,
    expiresAt,
  });
  return { token, connectionId: grant.grantId, scopes, expiresAt };
}

/** Revokes one of the student's own connections. False if it is not theirs. */
export async function revokeConnection(
  deps: OAuthDeps,
  uid: string,
  grantId: string,
): Promise<boolean> {
  const grant = await deps.store.getGrant(grantId);
  if (!grant || grant.uid !== uid) return false;
  await revokeGrant(deps, grantId, "user");
  return true;
}

/** Revokes every connection a student has (account deletion, "disconnect all"). */
export async function revokeAllConnections(deps: OAuthDeps, uid: string): Promise<number> {
  const grants = await deps.store.listGrantsForUser(uid);
  let count = 0;
  for (const g of grants) {
    if (g.uid !== uid) continue;
    await revokeGrant(deps, g.grantId, "user");
    if (!g.revokedAt) count += 1;
  }
  return count;
}

export type { TokenRecord };
