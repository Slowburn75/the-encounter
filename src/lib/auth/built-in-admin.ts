import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { users } from "../db/schema";
import { hashPassword, passwordProblem } from "./password";

export function builtInAdminIdentity(): { email: string; name: string; password: string } | null {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@encounterworship.local").trim().toLowerCase();
  const name = (process.env.SEED_ADMIN_NAME ?? "Encounter Administrator").trim() || "Encounter Administrator";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  if (!password) return null;
  const problem = passwordProblem(password, email);
  if (problem) {
    console.error(`Built-in super administrator was not saved. ${problem}`);
    return null;
  }
  return { email, name, password };
}

/** Keep the configured staff account active as a super administrator. */
export async function ensureBuiltInSuperAdmin(options?: { resetPassword?: boolean }): Promise<void> {
  const identity = builtInAdminIdentity();
  if (!identity) return;
  const db = getDb();
  const [existing] = await db.select().from(users).where(eq(users.email, identity.email));
  if (!existing) {
    await db.insert(users).values({
      name: identity.name,
      email: identity.email,
      passwordHash: await hashPassword(identity.password),
      role: "super_admin",
      status: "active",
    });
    console.log(`Created built-in super administrator ${identity.email}`);
    return;
  }

  const roleChanged = existing.role !== "super_admin" || existing.status !== "active";
  const nameChanged = existing.name !== identity.name;
  if (!roleChanged && !nameChanged && !options?.resetPassword) return;

  await db
    .update(users)
    .set({
      name: identity.name,
      role: "super_admin",
      status: "active",
      ...(options?.resetPassword ? { passwordHash: await hashPassword(identity.password) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing.id));
  console.log(
    roleChanged
      ? `Restored super administrator access for ${identity.email}`
      : `Updated built-in super administrator ${identity.email}`,
  );
}
