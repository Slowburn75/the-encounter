import { and, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { events, messages, registrations } from "@/lib/db/schema";
import { WHATSAPP_SUSPENDED } from "@/lib/domain/constants";
import { registrationClosedMessage } from "@/lib/domain/messages";
import {
  parseRegistration,
  type RawRegistration,
} from "@/lib/domain/registration-input";
import { createRegistrationReference } from "@/lib/domain/reference";
import {
  registrationAvailability,
  type ClosedReason,
} from "@/lib/domain/registration-window";
import { consumeRateLimit } from "@/lib/rate-limit";
import { deliverConfirmation } from "@/lib/whatsapp/deliver";
import { providerLabel } from "@/lib/whatsapp/provider";

type Database = ReturnType<typeof getDb>;
type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

export type CreateRegistrationResult =
  | { ok: true; reference: string; slug: string; replay: boolean }
  | {
      ok: false;
      message: string;
      fieldErrors?: Record<string, string>;
      reason?: ClosedReason;
    };

function uniqueConstraint(error: unknown): string {
  if (typeof error !== "object" || error === null) return "";
  const record = error as { code?: string; constraint_name?: string };
  if (record.code !== "23505") return "";
  return record.constraint_name ?? "";
}

async function refreshDuplicateFlags(
  tx: Tx,
  eventId: string,
  phone: string,
): Promise<void> {
  const rows = await tx
    .select({ id: registrations.id })
    .from(registrations)
    .where(
      and(
        eq(registrations.eventId, eventId),
        eq(registrations.phoneE164, phone),
        eq(registrations.status, "accepted"),
      ),
    );
  if (rows.length === 0) return;
  await tx
    .update(registrations)
    .set({ duplicateFlag: rows.length > 1, updatedAt: new Date() })
    .where(
      inArray(
        registrations.id,
        rows.map((row) => row.id),
      ),
    );
}

export async function createRegistration(input: {
  slug: string;
  raw: RawRegistration;
  ip: string;
  now?: Date;
}): Promise<CreateRegistrationResult> {
  const now = input.now ?? new Date();
  const parsed = parseRegistration(input.raw);
  const allowed = await consumeRateLimit(`register:${input.ip}`, 30, 600);
  if (!allowed) {
    return {
      ok: false,
      message: "Too many registration attempts. Please wait a few minutes and try again.",
    };
  }
  if (!parsed.ok) {
    return {
      ok: false,
      message:
        parsed.fieldErrors.form ??
        "Please correct the highlighted fields and try again.",
      fieldErrors: parsed.fieldErrors,
    };
  }

  const db = getDb();
  const [replay] = await db
    .select({ reference: registrations.reference, slug: events.slug })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .where(
      and(
        eq(events.slug, input.slug),
        eq(registrations.idempotencyKey, parsed.value.idempotencyKey),
      ),
    );
  if (replay) return { ok: true, reference: replay.reference, slug: replay.slug, replay: true };

  const phoneAllowed = await consumeRateLimit(
    `register-phone:${input.slug}:${parsed.value.phoneE164}`,
    8,
    3600,
  );
  if (!phoneAllowed) {
    return {
      ok: false,
      message:
        "This phone number has been submitted several times. Please wait, or contact the church if you still need to register.",
    };
  }

  try {
    const created = await db.transaction(async (tx) => {
      const [event] = await tx
        .select()
        .from(events)
        .where(eq(events.slug, input.slug))
        .for("update");
      if (!event) return { type: "missing" as const };

      const [existing] = await tx
        .select()
        .from(registrations)
        .where(
          and(
            eq(registrations.eventId, event.id),
            eq(registrations.idempotencyKey, parsed.value.idempotencyKey),
          ),
        );
      if (existing) {
        return { type: "replay" as const, reference: existing.reference, slug: event.slug };
      }

      const [countRow] = await tx
        .select({ count: sql<number>`cast(count(*) as int)` })
        .from(registrations)
        .where(
          and(eq(registrations.eventId, event.id), eq(registrations.status, "accepted")),
        );
      const acceptedCount = Number(countRow?.count ?? 0);
      const availability = registrationAvailability(event, now, acceptedCount);
      if (!availability.open) {
        return { type: "closed" as const, availability, event };
      }

      let inserted: typeof registrations.$inferSelect | undefined;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          const [row] = await tx
            .insert(registrations)
            .values({
              eventId: event.id,
              reference: createRegistrationReference(now),
              fullName: parsed.value.fullName,
              phoneE164: parsed.value.phoneE164,
              phoneDisplay: parsed.value.phoneDisplay,
              email: parsed.value.email,
              area: parsed.value.area,
              gender: parsed.value.gender,
              ageRange: parsed.value.ageRange,
              maritalStatus: parsed.value.maritalStatus,
              prayerRequest: parsed.value.prayerRequest,
              status: "accepted",
              source: parsed.value.source,
              whatsappConsent: WHATSAPP_SUSPENDED ? false : parsed.value.whatsappConsent,
              privacyAcceptedAt: now,
              guardianAcknowledged: parsed.value.guardianAcknowledged,
              idempotencyKey: parsed.value.idempotencyKey,
            })
            .returning();
          inserted = row;
          break;
        } catch (error) {
          const constraint = uniqueConstraint(error);
          if (!constraint) throw error;
          if (constraint.includes("idempotency")) throw error;
        }
      }
      if (!inserted) throw new Error("Could not assign a registration reference.");

      await refreshDuplicateFlags(tx, event.id, parsed.value.phoneE164);
      const sendWhatsApp = !WHATSAPP_SUSPENDED && parsed.value.whatsappConsent;
      if (sendWhatsApp) {
        await tx.insert(messages).values({
          registrationId: inserted.id,
          type: "confirmation",
          provider: providerLabel(),
          status: "queued",
          attemptCount: 0,
        });
      }
      return {
        type: "created" as const,
        reference: inserted.reference,
        slug: event.slug,
        registrationId: inserted.id,
        send: sendWhatsApp,
      };
    });

    if (created.type === "missing") {
      return { ok: false, message: "Registration is not available." };
    }
    if (created.type === "replay") {
      return { ok: true, reference: created.reference, slug: created.slug, replay: true };
    }
    if (created.type === "closed") {
      return {
        ok: false,
        reason: created.availability.reason,
        message: registrationClosedMessage(
          created.availability.reason,
          created.event.registrationOpensAt,
        ),
      };
    }

    if (created.send) {
      try {
        await deliverConfirmation(created.registrationId);
      } catch (error) {
        console.error(
          JSON.stringify({
            scope: "whatsapp",
            reference: created.reference,
            message: error instanceof Error ? error.message : "send failed",
          }),
        );
      }
    }
    return { ok: true, reference: created.reference, slug: created.slug, replay: false };
  } catch (error) {
    if (uniqueConstraint(error).includes("idempotency")) {
      const [existing] = await db
        .select({ reference: registrations.reference, slug: events.slug })
        .from(registrations)
        .innerJoin(events, eq(events.id, registrations.eventId))
        .where(
          and(
            eq(events.slug, input.slug),
            eq(registrations.idempotencyKey, parsed.value.idempotencyKey),
          ),
        );
      if (existing) {
        return { ok: true, reference: existing.reference, slug: existing.slug, replay: true };
      }
    }
    console.error(
      JSON.stringify({
        scope: "registration",
        slug: input.slug,
        message: error instanceof Error ? error.message : "insert failed",
      }),
    );
    return {
      ok: false,
      message: "We could not save this registration. Please try again.",
    };
  }
}

export { refreshDuplicateFlags };
