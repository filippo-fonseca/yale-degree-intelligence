import type { Course } from "@/lib/types";
import type { DegreeStore, NewCourse, UserDoc } from "./store";
import { NotFoundError } from "./store";

/** Shared in-memory "database" so tests can hold stores for several users. */
export class MemoryDatabase {
  users = new Map<string, UserDoc>();
  courses = new Map<string, Course>();
  private nextId = 1;
  newId() {
    return `course${this.nextId++}`;
  }
  storeFor(uid: string) {
    return new MemoryDegreeStore(this, uid);
  }
}

export class MemoryDegreeStore implements DegreeStore {
  writes = 0;
  constructor(
    private readonly db: MemoryDatabase,
    readonly uid: string,
  ) {}

  async getUser() {
    return structuredClone(this.db.users.get(this.uid) ?? null);
  }
  async updateUser(patch: Partial<UserDoc>) {
    const current = this.db.users.get(this.uid) ?? {};
    this.db.users.set(this.uid, structuredClone({ ...current, ...patch }));
  }
  async transactUser<T>(
    fn: (current: UserDoc | null) => { patch: Partial<UserDoc> | null; result: T },
  ) {
    const { patch, result } = fn(await this.getUser());
    if (patch) await this.updateUser(patch);
    return result;
  }
  async listCourses() {
    return Array.from(this.db.courses.values())
      .filter((c) => c.userId === this.uid)
      .map((c) => structuredClone(c));
  }
  private owned(id: string) {
    const c = this.db.courses.get(id);
    if (!c || c.userId !== this.uid) throw new NotFoundError(`No course with id ${id}`);
    return c;
  }
  async createCourses(courses: Array<NewCourse & { id?: string }>) {
    return courses.map(({ id, ...course }) => {
      const docId = id ?? this.db.newId();
      this.db.courses.set(docId, structuredClone({ ...course, userId: this.uid, id: docId }));
      return docId;
    });
  }
  async updateCourse(id: string, patch: Partial<NewCourse>, remove: (keyof NewCourse)[] = []) {
    const c = this.owned(id);
    const { userId: _ignored, ...rest } = patch;
    Object.assign(c, structuredClone(rest));
    for (const field of remove) delete (c as Record<string, unknown>)[field];
  }
  async deleteCourses(ids: string[]) {
    ids.forEach((id) => this.owned(id));
    ids.forEach((id) => this.db.courses.delete(id));
  }
  async afterWrite() {
    this.writes += 1;
  }
}
