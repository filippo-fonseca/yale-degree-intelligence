import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

// AES-256-GCM encryption for secrets at rest (e.g. user-supplied API keys).
// Server-only. Never import this into client code.

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard nonce length

function getKey(): Buffer {
  const secret = process.env.DAN_KEY_ENC_SECRET;
  if (!secret) {
    throw new Error("DAN_KEY_ENC_SECRET is not set");
  }
  // Accept a 64-char hex secret directly as 32 bytes; otherwise derive 32
  // bytes deterministically via SHA-256 so any sufficiently random secret works.
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, "hex");
  }
  return createHash("sha256").update(secret).digest();
}

// Returns "iv:authTag:ciphertext", each segment base64.
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const key = getKey();
  const [ivB64, tagB64, dataB64] = payload.split(":");
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Malformed encrypted payload");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(ivB64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
