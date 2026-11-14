import type {
  AuthorizationCode,
  ConsumeCodeResult,
  Grant,
  MarkRefreshResult,
  OAuthClient,
  OAuthStore,
  TokenRecord,
} from "./types";

/** In-memory OAuthStore for tests. Single-threaded JS makes it atomic. */
export class MemoryOAuthStore implements OAuthStore {
  clients = new Map<string, OAuthClient>();
  codes = new Map<string, AuthorizationCode>();
  grants = new Map<string, Grant>();
  tokens = new Map<string, TokenRecord>();

  async getClient(id: string) {
    return structuredClone(this.clients.get(id) ?? null);
  }
  async putClient(client: OAuthClient) {
    this.clients.set(client.clientId, structuredClone(client));
  }
  async putCode(code: AuthorizationCode) {
    this.codes.set(code.codeHash, structuredClone(code));
  }
  async consumeCode(codeHash: string, now: number): Promise<ConsumeCodeResult> {
    const code = this.codes.get(codeHash);
    if (!code) return { status: "missing" };
    if (code.usedAt) return { status: "reused", code: structuredClone(code) };
    const before = structuredClone(code);
    code.usedAt = now;
    return { status: "ok", code: before };
  }
  async attachGrantToCode(codeHash: string, grantId: string) {
    const code = this.codes.get(codeHash);
    if (code) code.grantId = grantId;
  }
  async putGrant(grant: Grant) {
    this.grants.set(grant.grantId, structuredClone(grant));
  }
  async getGrant(id: string) {
    return structuredClone(this.grants.get(id) ?? null);
  }
  async updateGrant(id: string, patch: Partial<Grant>) {
    const g = this.grants.get(id);
    if (g) Object.assign(g, structuredClone(patch));
  }
  async listGrantsForUser(uid: string) {
    return Array.from(this.grants.values()).filter((g) => g.uid === uid).map((g) => structuredClone(g));
  }
  async putToken(token: TokenRecord) {
    this.tokens.set(token.tokenHash, structuredClone(token));
  }
  async getToken(hash: string) {
    return structuredClone(this.tokens.get(hash) ?? null);
  }
  async deleteToken(hash: string) {
    this.tokens.delete(hash);
  }
  async markRefreshUsed(hash: string, now: number): Promise<MarkRefreshResult> {
    const t = this.tokens.get(hash);
    if (!t || t.kind !== "refresh") return { status: "missing" };
    if (t.usedAt) return { status: "reused", token: structuredClone(t) };
    const before = structuredClone(t);
    t.usedAt = now;
    return { status: "ok", token: before };
  }
  async deleteTokensForGrant(grantId: string) {
    for (const [hash, t] of Array.from(this.tokens.entries())) if (t.grantId === grantId) this.tokens.delete(hash);
  }
}
