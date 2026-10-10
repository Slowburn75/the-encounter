import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;

function scryptAsync(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, 64, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key as Buffer);
    });
  });
}
const DUMMY_HASH =
  "scrypt$00000000000000000000000000000000$" + "ab".repeat(64);

export function passwordProblem(password: string, email?: string): string | null {
  const normalized = password.normalize("NFKC");
  if (normalized.length < 10 || normalized.length > 128) {
    return "Use a password of at least 10 characters.";
  }
  if (!/[a-zA-Z]/.test(normalized) || !/[0-9]/.test(normalized)) {
    return "Use a password with at least one letter and one number.";
  }
  if (email && normalized.toLowerCase() === email.toLowerCase()) {
    return "The password cannot be the same as the email address.";
  }
  return null;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const key = await scryptAsync(password.normalize("NFKC"), salt);
  return `scrypt$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, salt, key] = stored.split("$");
  if (scheme !== "scrypt" || !salt || !key) return false;
  const actual = await scryptAsync(password.normalize("NFKC"), salt);
  const expected = Buffer.from(key, "hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

export async function burnPasswordTime(password: string): Promise<void> {
  await verifyPassword(password, DUMMY_HASH);
}
