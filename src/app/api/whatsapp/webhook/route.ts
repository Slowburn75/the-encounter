import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { scrubSensitiveText } from "@/lib/domain/text";
import { verifyMetaSignature } from "@/lib/domain/whatsapp-signature";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (mode === "subscribe" && expected && token === expected && challenge) {
    return new Response(challenge, { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new Response("Webhook is not configured", { status: 503 });
  const raw = await request.text();
  if (!verifyMetaSignature(secret, raw, request.headers.get("x-hub-signature-256"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return new Response("Bad payload", { status: 400 });
  }
  for (const item of collectStatuses(payload)) {
    await applyStatus(item.id, item.status, item.error);
  }
  return new Response("ok");
}

function collectStatuses(payload: unknown): { id: string; status: string; error: string | null }[] {
  const entries = asRecord(payload)?.entry;
  if (!Array.isArray(entries)) return [];
  const found: { id: string; status: string; error: string | null }[] = [];
  for (const entry of entries) {
    const changes = asRecord(entry)?.changes;
    if (!Array.isArray(changes)) continue;
    for (const change of changes) {
      const statuses = asRecord(asRecord(change)?.value)?.statuses;
      if (!Array.isArray(statuses)) continue;
      for (const status of statuses) {
        const record = asRecord(status);
        const id = record?.id;
        const name = record?.status;
        if (typeof id !== "string" || typeof name !== "string") continue;
        const errors = record?.errors;
        const first = Array.isArray(errors) ? asRecord(errors[0]) : null;
        const errorText = typeof first?.title === "string" ? first.title : null;
        found.push({ id, status: name, error: errorText });
      }
    }
  }
  return found;
}

async function applyStatus(providerRef: string, providerStatus: string, error: string | null) {
  const next = providerStatus === "read" || providerStatus === "delivered"
    ? "delivered"
    : providerStatus === "sent"
      ? "sent"
      : providerStatus === "failed"
        ? "failed"
        : null;
  if (!next) return;
  const db = getDb();
  const [current] = await db.select().from(messages).where(eq(messages.providerRef, providerRef));
  if (!current || current.status === "delivered") return;
  const order = { queued: 1, sending: 1, pending_provider: 1, failed: 1, sent: 2, delivered: 3 };
  if (next !== "failed" && order[next] < order[current.status]) return;
  await db
    .update(messages)
    .set({
      status: next,
      lastError: next === "failed" ? scrubSensitiveText(error ?? "WhatsApp reported a failure") : null,
      updatedAt: new Date(),
    })
    .where(eq(messages.id, current.id));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}
