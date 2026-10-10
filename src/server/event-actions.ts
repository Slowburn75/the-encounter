"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAudit } from "@/lib/audit";
import { getActor } from "@/lib/auth/session";
import { imageKind, MAX_BANNER_BYTES } from "@/lib/banners";
import { getDb } from "@/lib/db";
import { eventAssignments, eventBanners, events, registrations } from "@/lib/db/schema";
import { EVENT_STATUSES, type EventStatus } from "@/lib/domain/constants";
import { parseEventForm, type EventFieldErrors } from "@/lib/domain/event-input";
import { permissionDenial } from "@/lib/domain/permissions";
import { canTransition } from "@/lib/domain/registration-window";
import { formString, formStrings, requestIp } from "@/lib/http";

export type EventFormState = {
  message?: string;
  fieldErrors?: EventFieldErrors;
};

function permissionForStatus(status: EventStatus) {
  switch (status) {
    case "published":
      return "events.publish" as const;
    case "registration_closed":
      return "events.close" as const;
    case "completed":
      return "events.complete" as const;
    case "cancelled":
      return "events.cancel" as const;
    case "archived":
      return "events.archive" as const;
    case "draft":
      return "events.update" as const;
  }
}

async function readBanner(formData: FormData): Promise<
  | { ok: true; file: { bytes: Buffer; contentType: string } | null }
  | { ok: false; message: string }
> {
  const file = formData.get("banner");
  if (!(file instanceof File) || file.size === 0) return { ok: true, file: null };
  if (file.size > MAX_BANNER_BYTES) {
    return { ok: false, message: "The banner must be 4 MB or smaller." };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = imageKind(bytes);
  if (!contentType) {
    return { ok: false, message: "Use a JPEG, PNG or WebP banner." };
  }
  return { ok: true, file: { bytes, contentType } };
}

export async function saveEvent(
  _state: EventFormState,
  formData: FormData,
): Promise<EventFormState> {
  const actor = await getActor();
  const eventId = formString(formData, "eventId");
  const existing = eventId ? await loadOwnedEvent(eventId) : null;
  if (eventId && !existing) return { message: "That program could not be found." };
  const denial = permissionDenial(
    actor,
    existing ? "events.update" : "events.create",
    existing?.id,
  );
  if (denial || !actor) return { message: denial ?? "You need to sign in." };

  const parsed = parseEventForm(
    {
      title: formString(formData, "title"),
      theme: formString(formData, "theme"),
      description: formString(formData, "description"),
      slug: formString(formData, "slug"),
      startsAt: formString(formData, "startsAt"),
      endsAt: formString(formData, "endsAt"),
      venueName: formString(formData, "venueName"),
      venueAddress: formString(formData, "venueAddress"),
      registrationOpensAt: formString(formData, "registrationOpensAt"),
      registrationClosesAt: formString(formData, "registrationClosesAt"),
      capacity: formString(formData, "capacity"),
      contactName: formString(formData, "contactName"),
      contactPhone: formString(formData, "contactPhone"),
      contactEmail: formString(formData, "contactEmail"),
      privacyNotice: formString(formData, "privacyNotice"),
      bannerUrl: formString(formData, "bannerUrl"),
      intent: formString(formData, "intent"),
      faqQuestion: formStrings(formData, "faqQuestion"),
      faqAnswer: formStrings(formData, "faqAnswer"),
    },
    existing ? { status: existing.status, currentSlug: existing.slug } : {},
  );
  if (!parsed.ok) {
    return { message: "Please correct the highlighted fields.", fieldErrors: parsed.fieldErrors };
  }

  const banner = await readBanner(formData);
  if (!banner.ok) return { message: banner.message, fieldErrors: { form: banner.message } };

  const db = getDb();
  const [clash] = await db
    .select({ id: events.id })
    .from(events)
    .where(existing ? and(eq(events.slug, parsed.value.slug), ne(events.id, existing.id)) : eq(events.slug, parsed.value.slug));
  if (clash) {
    return {
      message: "That public link is already in use.",
      fieldErrors: { slug: "Choose a different public link." },
    };
  }

  let status: EventStatus = existing?.status ?? "draft";
  if (!existing && parsed.value.intent === "publish") {
    if (actor.role !== "super_admin" && actor.role !== "event_admin") {
      return { message: "You do not have permission to publish a program." };
    }
    status = "published";
  }
  if (existing?.status === "draft" && parsed.value.intent === "publish") {
    const publishDenial = permissionDenial(actor, "events.publish", existing.id);
    if (publishDenial) return { message: publishDenial };
    status = "published";
  }

  const values = {
    title: parsed.value.title,
    theme: parsed.value.theme,
    description: parsed.value.description,
    slug: parsed.value.slug,
    startsAt: parsed.value.startsAt,
    endsAt: parsed.value.endsAt,
    venueName: parsed.value.venueName,
    venueAddress: parsed.value.venueAddress,
    registrationOpensAt: parsed.value.registrationOpensAt,
    registrationClosesAt: parsed.value.registrationClosesAt,
    capacity: parsed.value.capacity,
    contactName: parsed.value.contactName,
    contactPhone: parsed.value.contactPhone,
    contactEmail: parsed.value.contactEmail,
    faq: parsed.value.faq,
    privacyNotice: parsed.value.privacyNotice,
    bannerUrl: banner.file ? null : parsed.value.bannerUrl || existing?.bannerUrl || null,
    status,
    updatedAt: new Date(),
  };
  if (formString(formData, "removeBanner") === "on") values.bannerUrl = null;

  const saved = existing
    ? (
        await db.update(events).set(values).where(eq(events.id, existing.id)).returning()
      )[0]
    : (
        await db
          .insert(events)
          .values({ ...values, createdBy: actor.id })
          .returning()
      )[0];
  if (!saved) return { message: "The program could not be saved." };

  if (!existing && actor.role !== "super_admin") {
    await db.insert(eventAssignments).values({
      userId: actor.id,
      eventId: saved.id,
      canExport: true,
      canEdit: true,
      canViewPrayer: false,
    });
  }

  if (formString(formData, "removeBanner") === "on") {
    await db.delete(eventBanners).where(eq(eventBanners.eventId, saved.id));
  } else if (parsed.value.bannerUrl && !banner.file) {
    await db.delete(eventBanners).where(eq(eventBanners.eventId, saved.id));
  }
  if (banner.file && formString(formData, "removeBanner") !== "on") {
    await db
      .insert(eventBanners)
      .values({
        eventId: saved.id,
        bytes: banner.file.bytes,
        contentType: banner.file.contentType,
      })
      .onConflictDoUpdate({
        target: eventBanners.eventId,
        set: {
          bytes: banner.file.bytes,
          contentType: banner.file.contentType,
          updatedAt: new Date(),
        },
      });
  }

  await writeAudit({
    actorId: actor.id,
    action: existing ? "event.update" : "event.create",
    entityType: "event",
    entityId: saved.id,
    metadata: { eventId: saved.id, status: saved.status, slug: saved.slug },
    ip: await requestIp(),
  });
  revalidatePath("/");
  revalidatePath(`/events/${saved.slug}`);
  if (existing && existing.slug !== saved.slug) revalidatePath(`/events/${existing.slug}`);
  redirect(`/admin/events/${saved.id}?notice=${encodeURIComponent("Program saved")}`);
}

async function loadOwnedEvent(eventId: string) {
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId));
  return event ?? null;
}

