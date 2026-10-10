import { headers } from "next/headers";

export async function requestIp(): Promise<string> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headerStore.get("x-real-ip") || "unknown";
}

export function appUrl(): string {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function eventPublicUrl(slug: string): string {
  return `${appUrl()}/events/${slug}`;
}

export function eventRegisterUrl(slug: string): string {
  return `${appUrl()}/events/${slug}/register`;
}

export function formString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export function formStrings(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((item): item is string => typeof item === "string");
}
