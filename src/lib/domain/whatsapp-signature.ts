import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaSignature(
  appSecret: string,
  rawBody: string,
  header: string | null,
): boolean {
  if (!appSecret || !header?.startsWith("sha256=")) return false;
  const actual = header.slice("sha256=".length);
  const expected = createHmac("sha256", appSecret).update(rawBody).digest("hex");
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(actual), Buffer.from(expected));
}
