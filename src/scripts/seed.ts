import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { hashPassword, passwordProblem } from "../lib/auth/password";
import { closeDb, getDb } from "../lib/db";
import { events, users } from "../lib/db/schema";
import { lagosLocalToUtc } from "../lib/domain/time";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@encounterworship.local")
    .trim()
    .toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  const name = process.env.SEED_ADMIN_NAME ?? "Encounter Administrator";
  if (!password) {
    throw new Error("Set SEED_ADMIN_PASSWORD in .env.local before seeding.");
  }
  const problem = passwordProblem(password, email);
  if (problem) {
    throw new Error(
      `${problem} If the password contains #, quote it in .env.local so it is not treated as a comment.`,
    );
  }

  const db = getDb();
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email));
  if (existing) {
    await db
      .update(users)
      .set({
        name,
        passwordHash,
        role: "super_admin",
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(users.id, existing.id));
    console.log(`Updated super administrator ${email}`);
  } else {
    await db.insert(users).values({
      name,
      email,
      passwordHash,
      role: "super_admin",
      status: "active",
    });
    console.log(`Created super administrator ${email}`);
  }

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
