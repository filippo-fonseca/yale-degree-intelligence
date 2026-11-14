/**
 * Audit trail of what connected apps changed. SERVER ONLY.
 *
 * Every write tool records one event under mcp_audit/{uid}/events, readable by
 * the student in Settings > Connected apps and by nobody else (client access
 * is denied in firestore.rules; the connections API reads it for the owner).
 * Dry runs are not recorded: they change nothing.
 */
import type { Firestore } from "firebase-admin/firestore";

export type AuditEvent = {
  id?: string;
  at: number;
  grantId: string;
  clientName: string;
  tool: string;
  /** One plain sentence: "Added CPSC 323 to Fall 2027 in plan Main". */
  summary: string;
  /** Small, non-sensitive detail for debugging: ids, codes, plan names. */
  detail?: Record<string, unknown>;
};

export interface AuditLog {
  record(uid: string, event: Omit<AuditEvent, "id">): Promise<void>;
  list(uid: string, limit: number): Promise<AuditEvent[]>;
}

/** Events older than this are removed by the Firestore TTL policy on ttlAt. */
export const AUDIT_RETENTION_DAYS = 90;

export class FirestoreAuditLog implements AuditLog {
  constructor(private readonly db: Firestore) {}

  private events(uid: string) {
    return this.db.collection("mcp_audit").doc(uid).collection("events");
  }

  async record(uid: string, event: Omit<AuditEvent, "id">) {
    const { Timestamp } = await import("firebase-admin/firestore");
    await this.events(uid).add({
      ...JSON.parse(JSON.stringify(event)),
      ttlAt: Timestamp.fromMillis(event.at + AUDIT_RETENTION_DAYS * 86_400_000),
    });
  }

  async list(uid: string, limit: number) {
    const snap = await this.events(uid).orderBy("at", "desc").limit(limit).get();
    return snap.docs.map((d) => {
      const { ttlAt: _ttl, ...data } = d.data();
      return { ...(data as AuditEvent), id: d.id };
    });
  }

  /** Account deletion. */
  async deleteAll(uid: string) {
    const refs = await this.events(uid).listDocuments();
    for (let i = 0; i < refs.length; i += 400) {
      const batch = this.db.batch();
      refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
      await batch.commit();
    }
    await this.db.collection("mcp_audit").doc(uid).delete();
  }
}

export class MemoryAuditLog implements AuditLog {
  events = new Map<string, AuditEvent[]>();
  async record(uid: string, event: Omit<AuditEvent, "id">) {
    const list = this.events.get(uid) ?? [];
    list.push({ ...event, id: String(list.length + 1) });
    this.events.set(uid, list);
  }
  async list(uid: string, limit: number) {
    return [...(this.events.get(uid) ?? [])].sort((a, b) => b.at - a.at).slice(0, limit);
  }
}
