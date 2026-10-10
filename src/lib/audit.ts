import { getDb } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import { redactMetadata } from "@/lib/domain/text";

export async function writeAudit(entry: {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ip?: string | null;
}): Promise<void> {
  await getDb()
    .insert(auditLogs)
    .values({
      actorId: entry.actorId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: redactMetadata(entry.metadata ?? {}),
      ip: entry.ip ?? null,
    });
}
