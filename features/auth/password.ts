import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const SALT_BYTES = 16;
const KEY_BYTES = 64;

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, KEY_BYTES, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(SALT_BYTES);
  const key = await deriveKey(password, salt);
  return `${salt.toString("hex")}:${key.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [salt, key] = stored.split(":");
  const expected = Buffer.from(key ?? "", "hex");
  if (!salt || expected.length !== KEY_BYTES) return false;

  const actual = await deriveKey(password, Buffer.from(salt, "hex"));
  return timingSafeEqual(actual, expected);
}
