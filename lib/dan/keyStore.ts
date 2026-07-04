import { adminDb } from "@/config/firebaseAdmin";
import { decryptSecret } from "@/lib/serverCrypto";

const KEYS_COLLECTION = "dan_keys";

// Loads and decrypts the caller's stored Anthropic key. Returns null if the
// user has not connected one. Falls back to an internal key only if explicitly
// configured (for demos); normal users always run on their own key.
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
  return process.env.DAN_FALLBACK_ANTHROPIC_KEY || null;
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
