import { FieldValue, type Firestore } from "firebase-admin/firestore";
import type { Course } from "@/lib/types";
import { syncFriendsPublicDataFor } from "@/lib/server/friendsPublicSync";
import type { DegreeStore, NewCourse, UserDoc } from "./store";
import { NotFoundError } from "./store";

function clean<T extends object>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined),
  ) as T;
}

/**
 * Firestore-backed DegreeStore. The Admin SDK bypasses security rules, so the
 * ownership checks the rules would make (`userId == request.auth.uid`) are
 * made here, on every course read and write.
 *
 * One instance serves one MCP request, so it caches the user document and the
 * course list for that request: a tool that reads both, or a write that checks
 * ownership after listing, pays for each once. Every write drops the cache it
 * touches, so a read after a write sees the write.
 */
export class FirestoreDegreeStore implements DegreeStore {
  private userCache: Promise<UserDoc | null> | null = null;
  private coursesCache: Promise<Course[]> | null = null;

  constructor(
    private readonly db: Firestore,
    readonly uid: string,
  ) {
    if (!uid) throw new Error("FirestoreDegreeStore needs a uid");
  }

  private userRef() {
    return this.db.collection("users").doc(this.uid);
  }

  async getUser() {
    this.userCache ??= this.userRef()
      .get()
      .then((snap) => (snap.exists ? (snap.data() as UserDoc) : null));
    try {
      return await this.userCache;
    } catch (error) {
      this.userCache = null;
      throw error;
    }
  }

  async updateUser(patch: Partial<UserDoc>) {
    this.userCache = null;
    await this.userRef().set(
      { ...clean(patch), updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }

  async transactUser<T>(
    fn: (current: UserDoc | null) => { patch: Partial<UserDoc> | null; result: T },
  ): Promise<T> {
    const ref = this.userRef();
    this.userCache = null;
    return this.db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const current = snap.exists ? (snap.data() as UserDoc) : null;
      const { patch, result } = fn(current);
      if (patch) {
        tx.set(ref, { ...clean(patch), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
      }
      return result;
    });
  }

  async listCourses() {
    this.coursesCache ??= this.db
      .collection("courses")
      .where("userId", "==", this.uid)
      .get()
      .then((snap) => snap.docs.map((d) => ({ ...(d.data() as Course), id: d.id })));
    try {
      // A fresh array each time, so a caller sorting or filtering in place
      // cannot change what the next caller sees.
      return [...(await this.coursesCache)];
    } catch (error) {
      this.coursesCache = null;
      throw error;
    }
  }

  private async ownedRef(id: string) {
    if (!id || id.includes("/")) throw new NotFoundError(`No course with id ${id}`);
    const ref = this.db.collection("courses").doc(id);
    // The cached list came from a userId == uid query, so membership in it
    // already proves ownership without reading the document again.
    if (this.coursesCache) {
      const owned = await this.coursesCache.then(
        (courses) => courses.some((c) => c.id === id),
        () => null,
      );
      if (owned === true) return ref;
      if (owned === false) throw new NotFoundError(`No course with id ${id}`);
    }
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.userId !== this.uid) {
      throw new NotFoundError(`No course with id ${id}`);
    }
    return ref;
  }

  async createCourses(courses: Array<NewCourse & { id?: string }>) {
    this.coursesCache = null;
    const batch = this.db.batch();
    const ids: string[] = [];
    for (const { id, ...course } of courses) {
      const ref = id ? this.db.collection("courses").doc(id) : this.db.collection("courses").doc();
      batch.set(ref, clean({ ...course, userId: this.uid }));
      ids.push(ref.id);
    }
    await batch.commit();
    return ids;
  }

  async updateCourse(id: string, patch: Partial<NewCourse>, remove: (keyof NewCourse)[] = []) {
    const ref = await this.ownedRef(id);
    const { userId: _ignored, ...rest } = patch;
    const update: Record<string, unknown> = clean(rest);
    for (const field of remove) update[field] = FieldValue.delete();
    this.coursesCache = null;
    await ref.update(update);
  }

  async deleteCourses(ids: string[]) {
    const refs = await Promise.all(ids.map((id) => this.ownedRef(id)));
    this.coursesCache = null;
    const batch = this.db.batch();
    refs.forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  async afterWrite() {
    try {
      await syncFriendsPublicDataFor(this.db, this.uid);
    } catch (error) {
      // A stale friends view is repaired the next time a friend opens the
      // profile; it must not fail the student's own write.
      console.error("[mcp] friends projection sync failed", error);
    }
  }
}
