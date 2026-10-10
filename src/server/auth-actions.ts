"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import {
  burnPasswordTime,
  hashPassword,
  passwordProblem,
  verifyPassword,
} from "@/lib/auth/password";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  deleteSessionToken,
  deleteUserSessions,
  getActor,
} from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { safeAdminNext } from "@/lib/domain/text";
import { formString, requestIp } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";

export type AuthFormState = { message?: string };

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formString(formData, "email").trim().toLowerCase();
  const password = formString(formData, "password");
  const ip = await requestIp();
  const allowed = await consumeRateLimit(`login:${ip}`, 10, 900);
  if (!allowed) {
    return { message: "Too many sign-in attempts. Please wait and try again." };
  }
  const [user] = await getDb().select().from(users).where(eq(users.email, email));
  const valid =
    user && user.status === "active" && (await verifyPassword(password, user.passwordHash));
  if (!valid) {
    if (!user) await burnPasswordTime(password);
    await writeAudit({
      actorId: user?.id ?? null,
      action: "auth.login_failed",
      entityType: "user",
      entityId: user?.id ?? "unknown",
      metadata: { email },
      ip,
    });
    return { message: "The email or password is not correct." };
  }
  await createSession(user.id);
  await getDb().update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
  await writeAudit({
    actorId: user.id,
    action: "auth.login",
    entityType: "user",
    entityId: user.id,
    ip,
  });
  redirect(safeAdminNext(formString(formData, "next")));
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  const actor = await getActor();
  if (token) await deleteSessionToken(token);
  await clearSessionCookie();
  if (actor) {
    await writeAudit({
      actorId: actor.id,
      action: "auth.logout",
      entityType: "user",
      entityId: actor.id,
    });
  }
  redirect("/admin/login");
}

export async function changePassword(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const actor = await getActor();
  if (!actor) return { message: "You need to sign in." };
  const [user] = await getDb().select().from(users).where(eq(users.id, actor.id));
  if (!user) return { message: "You need to sign in." };
  const current = formString(formData, "currentPassword");
  const next = formString(formData, "newPassword");
  if (!(await verifyPassword(current, user.passwordHash))) {
    return { message: "The current password is not correct." };
  }
  const problem = passwordProblem(next, user.email);
  if (problem) return { message: problem };
  if (await verifyPassword(next, user.passwordHash)) {
    return { message: "Choose a password that is different from the current one." };
  }
  await getDb()
    .update(users)
    .set({ passwordHash: await hashPassword(next), updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await deleteUserSessions(user.id);
  await createSession(user.id);
  await writeAudit({
    actorId: user.id,
    action: "auth.password_changed",
    entityType: "user",
    entityId: user.id,
    ip: await requestIp(),
  });
  redirect("/admin/account?notice=Password updated");
}
