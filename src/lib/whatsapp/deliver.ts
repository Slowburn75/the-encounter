import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events, messages, registrations } from "@/lib/db/schema";
import { TIME_ZONE } from "@/lib/domain/constants";
import { scrubSensitiveText } from "@/lib/domain/text";
import { providerLabel, sendConfirmation } from "@/lib/whatsapp/provider";

export async function deliverConfirmation(registrationId: string): Promise<void> {
  const db = getDb();
  const claimed = await db.execute<{ id: string }>(sql`
    update messages
    set status = 'sending',
        attempt_count = attempt_count + 1,
        updated_at = now()
    where registration_id = ${registrationId}
      and type = 'confirmation'
      and (
        status in ('queued', 'failed', 'pending_provider')
        or (status = 'sending' and updated_at < now() - interval '2 minutes')
      )
    returning id
  `);
  const messageId = claimed[0]?.id;
  if (!messageId) return;

  try {
    const [row] = await db
      .select({
        fullName: registrations.fullName,
        phoneE164: registrations.phoneE164,
        reference: registrations.reference,
        title: events.title,
        startsAt: events.startsAt,
        venueName: events.venueName,
        venueAddress: events.venueAddress,
      })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(registrations.id, registrationId));
    if (!row) throw new Error("Registration was not found for messaging.");

    const result = await sendConfirmation({
      toE164: row.phoneE164,
      recipientName: row.fullName,
      eventName: row.title,
      reference: row.reference,
      eventDate: new Intl.DateTimeFormat("en-NG", {
        timeZone: TIME_ZONE,
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(row.startsAt),
      eventTime: new Intl.DateTimeFormat("en-NG", {
        timeZone: TIME_ZONE,
        hour: "numeric",
        minute: "2-digit",
      }).format(row.startsAt),
      venue: [row.venueName, row.venueAddress].filter(Boolean).join(", "),
    });

    await db
      .update(messages)
      .set({
        provider: providerLabel(),
        providerRef: result.ok ? result.providerRef : null,
        status: result.ok ? "sent" : result.unconfigured ? "pending_provider" : "failed",
        lastError: result.ok ? null : result.error,
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  } catch (error) {
    await db
      .update(messages)
      .set({
        status: "failed",
        lastError: scrubSensitiveText(
          error instanceof Error ? error.message : "WhatsApp send failed",
        ),
        updatedAt: new Date(),
      })
      .where(eq(messages.id, messageId));
  }
}
