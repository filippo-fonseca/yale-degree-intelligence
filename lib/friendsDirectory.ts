import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "@/config/firebase";

/**
 * The discovery projection: the four fields Friends search needs, and nothing
 * else.
 *
 * This collection exists to separate "who can be found" from "what they took".
 * friends_public_data has to be readable by anyone who might search for you,
 * because that is how search works, and it also carries your course list and
 * your bio. That made every opted-in student's course history readable by every
 * signed-in student, which is not what the app promises.
 *
 * So discovery moved here, where a document holds a name, a photo, a major, and
 * a year, and friends_public_data is restricted to the owner and their actual
 * friends. See firestore.rules and docs/security-notes.md.
 *
 * Nothing here is more than a classmate could read off your face at a table in
 * Bass, which is the bar a directory entry has to clear.
 */

export interface FriendsDirectoryEntry {
  displayName: string | null;
  photoURL: string | null;
  majors: string[];
  graduationYear: number | null;
}

/** Same shape from either writer, so a repair cannot drift from a fresh write. */
function directoryPayload(userId: string, entry: FriendsDirectoryEntry) {
  return {
    userId,
    enabled: true,
    displayName: entry.displayName ?? null,
    photoURL: entry.photoURL ?? null,
    majors: entry.majors ?? [],
    graduationYear: entry.graduationYear ?? null,
  };
}

function entriesMatch(
  existing: Record<string, unknown> | undefined,
  next: ReturnType<typeof directoryPayload>,
): boolean {
  if (!existing) return false;
  return (
    existing.enabled === true &&
    existing.displayName === next.displayName &&
    existing.photoURL === next.photoURL &&
    existing.graduationYear === next.graduationYear &&
    JSON.stringify(existing.majors ?? []) === JSON.stringify(next.majors)
  );
}

/**
 * Upsert the caller's directory entry, skipping the write when it already says
 * the same thing.
 *
 * Called on every friends sync rather than only on enable, which makes it
 * self-repairing: an account whose entry predates this collection gets one the
 * next time they open the app. The costs one extra read per sync, against a
 * write we would otherwise make blind.
 */
export async function syncFriendsDirectory(
  userId: string,
  entry: FriendsDirectoryEntry,
): Promise<void> {
  const next = directoryPayload(userId, entry);
  try {
    const existing = await getDoc(doc(db, "friends_directory", userId));
    if (entriesMatch(existing.data(), next)) return;
    await setDoc(doc(db, "friends_directory", userId), {
      ...next,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    // Discovery is a convenience: failing to publish it must never take down
    // the sync of the data the owner actually cares about.
    console.error("Error syncing friends directory:", error);
  }
}

/** Remove the entry, so a disabled account stops appearing in search. */
export async function deleteFriendsDirectory(userId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, "friends_directory", userId));
  } catch (error) {
    console.error("Error deleting friends directory entry:", error);
  }
}
