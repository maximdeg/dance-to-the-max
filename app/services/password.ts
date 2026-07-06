import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { Effect } from "effect";

// scrypt is built into Node — no native module to compile, so it works on
// Vercel's serverless runtime out of the box. Stored format: `<saltHex>:<hashHex>`.
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, derivedKey) => {
      if (error) reject(error);
      else resolve(derivedKey);
    });
  });
}

export const hashPassword = (password: string): Effect.Effect<string> =>
  Effect.promise(async () => {
    const salt = randomBytes(SALT_LENGTH);
    const derived = await deriveKey(password, salt);
    return `${salt.toString("hex")}:${derived.toString("hex")}`;
  });

export const verifyPassword = (
  password: string,
  stored: string,
): Effect.Effect<boolean> =>
  Effect.promise(async () => {
    const [saltHex, hashHex] = stored.split(":");
    if (!saltHex || !hashHex) return false;
    const expected = Buffer.from(hashHex, "hex");
    const derived = await deriveKey(password, Buffer.from(saltHex, "hex"));
    // Constant-time compare; timingSafeEqual throws on length mismatch, so guard.
    return derived.length === expected.length && timingSafeEqual(derived, expected);
  });
