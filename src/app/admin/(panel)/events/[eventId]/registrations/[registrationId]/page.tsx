import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";
import { EditRegistrationForm } from "@/components/edit-registration-form";
import { Notice } from "@/components/notice";
import { secondaryButtonClass } from "@/components/styles";
import { writeAudit } from "@/lib/audit";
import { getActor } from "@/lib/auth/session";
import { getEventById, getRegistrationDetail } from "@/lib/data";
import { requestIp } from "@/lib/http";
import { hasPermission } from "@/lib/domain/permissions";
import { firstParam } from "@/lib/domain/text";
import { formatLagosShort } from "@/lib/domain/time";
import { anonymizeRegistration } from "@/server/registration-actions";

export default async function RegistrationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string; registrationId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId, registrationId } = await params;
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  const event = await getEventById(eventId);
  if (!event) notFound();
  if (!hasPermission(actor, "registrations.view", event.id)) forbidden();
  const allowPrayer = hasPermission(actor, "registrations.view_prayer", event.id);
  const allowSensitive = hasPermission(actor, "registrations.view_sensitive", event.id);
  const registration = await getRegistrationDetail(registrationId, {
    includePrayer: allowPrayer,
    includeSensitive: allowSensitive,
  });
  if (!registration || registration.eventId !== event.id) notFound();
  if (allowPrayer && registration.prayerRequest) {
    await writeAudit({
      actorId: actor.id,
      action: "prayer_request.view",
      entityType: "registration",
      entityId: registration.id,
      metadata: { eventId: event.id },
      ip: await requestIp(),
    });
  }
  const query = await searchParams;
  const canEdit = hasPermission(actor, "registrations.update", event.id) && registration.status === "accepted";

  return (
    <>
      <p className="text-sm font-semibold text-gold">
        <Link href={`/admin/events/${event.id}/registrations`}>{event.title}</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl text-pine">{registration.fullName}</h1>
      <Notice notice={firstParam(query.notice)} />
      <dl className="mt-4 grid gap-3 rounded-3xl border border-line bg-card p-5 sm:grid-cols-2">
        <Item label="Reference" value={registration.reference} />
        <Item label="Phone" value={registration.phoneDisplay} />
        {allowSensitive ? <Item label="Email" value={registration.email || "Not given"} /> : null}
        {allowSensitive ? <Item label="Area" value={registration.area || "Not given"} /> : null}
        {allowSensitive ? <Item label="Gender" value={registration.gender || "Not answered"} /> : null}
        <Item label="Age range" value={registration.ageRange} />
        {allowSensitive ? <Item label="Marital status" value={registration.maritalStatus || "Not answered"} /> : null}
        <Item label="Record" value={registration.status} />
        <Item label="Registered" value={formatLagosShort(registration.createdAt)} />
        {registration.duplicateFlag ? <Item label="Duplicate check" value="Another registration for this program uses the same phone." /> : null}
      </dl>
      {allowPrayer ? (
        <section className="mt-4 rounded-3xl border border-gold/40 bg-sand p-5">
          <h2 className="font-display text-2xl">Prayer request</h2>
          <p className="mt-2 whitespace-pre-wrap leading-7">{registration.prayerRequest || "No prayer request was given."}</p>
        </section>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {hasPermission(actor, "registrations.anonymize") ? (
          <form action={anonymizeRegistration}>
            <input type="hidden" name="registrationId" value={registration.id} />
            <button className={secondaryButtonClass}>Remove personal details</button>
          </form>
        ) : null}
      </div>
      {canEdit && allowSensitive ? (
        <section className="mt-8 max-w-2xl">
          <h2 className="font-display text-2xl">Correct this record</h2>
          <div className="mt-4">
            <EditRegistrationForm
              registration={{ ...registration, area: registration.area ?? "" }}
              allowPrayer={allowPrayer}
            />
          </div>
        </section>
      ) : null}
    </>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
