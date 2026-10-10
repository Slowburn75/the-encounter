"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { hashPassword, passwordProblem } from "@/lib/auth/password";
import { createSession, deleteUserSessions, getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { eventAssignments, users } from "@/lib/db/schema";
import { ROLES, type Role } from "@/lib/domain/permissions";
import { permissionDenial } from "@/lib/domain/permissions";
import { isReasonableName, normalizeSpaces } from "@/lib/domain/text";
import { formString, requestIp } from "@/lib/http";

export type StaffFormState = { message?: string };

function flagsFor(role: Role, eventId: string, formData: FormData) {
  if (formData.get(`assign:${eventId}`) !== "on" || role === "super_admin") return null;
  const prayer = formData.get(`prayer:${eventId}`) === "on";
  if (role === "volunteer") {
    return { canExport: false, canEdit: false, canViewPrayer: false };
  }
  if (role === "event_admin") {
    return { canExport: true, canEdit: true, canViewPrayer: prayer };
  }
  return {
    canExport: formData.get(`export:${eventId}`) === "on",
    canEdit: formData.get(`edit:${eventId}`) === "on",
    canViewPrayer: prayer,
  };
}

export async function saveStaff(
  _state: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const actor = await getActor();
  const denial = permissionDenial(actor, "staff.manage");
  if (denial || !actor) return { message: denial ?? "You need to sign in." };

  const userId = formString(formData, "userId");
  const name = normalizeSpaces(formString(formData, "name"));
  const email = formString(formData, "email").trim().toLowerCase();
  const role = formString(formData, "role");
  const status = formString(formData, "status") === "disabled" ? "disabled" : "active";
  const password = formString(formData, "password");
  if (!isReasonableName(name)) return { message: "Enter the staff member's name." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { message: "Enter a valid email." };
  if (!ROLES.includes(role as Role)) return { message: "Choose a role." };
  const selectedRole = role as Role;
  if (!userId && !password) return { message: "Set a starting password." };
  if (password) {
    const problem = passwordProblem(password, email);
    if (problem) return { message: problem };
  }

  const db = getDb();
  const [existing] = userId
    ? await db.select().from(users).where(eq(users.id, userId))
    : [];
  if (userId && !existing) return { message: "That staff account could not be found." };

  const keepsSuper =
    selectedRole === "super_admin" && status === "active";
  const wasSuper = existing?.role === "super_admin" && existing.status === "active";
  if (wasSuper && !keepsSuper) {
    const others = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.role, "super_admin"), eq(users.status, "active")));
    if (others.filter((person) => person.id !== existing?.id).length === 0) {
      return { message: "Keep at least one active super administrator." };
    }
  }

  const [emailOwner] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (emailOwner && emailOwner.id !== existing?.id) {
    return { message: "That email is already used by another staff account." };
  }

  const saved = existing
    ? (
        await db
          .update(users)
          .set({
            name,
            email,
            role: selectedRole,
            status,
            ...(password ? { passwordHash: await hashPassword(password) } : {}),
            updatedAt: new Date(),
          })
          .where(eq(users.id, existing.id))
          .returning()
      )[0]
    : (
        await db
          .insert(users)
          .values({
            name,
            email,
            role: selectedRole,
            status,
            passwordHash: await hashPassword(password),
          })
          .returning()
      )[0];
  if (!saved) return { message: "The staff account could not be saved." };

  const eventIds = formData
    .getAll("eventId")
    .filter((value): value is string => typeof value === "string");
  await db.transaction(async (tx) => {
    await tx.delete(eventAssignments).where(eq(eventAssignments.userId, saved.id));
    const rows = eventIds.flatMap((eventId) => {
      const flags = flagsFor(selectedRole, eventId, formData);
      return flags ? [{ userId: saved.id, eventId, ...flags }] : [];
    });
    if (rows.length > 0) await tx.insert(eventAssignments).values(rows);
  });

  const sessionInvalid =
    Boolean(password) || status === "disabled" || existing?.role !== saved.role;
  if (sessionInvalid) await deleteUserSessions(saved.id);
  if (saved.id === actor.id && saved.status === "active" && saved.role === actor.role && password) {
    await createSession(saved.id);
  }
  await writeAudit({
    actorId: actor.id,
    action: existing ? "staff.update" : "staff.create",
    entityType: "user",
    entityId: saved.id,
    metadata: { role: saved.role, status: saved.status },
    ip: await requestIp(),
  });
  if (saved.id === actor.id && (saved.status !== "active" || saved.role !== actor.role)) {
    redirect("/admin/login?notice=Your access changed. Sign in again.");
  }
  redirect(`/admin/staff?notice=${encodeURIComponent("Staff account saved")}`);
}
