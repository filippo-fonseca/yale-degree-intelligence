/**
 * Records the authorization server keeps. All times are epoch milliseconds.
 * Secrets (client secrets, codes, tokens) are stored only as SHA-256 hashes.
 */

export type TokenEndpointAuthMethod =
  | "none"
  | "client_secret_post"
  | "client_secret_basic";

/** A dynamically registered OAuth client (RFC 7591). */
export type OAuthClient = {
  clientId: string;
  /** Self-asserted by whoever registered it. Never treated as verified. */
  clientName: string;
  redirectUris: string[];
  clientUri?: string;
  logoUri?: string;
  softwareId?: string;
  softwareVersion?: string;
  tokenEndpointAuthMethod: TokenEndpointAuthMethod;
  clientSecretHash?: string;
  grantTypes: string[];
  createdAt: number;
};

/** A one-time authorization code, kept after use so a replay can be caught. */
export type AuthorizationCode = {
  codeHash: string;
  clientId: string;
  uid: string;
  email: string;
  redirectUri: string;
  codeChallenge: string;
  scopes: string[];
  resource: string;
  createdAt: number;
  expiresAt: number;
  usedAt?: number;
  /** The grant the code was exchanged for, so a replay can revoke it. */
  grantId?: string;
};

/**
 * One connection between a student and one client: what the Settings page
 * lists, and what revoking cuts. Every token belongs to exactly one grant.
 */
export type Grant = {
  grantId: string;
  uid: string;
  email: string;
  clientId: string;
  clientName: string;
  redirectUri: string;
  scopes: string[];
  resource: string;
  createdAt: number;
  lastUsedAt?: number;
  /** Expiry of the newest refresh token. Past it, the client must reconnect. */
  refreshExpiresAt: number;
  revokedAt?: number;
  revokedReason?: "user" | "refresh_token_reuse" | "code_reuse" | "client";
};

export type TokenKind = "access" | "refresh";

export type TokenRecord = {
  tokenHash: string;
  kind: TokenKind;
  grantId: string;
  uid: string;
  clientId: string;
  scopes: string[];
  resource: string;
  createdAt: number;
  expiresAt: number;
  /** Refresh tokens only: when it was rotated away. */
  usedAt?: number;
};

export type ConsumeCodeResult =
  | { status: "ok"; code: AuthorizationCode }
  | { status: "missing" }
  | { status: "reused"; code: AuthorizationCode };

export type MarkRefreshResult =
  | { status: "ok"; token: TokenRecord }
  | { status: "missing" }
  | { status: "reused"; token: TokenRecord };

/**
 * Storage the OAuth service needs. Two implementations: Firestore (Admin SDK,
 * production) and in-memory (tests). The two operations that must be atomic
 * are `consumeCode` and `markRefreshUsed`: both are check-then-set races that
 * would otherwise let one code or refresh token be redeemed twice.
 */
export interface OAuthStore {
  getClient(clientId: string): Promise<OAuthClient | null>;
  putClient(client: OAuthClient): Promise<void>;

  putCode(code: AuthorizationCode): Promise<void>;
  /** Atomically marks the code used and returns it as it was before. */
  consumeCode(codeHash: string, now: number): Promise<ConsumeCodeResult>;
  attachGrantToCode(codeHash: string, grantId: string): Promise<void>;

  putGrant(grant: Grant): Promise<void>;
  getGrant(grantId: string): Promise<Grant | null>;
  updateGrant(grantId: string, patch: Partial<Grant>): Promise<void>;
  listGrantsForUser(uid: string): Promise<Grant[]>;

  putToken(token: TokenRecord): Promise<void>;
  getToken(tokenHash: string): Promise<TokenRecord | null>;
  deleteToken(tokenHash: string): Promise<void>;
  /** Atomically marks a refresh token rotated and returns it as it was. */
  markRefreshUsed(tokenHash: string, now: number): Promise<MarkRefreshResult>;
  deleteTokensForGrant(grantId: string): Promise<void>;
}
