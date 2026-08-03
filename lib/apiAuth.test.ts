import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

/**
 * Covers the Firestore-backed rate limiter in lib/apiAuth.ts.
 *
 * This is the shared counter that four API routes depend on, including
 * transcript upload, so the failure modes that matter are: letting more than
 * `limit` through, and wrongly rejecting when under it.
 *
 * The fake Firestore below serializes runTransaction behind a mutex, which is
 * the property real Firestore transactions provide. Without that the mock
 * would model a non-transactional store and the concurrency test would pass
 * for the wrong reason.
 */

const h = vi.hoisted(() => {
  const store = new Map<string, Record<string, unknown>>();
  const state = { failNext: false, transactionCount: 0 };
  let chain: Promise<unknown> = Promise.resolve();

  const makeRef = (path: string) => ({
    path,
    read: () => ({ exists: store.has(path), data: () => store.get(path) }),
  });

  const adminDb = {
    collection: (name: string) => ({
      doc: (id: string) => makeRef(`${name}/${id}`),
    }),
    runTransaction: <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      // Serialize: one transaction body at a time, as Firestore guarantees.
      const run = chain.then(async () => {
        state.transactionCount += 1;
        if (state.failNext) {
          state.failNext = false;
          throw new Error("simulated transaction failure");
        }
        const tx = {
          get: async (ref: ReturnType<typeof makeRef>) => ref.read(),
          set: (
            ref: ReturnType<typeof makeRef>,
            data: Record<string, unknown>,
            opts?: { merge?: boolean }
          ) => {
            const prev = opts?.merge ? store.get(ref.path) ?? {} : {};
            store.set(ref.path, { ...prev, ...data });
          },
        };
        return fn(tx);
      });
      // Keep the chain alive even when a body throws.
      chain = run.catch(() => undefined);
      return run;
    },
  };

  return { store, state, adminDb };
});

vi.mock("@/config/firebaseAdmin", () => ({
  adminAuth: null,
  adminDb: h.adminDb,
}));

vi.mock("firebase-admin/firestore", () => ({
  Timestamp: {
    fromMillis: (ms: number) => ({ toMillis: () => ms }),
    now: () => ({ toMillis: () => Date.now() }),
  },
  FieldValue: { serverTimestamp: () => ({}) },
}));

// Static import is safe here: vi.mock calls are hoisted above imports, so the
// mocks above are already registered when this module is evaluated.
import { rateLimit } from "@/lib/apiAuth";

const HOUR = 60 * 60 * 1000;

describe("rateLimit (Firestore-backed)", () => {
  beforeEach(() => {
    h.store.clear();
    h.state.failNext = false;
    h.state.transactionCount = 0;
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-03T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows exactly `limit` requests, then rejects", async () => {
    for (let i = 1; i <= 3; i++) {
      expect(await rateLimit("user:a", 3, HOUR), `call ${i}`).toBeNull();
    }
    const blocked = await rateLimit("user:a", 3, HOUR);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
  });

  it("sets a Retry-After header pointing at the end of the window", async () => {
    await rateLimit("user:retry", 1, HOUR);
    const blocked = await rateLimit("user:retry", 1, HOUR);
    const retryAfter = Number(blocked!.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(3600);
  });

  it("keeps separate keys independent", async () => {
    expect(await rateLimit("user:b", 1, HOUR)).toBeNull();
    // b is now exhausted, but c must be untouched.
    expect(await rateLimit("user:b", 1, HOUR)).not.toBeNull();
    expect(await rateLimit("user:c", 1, HOUR)).toBeNull();
  });

  it("resets when the window rolls over", async () => {
    expect(await rateLimit("user:d", 1, HOUR)).toBeNull();
    expect(await rateLimit("user:d", 1, HOUR)).not.toBeNull();

    vi.setSystemTime(new Date("2026-08-03T13:30:00.000Z"));
    expect(await rateLimit("user:d", 1, HOUR)).toBeNull();
  });

  it("counts concurrent requests individually", async () => {
    // The whole point of the transaction: 10 parallel calls against a limit of
    // 4 must let exactly 4 through, not all 10 reading the same stale count.
    const results = await Promise.all(
      Array.from({ length: 10 }, () => rateLimit("user:burst", 4, HOUR))
    );
    const allowed = results.filter((r) => r === null).length;
    const rejected = results.length - allowed;
    expect(allowed).toBe(4);
    expect(rejected).toBe(6);
  });

  it("writes an expiresAt so a TTL policy can reap the document", async () => {
    await rateLimit("user:ttl", 5, HOUR);
    const doc = Array.from(h.store.values())[0] as {
      expiresAt?: { toMillis(): number };
    };
    expect(doc.expiresAt).toBeDefined();
    expect(doc.expiresAt!.toMillis()).toBeGreaterThan(Date.now());
  });

  it("falls back instead of failing the request when the transaction throws", async () => {
    h.state.failNext = true;
    // Must not reject, and must not block a first request.
    await expect(rateLimit("user:err", 5, HOUR)).resolves.toBeNull();
  });

  it("still enforces a limit via the fallback path", async () => {
    // Every call fails its transaction, so all of them take the in-memory path.
    const results: (unknown | null)[] = [];
    for (let i = 0; i < 4; i++) {
      h.state.failNext = true;
      results.push(await rateLimit("user:fallback", 2, HOUR));
    }
    expect(results.filter((r) => r === null).length).toBe(2);
    expect(results.filter((r) => r !== null).length).toBe(2);
  });

  it("uses one document per key per window", async () => {
    await rateLimit("user:e", 5, HOUR);
    await rateLimit("user:e", 5, HOUR);
    expect(h.store.size).toBe(1);

    vi.setSystemTime(new Date("2026-08-03T14:00:00.000Z"));
    await rateLimit("user:e", 5, HOUR);
    expect(h.store.size).toBe(2);
  });
});