export async function setEventStatus(formData: FormData): Promise<void> {
  const actor = await getActor();
  const eventId = formString(formData, "eventId");
  const next = formString(formData, "status");
  const event = await loadOwnedEvent(eventId);
  if (!event || !EVENT_STATUSES.includes(next as EventStatus)) {
    redirect("/admin/events?notice=That change could not be made");
  }
  const status = next as EventStatus;
  if (!actor || !canTransition(event.status, status)) {
    redirect(`/admin/events/${event.id}?notice=That status change is not available`);
  }
  const denial = permissionDenial(actor, permissionForStatus(status), event.id);
  if (denial) redirect(`/admin/events/${event.id}?notice=${encodeURIComponent(denial)}`);
  await getDb()
    .update(events)
    .set({ status, updatedAt: new Date() })
    .where(eq(events.id, event.id));
  await writeAudit({
    actorId: actor.id,
    action: "event.status",
    entityType: "event",
    entityId: event.id,
    metadata: { eventId: event.id, from: event.status, to: status },
    ip: await requestIp(),
  });
  revalidatePath("/");
  revalidatePath(`/events/${event.slug}`);
  redirect(`/admin/events/${event.id}?notice=Status updated`);
}

export async function deleteDraftEvent(formData: FormData): Promise<void> {
  const actor = await getActor();
  const event = await loadOwnedEvent(formString(formData, "eventId"));
  if (!event) redirect("/admin/events");
  const denial = permissionDenial(actor, "events.delete_draft", event.id);
  if (denial || !actor) {
    redirect(`/admin/events/${event.id}?notice=${encodeURIComponent(denial ?? "You need to sign in.")}`);
  }
  if (event.status !== "draft") {
    redirect(`/admin/events/${event.id}?notice=Only a draft with no registrations can be deleted`);
  }
  const [countRow] = await getDb()
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(registrations)
    .where(eq(registrations.eventId, event.id));
  if (Number(countRow?.count ?? 0) > 0) {
    redirect(`/admin/events/${event.id}?notice=This draft already has registrations`);
  }
  await getDb().delete(events).where(eq(events.id, event.id));
  await writeAudit({
    actorId: actor.id,
    action: "event.delete_draft",
    entityType: "event",
    entityId: event.id,
    metadata: { slug: event.slug },
    ip: await requestIp(),
  });
  revalidatePath("/");
  redirect("/admin/events?notice=Draft deleted");
}
