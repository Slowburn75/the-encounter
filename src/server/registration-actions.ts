"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { events, messages, registrations } from "@/lib/db/schema";
import { permissionDenial } from "@/lib/domain/permissions";
import { parseRegistrationUpdate } from "@/lib/domain/registration-input";
import { formString, requestIp } from "@/lib/http";
import { refreshDuplicateFlags } from "@/lib/registration/create";
import { WHATSAPP_SUSPENDED } from "@/lib/domain/constants";
import { deliverConfirmation } from "@/lib/whatsapp/deliver";

export type EditRegistrationState = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function updateRegistration(
  _state: EditRegistrationState,
  formData: FormData,
): Promise<EditRegistrationState> {
  const actor = await getActor();
  const registrationId = formString(formData, "registrationId");
  const db = getDb();
  const [current] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId));
  if (!current) return { message: "That registration could not be found." };
  const denial = permissionDenial(actor, "registrations.update", current.eventId);
  if (denial || !actor) return { message: denial ?? "You need to sign in." };
  if (current.status !== "accepted") {
    return { message: "This record can no longer be edited." };
  }
  const allowPrayer = !permissionDenial(actor, "registrations.view_prayer", current.eventId);
  const parsed = parseRegistrationUpdate(
    {
      fullName: formString(formData, "fullName"),
      phone: formString(formData, "phone"),
      email: formString(formData, "email"),
      area: formString(formData, "area"),
      gender: formString(formData, "gender"),
      ageRange: formString(formData, "ageRange"),
      maritalStatus: formString(formData, "maritalStatus"),
      prayerRequest: allowPrayer ? formString(formData, "prayerRequest") : "",
      guardianAcknowledged: formString(formData, "guardianAcknowledged"),
    },
    { allowPrayer },
  );
  if (!parsed.ok) {
    return { message: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const changed: string[] = [];
  const compare: Array<[string, string | null, string | null]> = [
    ["fullName", current.fullName, parsed.value.fullName],
    ["phone", current.phoneE164, parsed.value.phoneE164],
    ["email", current.email, parsed.value.email],
    ["area", current.area, parsed.value.area],
    ["gender", current.gender, parsed.value.gender],
    ["ageRange", current.ageRange, parsed.value.ageRange],
    ["maritalStatus", current.maritalStatus, parsed.value.maritalStatus],
  ];
  for (const [field, before, after] of compare) {
    if ((before ?? "") !== (after ?? "")) changed.push(field);
  }
  if (allowPrayer && (current.prayerRequest ?? "") !== (parsed.value.prayerRequest ?? "")) {
    changed.push("prayerRequest");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(registrations)
      .set({
        fullName: parsed.value.fullName,
        phoneE164: parsed.value.phoneE164,
        phoneDisplay: parsed.value.phoneDisplay,
        email: parsed.value.email,
        area: parsed.value.area,
        gender: parsed.value.gender,
        ageRange: parsed.value.ageRange,
        maritalStatus: parsed.value.maritalStatus,
        prayerRequest: allowPrayer ? parsed.value.prayerRequest : current.prayerRequest,
        guardianAcknowledged: parsed.value.guardianAcknowledged,
        updatedAt: new Date(),
      })
      .where(eq(registrations.id, current.id));
    if (current.phoneE164 !== parsed.value.phoneE164) {
      await refreshDuplicateFlags(tx, current.eventId, current.phoneE164);
      await refreshDuplicateFlags(tx, current.eventId, parsed.value.phoneE164);
    }
  });

  if (changed.length > 0) {
    await writeAudit({
      actorId: actor.id,
      action: "registration.update",
      entityType: "registration",
      entityId: current.id,
      metadata: { eventId: current.eventId, fields: changed },
      ip: await requestIp(),
    });
  }
  const [event] = await db.select({ slug: events.slug }).from(events).where(eq(events.id, current.eventId));
  if (event) revalidatePath(`/events/${event.slug}`);
  redirect(
    `/admin/events/${current.eventId}/registrations/${current.id}?notice=${encodeURIComponent("Registration updated")}`,
  );
}

export async function retryWhatsApp(formData: FormData): Promise<void> {
  const actor = await getActor();
  const registrationId = formString(formData, "registrationId");
  const db = getDb();
  const [current] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId));
  if (!current) redirect("/admin/events");
  const backEarly = `/admin/events/${current.eventId}/registrations/${current.id}`;
  if (WHATSAPP_SUSPENDED) redirect(backEarly);
  const denial = permissionDenial(actor, "whatsapp.retry", current.eventId);
  const back = `/admin/events/${current.eventId}/registrations/${current.id}`;
  if (denial || !actor) {
    redirect(`${back}?notice=${encodeURIComponent(denial ?? "You need to sign in.")}`);
  }
  if (!current.whatsappConsent) {
    redirect(`${back}?notice=This person did not ask for a WhatsApp confirmation`);
  }
  const [existing] = await db
    .select({ id: messages.id })
    .from(messages)
    .where(eq(messages.registrationId, current.id));
  if (!existing) {
    await db.insert(messages).values({
      registrationId: current.id,
      type: "confirmation",
      provider: "none",
      status: "queued",
    });
  }
  await deliverConfirmation(current.id);
  await writeAudit({
    actorId: actor.id,
    action: "whatsapp.retry",
    entityType: "registration",
    entityId: current.id,
    metadata: { eventId: current.eventId },
    ip: await requestIp(),
  });
  redirect(`${back}?notice=WhatsApp confirmation attempted`);
}

export async function anonymizeRegistration(formData: FormData): Promise<void> {
  const actor = await getActor();
  const registrationId = formString(formData, "registrationId");
  const db = getDb();
  const [current] = await db
    .select()
    .from(registrations)
    .where(eq(registrations.id, registrationId));
  if (!current) redirect("/admin/events");
  const [event] = await db.select().from(events).where(eq(events.id, current.eventId));
  const back = `/admin/events/${current.eventId}/registrations/${current.id}`;
  const denial = permissionDenial(actor, "registrations.anonymize");
  if (denial || !actor || !event) {
    redirect(`${back}?notice=${encodeURIComponent(denial ?? "You need to sign in.")}`);
  }
  if (!["completed", "cancelled", "archived"].includes(event.status)) {
    redirect(
      `${back}?notice=Personal details can be removed after the program is completed, cancelled or archived`,
    );
  }
  if (current.status === "anonymized") redirect(`${back}?notice=This record is already anonymised`);
  const oldPhone = current.phoneE164;
  await db.transaction(async (tx) => {
    await tx
      .update(registrations)
      .set({
        fullName: "Removed registrant",
        phoneE164: `anon:${current.id}`,
        phoneDisplay: "Removed",
        email: null,
        area: "Removed",
        gender: null,
        ageRange: "Removed",
        maritalStatus: null,
        prayerRequest: null,
        source: null,
        duplicateFlag: false,
        status: "anonymized",
        updatedAt: new Date(),
      })
      .where(eq(registrations.id, current.id));
    await refreshDuplicateFlags(tx, current.eventId, oldPhone);
  });
  await writeAudit({
    actorId: actor.id,
    action: "registration.anonymize",
    entityType: "registration",
    entityId: current.id,
    metadata: { eventId: current.eventId },
    ip: await requestIp(),
  });
  redirect(`${back}?notice=Personal details removed`);
}
