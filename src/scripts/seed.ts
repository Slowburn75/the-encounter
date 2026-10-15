import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { ensureBuiltInSuperAdmin } from "../lib/auth/built-in-admin";
import { closeDb, getDb } from "../lib/db";
import { events } from "../lib/db/schema";
import { lagosLocalToUtc } from "../lib/domain/time";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@encounterworship.local")
    .trim()
    .toLowerCase();
  if (!process.env.SEED_ADMIN_PASSWORD) {
    throw new Error("Set SEED_ADMIN_PASSWORD in .env.local before seeding.");
  }
  await ensureBuiltInSuperAdmin({ resetPassword: true });
  const db = getDb();

  if (process.env.SEED_DEMO_EVENT === "true") {
    const startsAt = lagosLocalToUtc("2026-11-15T17:00");
    if (!startsAt) throw new Error("Sample event time could not be interpreted.");
    const details = {
      slug: "the-encounter",
      title: "The Encounter",
      theme: "A gathering for worship",
      description:
        "The Encounter is a gathering of Encounter Worship. Register before you come so the church can prepare for you. You do not need an account. After you submit the form, keep the reference shown on the screen.",
      startsAt,
      venueName: "Lagos",
      venueAddress: "Lagos",
      capacity: 300,
      status: "published" as const,
      contactName: "Encounter Worship",
      contactEmail: email,
      faq: [
        {
          question: "Do I need an account?",
          answer: "No. Registration does not require an account.",
        },
        {
          question: "Is there a fee?",
          answer: "No. Registration on this page is free, and the page does not take payment.",
        },
      ],
    };
    const [current] = await db.select({ id: events.id }).from(events).where(eq(events.slug, "the-encounter"));
    const [legacy] = await db.select({ id: events.id }).from(events).where(eq(events.slug, "sample-gathering"));
    if (current) {
      console.log("The Encounter already exists");
    } else if (legacy) {
      await db.update(events).set({ ...details, updatedAt: new Date() }).where(eq(events.id, legacy.id));
      console.log("Renamed the sample program to The Encounter");
    } else {
      await db.insert(events).values(details);
      console.log("Created The Encounter");
    }
  }

  await closeDb();
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDb();
  process.exit(1);
});
