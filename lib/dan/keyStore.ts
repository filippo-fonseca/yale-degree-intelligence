import { adminDb } from "@/config/firebaseAdmin";
import { decryptSecret } from "@/lib/serverCrypto";

const KEYS_COLLECTION = "dan_keys";

function fallbackAllowedForUid(uid: string): boolean {
  const allowlist = (process.env.DAN_FALLBACK_UIDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return allowlist.includes(uid);
}

// Loads and decrypts the caller's stored Anthropic key. Returns null if the
// user has not connected one. An optional internal fallback key is only used
// when DAN_FALLBACK_ANTHROPIC_KEY is set AND the uid is listed in
// DAN_FALLBACK_UIDS (demo / internal accounts). Normal users never share it.
export async function loadUserKey(uid: string): Promise<string | null> {
  if (adminDb) {
    const snap = await adminDb.collection(KEYS_COLLECTION).doc(uid).get();
    if (snap.exists) {
      const enc = snap.data()?.encryptedKey;
      if (enc) {
        try {
          return decryptSecret(enc);
        } catch {
          return null;
        }
      }
    }
  }

  const fallback = process.env.DAN_FALLBACK_ANTHROPIC_KEY;
  if (fallback && fallbackAllowedForUid(uid)) {
    return fallback;
  }
  return null;
}

export async function touchKeyUsage(uid: string): Promise<void> {
  if (!adminDb) return;
  try {
    await adminDb
      .collection(KEYS_COLLECTION)
      .doc(uid)
      .update({ lastUsedAt: new Date().toISOString() });
  } catch {
    // best-effort; ignore (e.g. running on fallback key with no doc)
  }
}
