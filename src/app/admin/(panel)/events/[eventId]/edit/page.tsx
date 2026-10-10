import { forbidden, notFound, redirect } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { getActor } from "@/lib/auth/session";
import { eventHasBanner, getEventById } from "@/lib/data";
import { hasPermission } from "@/lib/domain/permissions";
import { isSlugLocked } from "@/lib/domain/registration-window";
import { utcToLagosInput } from "@/lib/domain/time";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  const event = await getEventById(eventId);
  if (!event) notFound();
  if (!hasPermission(actor, "events.update", event.id)) forbidden();
  return (
    <>
      <h1 className="font-display text-4xl text-pine">Edit {event.title}</h1>
      <div className="mt-6">
        <EventForm
          defaults={{
            eventId: event.id,
            status: event.status,
            title: event.title,
            theme: event.theme ?? "",
            description: event.description,
            slug: event.slug,
            slugLocked: isSlugLocked(event.status),
            startsAt: utcToLagosInput(event.startsAt),
            endsAt: event.endsAt ? utcToLagosInput(event.endsAt) : "",
            venueName: event.venueName,
            venueAddress: event.venueAddress,
            registrationOpensAt: event.registrationOpensAt ? utcToLagosInput(event.registrationOpensAt) : "",
            registrationClosesAt: event.registrationClosesAt ? utcToLagosInput(event.registrationClosesAt) : "",
            capacity: event.capacity ? String(event.capacity) : "",
            contactName: event.contactName ?? "",
            contactPhone: event.contactPhone ?? "",
            contactEmail: event.contactEmail ?? "",
            privacyNotice: event.privacyNotice ?? "",
            bannerUrl: event.bannerUrl ?? "",
            hasBanner: await eventHasBanner(event.id),
            faq: event.faq,
          }}
        />
      </div>
    </>
  );
}
