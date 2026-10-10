import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizePhone(
  input: string,
): { ok: true; e164: string; display: string } | { ok: false } {
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 32) return { ok: false };
  const parsed = parsePhoneNumberFromString(trimmed, "NG");
  if (!parsed?.isValid()) return { ok: false };
  return {
    ok: true,
    e164: parsed.number,
    display: parsed.formatInternational(),
  };
}
