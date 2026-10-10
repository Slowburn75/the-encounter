import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "@/lib/db";
import { events, messages, registrations } from "@/lib/db/schema";
import { createRegistration } from "@/lib/registration/create";

const enabled = Boolean(process.env.DATABASE_URL);
const run = enabled ? describe.sequential : describe.skip;

function raw(overrides: Record<string, string> = {}) {
  return {
    fullName: "Adaeze Okonkwo",
    phone: "08031234567",
    email: "",
    area: "Ikeja",
    gender: "",
    ageRange: "25–34",
    maritalStatus: "",
    prayerRequest: "Please pray for my family",
    whatsappConsent: "",
    privacyAccepted: "on",
    guardianAcknowledged: "",
    idempotencyKey: randomUUID(),
    website: "",
    source: "test",
    ...overrides,
  };
}

run("registration persistence", () => {
  const runId = randomUUID().slice(0, 8);
  const createdEventIds: string[] = [];

  async function insertEvent(options: {
    slug: string;
    capacity: number | null;
    status: "published" | "registration_closed";
  }) {
    const [event] = await getDb()
      .insert(events)
      .values({
        slug: options.slug,
        title: "Test program",
        description: "Integration test program",
        startsAt: new Date("2026-11-15T16:00:00.000Z"),
        venueName: "Lagos",
        venueAddress: "Lagos",
        capacity: options.capacity,
        status: options.status,
      })
      .returning({ id: events.id });
    if (!event) throw new Error("Test event was not created.");
    createdEventIds.push(event.id);
    return event.id;
  }

  afterAll(async () => {
    if (!enabled || createdEventIds.length === 0) {
      if (enabled) await closeDb();
      return;
    }
    const db = getDb();
    const rows = await db
      .select({ id: registrations.id })
      .from(registrations)
      .where(inArray(registrations.eventId, createdEventIds));
    const ids = rows.map((row) => row.id);
    if (ids.length > 0) {
      await db.delete(messages).where(inArray(messages.registrationId, ids));
      await db.delete(registrations).where(inArray(registrations.id, ids));
    }
    await db.delete(events).where(inArray(events.id, createdEventIds));
    await closeDb();
  });

  it("accepts only the configured capacity under concurrent submissions", async () => {
    const slug = `test-capacity-${runId}`;
    await insertEvent({ slug, capacity: 2, status: "published" });
    const names = [
      "Amaka Adeyemi",
      "Bola Adeyemi",
      "Chidi Adeyemi",
      "Dami Adeyemi",
      "Efe Adeyemi",
      "Femi Adeyemi",
      "Gina Adeyemi",
      "Habeeb Adeyemi",
      "Ife Adeyemi",
      "Jide Adeyemi",
      "Kemi Adeyemi",
      "Lola Adeyemi",
    ];
    const results = await Promise.all(
      names.map((fullName, index) =>
        createRegistration({
          slug,
          ip: `capacity-${runId}`,
          raw: raw({
            fullName,
            phone: `0803${String(1234500 + index)}`,
            prayerRequest: "",
          }),
        }),
      ),
    );
    const accepted = results.filter((result) => result.ok);
    const full = results.filter((result) => !result.ok && result.reason === "full");
    expect(accepted).toHaveLength(2);
    expect(full).toHaveLength(10);
    const stored = await getDb()
      .select({ id: registrations.id })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(events.slug, slug));
    expect(stored).toHaveLength(2);
  });

  it("replays the same idempotency key as one registration", async () => {
    const slug = `test-replay-${runId}`;
    const key = randomUUID();
    await insertEvent({ slug, capacity: null, status: "published" });
    const first = await createRegistration({
      slug,
      ip: `replay-${runId}`,
      raw: raw({ idempotencyKey: key, prayerRequest: "" }),
    });
    const second = await createRegistration({
      slug,
      ip: `replay-${runId}`,
      raw: raw({ idempotencyKey: key, prayerRequest: "" }),
    });
    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.reference).toBe(first.reference);
    expect(second.replay).toBe(true);
  });

  it("flags a shared phone without rejecting the second person", async () => {
    const slug = `test-duplicate-${runId}`;
    await insertEvent({ slug, capacity: null, status: "published" });
    const phone = "08039876543";
    const first = await createRegistration({
      slug,
      ip: `dup-a-${runId}`,
      raw: raw({ fullName: "First Person", phone, prayerRequest: "" }),
    });
    const second = await createRegistration({
      slug,
      ip: `dup-b-${runId}`,
      raw: raw({ fullName: "Second Person", phone, prayerRequest: "" }),
    });
    expect(first.ok && second.ok).toBe(true);
    const rows = await getDb()
      .select({ duplicateFlag: registrations.duplicateFlag })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(events.slug, slug));
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.duplicateFlag)).toBe(true);
  });

  it("saves the registration without queueing a message while WhatsApp is suspended", async () => {
    const slug = `test-wa-paused-${runId}`;
    await insertEvent({ slug, capacity: null, status: "published" });
    const result = await createRegistration({
      slug,
      ip: `paused-${runId}`,
      raw: raw({ whatsappConsent: "on", phone: "08031112233" }),
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const [row] = await getDb()
      .select({
        prayerRequest: registrations.prayerRequest,
        whatsappConsent: registrations.whatsappConsent,
        messageId: messages.id,
      })
      .from(registrations)
      .leftJoin(messages, eq(messages.registrationId, registrations.id))
      .where(eq(registrations.reference, result.reference));
    expect(row?.prayerRequest).toBe("Please pray for my family");
    expect(row?.whatsappConsent).toBe(false);
    expect(row?.messageId ?? null).toBeNull();
  });

  it("does not insert a registration after registration is closed", async () => {
    const slug = `test-closed-${runId}`;
    await insertEvent({ slug, capacity: null, status: "registration_closed" });
    const result = await createRegistration({
      slug,
      ip: `closed-${runId}`,
      raw: raw({ prayerRequest: "" }),
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("registration_closed");
    const rows = await getDb()
      .select({ id: registrations.id })
      .from(registrations)
      .innerJoin(events, eq(events.id, registrations.eventId))
      .where(eq(events.slug, slug));
    expect(rows).toHaveLength(0);
  });
});
