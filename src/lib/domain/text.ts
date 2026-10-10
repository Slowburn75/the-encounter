const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’.\- ]*$/u;

export function normalizeSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function isReasonableName(value: string): boolean {
  const name = normalizeSpaces(value);
  if (name.length < 2 || name.length > 120) return false;
  return NAME_PATTERN.test(name);
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export function safeAdminNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/admin") || value.startsWith("//")) {
    return "/admin";
  }
  if (value.includes("\\") || value.includes("\n") || value.includes("\r")) {
    return "/admin";
  }
  return value;
}

export function likeContains(value: string): string {
  return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export function scrubSensitiveText(value: string): string {
  return value.replace(/\d{6,}/g, "[redacted]").slice(0, 300);
}

export function sanitizeTemplateParameter(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/\s{2,}/g, " ").trim().slice(0, 200);
}

const REDACTED_KEY = /prayer|password|token|authorization|secret|cookie/i;

export function redactMetadata(
  input: Record<string, unknown>,
): Record<string, string | number | boolean | null | string[]> {
  const output: Record<string, string | number | boolean | null | string[]> = {};
  for (const [key, value] of Object.entries(input)) {
    if (REDACTED_KEY.test(key)) continue;
    if (typeof value === "string") output[key] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean" || value === null) {
      output[key] = value;
    } else if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "string")
    ) {
      output[key] = value.slice(0, 20).map((item) => item.slice(0, 80));
    }
  }
  return output;
}

export function firstParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
  return raw.slice(0, 200);
}

export function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.includes(".");
  } catch {
    return false;
  }
}
