import { Timestamp, type Firestore } from "firebase-admin/firestore";
import type {
  AuthorizationCode,
  ConsumeCodeResult,
  Grant,
  MarkRefreshResult,
  OAuthClient,
  OAuthStore,
  TokenRecord,
} from "./types";

/**
 * Firestore-backed OAuthStore (Admin SDK). SERVER ONLY.
 *
 * Collections, all closed to clients in firestore.rules:
 *   oauth_clients/{clientId}
 *   oauth_codes/{codeHash}        expiresAt for a TTL policy
 *   oauth_grants/{grantId}        one per connected app; the Settings list
 *   oauth_tokens/{tokenHash}      expiresAt for a TTL policy
 *
 * Document ids for codes and tokens are SHA-256 hashes, so a leaked database
 * export holds nothing that can be presented as a credential. Every record
 * carries a Firestore `expiresAt` Timestamp so a TTL policy on that field can
 * reap them (see docs/mcp/operations.md).
 */

const CLIENTS = "oauth_clients";
const CODES = "oauth_codes";
const GRANTS = "oauth_grants";
const TOKENS = "oauth_tokens";

/** Drops undefined fields, which Firestore rejects. */
function clean<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;
}

const ttl = (ms: number) => Timestamp.fromMillis(ms);

export class FirestoreOAuthStore implements OAuthStore {
  constructor(private readonly db: Firestore) {}

  async getClient(id: string) {
    if (!id || id.includes("/")) return null;
    const snap = await this.db.collection(CLIENTS).doc(id).get();
    return snap.exists ? (snap.data() as OAuthClient) : null;
  }
  async putClient(client: OAuthClient) {
    await this.db.collection(CLIENTS).doc(client.clientId).set(clean(client));
  }

  async putCode(code: AuthorizationCode) {
    await this.db
      .collection(CODES)
      .doc(code.codeHash)
      // Kept a day past expiry so a late replay is still recognised as one.
      .set({ ...clean(code), ttlAt: ttl(code.expiresAt + 24 * 3600 * 1000) });
  }
  async consumeCode(codeHash: string, now: number): Promise<ConsumeCodeResult> {
    const ref = this.db.collection(CODES).doc(codeHash);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: "missing" } as const;
      const code = snap.data() as AuthorizationCode;
      if (code.usedAt) return { status: "reused", code } as const;
      tx.update(ref, { usedAt: now });
      return { status: "ok", code } as const;
    });
  }
  async attachGrantToCode(codeHash: string, grantId: string) {
    await this.db.collection(CODES).doc(codeHash).update({ grantId });
  }

  async putGrant(grant: Grant) {
    await this.db.collection(GRANTS).doc(grant.grantId).set(clean(grant));
  }
  async getGrant(id: string) {
    if (!id || id.includes("/")) return null;
    const snap = await this.db.collection(GRANTS).doc(id).get();
    return snap.exists ? (snap.data() as Grant) : null;
  }
  async updateGrant(id: string, patch: Partial<Grant>) {
    await this.db.collection(GRANTS).doc(id).set(clean(patch), { merge: true });
  }
  async listGrantsForUser(uid: string) {
    const snap = await this.db.collection(GRANTS).where("uid", "==", uid).get();
    return snap.docs.map((d) => d.data() as Grant);
  }

  async putToken(token: TokenRecord) {
    await this.db
      .collection(TOKENS)
      .doc(token.tokenHash)
      .set({ ...clean(token), ttlAt: ttl(token.expiresAt + 24 * 3600 * 1000) });
  }
  async getToken(hash: string) {
    if (!/^[0-9a-f]{64}$/.test(hash)) return null;
    const snap = await this.db.collection(TOKENS).doc(hash).get();
    if (!snap.exists) return null;
    const { ttlAt: _ttl, ...rest } = snap.data() as TokenRecord & { ttlAt?: unknown };
    return rest as TokenRecord;
  }
  async deleteToken(hash: string) {
    await this.db.collection(TOKENS).doc(hash).delete();
  }
  async markRefreshUsed(hash: string, now: number): Promise<MarkRefreshResult> {
    const ref = this.db.collection(TOKENS).doc(hash);
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) return { status: "missing" } as const;
      const token = snap.data() as TokenRecord;
      if (token.kind !== "refresh") return { status: "missing" } as const;
      if (token.usedAt) return { status: "reused", token } as const;
      tx.update(ref, { usedAt: now });
      return { status: "ok", token } as const;
    });
  }
  async deleteTokensForGrant(grantId: string) {
    const snap = await this.db.collection(TOKENS).where("grantId", "==", grantId).get();
    // A rotated refresh token is kept until the grant dies so a replay can be
    // detected; once the grant is revoked none of them are needed.
    const docs = snap.docs;
    for (let i = 0; i < docs.length; i += 400) {
      const batch = this.db.batch();
      docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  }
}
