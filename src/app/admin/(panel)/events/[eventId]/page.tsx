import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyButton } from "@/components/controls";
import { Notice } from "@/components/notice";
import { buttonClass, secondaryButtonClass } from "@/components/styles";
import { getActor } from "@/lib/auth/session";
import {
  acceptedCount,
  eventHasBanner,
  eventStats,
  getEventById,
  listAudit,
  listRegistrations,
} from "@/lib/data";
import { EVENT_STATUS_LABELS } from "@/lib/domain/constants";
import { eventPublicUrl, eventRegisterUrl } from "@/lib/http";
import { canAccessEvent, hasPermission } from "@/lib/domain/permissions";
import { nextStatuses } from "@/lib/domain/registration-window";
import { firstParam } from "@/lib/domain/text";
import { formatLagos, formatLagosShort } from "@/lib/domain/time";
import { deleteDraftEvent, setEventStatus } from "@/server/event-actions";

export default async function AdminEventPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  const event = await getEventById(eventId);
  if (!event || !canAccessEvent(actor, event.id)) notFound();
  const query = await searchParams;
  const canStats = hasPermission(actor, "stats.view", event.id);
  const [count, hasBanner, stats, recent, audit] = await Promise.all([
    acceptedCount(event.id),
    eventHasBanner(event.id),
    canStats ? eventStats(event.id) : Promise.resolve(null),
    listRegistrations(event.id, { page: 1 }, hasPermission(actor, "registrations.view_sensitive", event.id)),
    hasPermission(actor, "audit.view_event", event.id) || hasPermission(actor, "audit.view")
      ? listAudit({ eventId: event.id, limit: 8 })
      : Promise.resolve([]),
  ]);
  const publicUrl = eventPublicUrl(event.slug);
  const registerUrl = eventRegisterUrl(event.slug);
  const transitions = nextStatuses(event.status).filter((status) =>
    hasPermission(actor, permissionFor(status), event.id),
  );

  return (
    <>
      <Notice notice={firstParam(query.notice)} />
      <p className="text-sm font-semibold text-gold">{EVENT_STATUS_LABELS[event.status]}</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-pine">{event.title}</h1>
        <div className="flex flex-wrap gap-2">
          {hasPermission(actor, "events.update", event.id) ? (
            <Link href={`/admin/events/${event.id}/edit`} className={secondaryButtonClass}>Edit</Link>
          ) : null}
          {hasPermission(actor, "registrations.view", event.id) ? (
            <Link href={`/admin/events/${event.id}/registrations`} className={buttonClass}>Registration list</Link>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-muted">{formatLagos(event.startsAt)} · {event.venueName}</p>
      <p className="mt-2">{count} accepted registration{count === 1 ? "" : "s"}{event.capacity ? ` · capacity ${event.capacity}` : ""}</p>

      <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_220px]">
        <div className="rounded-3xl border border-line bg-card p-5">
          <h2 className="font-display text-2xl">Public link and QR code</h2>
          <p className="mt-2 break-all text-sm">{registerUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyButton value={registerUrl} label="Copy form link" />
            <a className={secondaryButtonClass} href={`/api/events/${event.id}/qr?download=1`}>Download QR</a>
          </div>
          <p className="mt-3 text-sm text-muted">
            The QR code opens the registration form. The landing page stays at {publicUrl}. Closing registration keeps both links.
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/api/events/${event.id}/qr`} alt="QR code that opens the registration form" className="w-full rounded-xl border border-line bg-white p-3" />
      </section>

      {hasBanner || event.bannerUrl ? (
        <p className="mt-4 text-sm text-muted">{hasBanner ? "A banner image is saved with this program." : "This program uses an external banner link."}</p>
      ) : null}

      {transitions.length > 0 ? (
        <section className="mt-6">
          <h2 className="font-display text-2xl">Status</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {transitions.map((status) => (
              <form key={status} action={setEventStatus}>
                <input type="hidden" name="eventId" value={event.id} />
                <input type="hidden" name="status" value={status} />
                <button className={secondaryButtonClass}>{EVENT_STATUS_LABELS[status]}</button>
              </form>
            ))}
          </div>
        </section>
      ) : null}

      {event.status === "draft" && hasPermission(actor, "events.delete_draft", event.id) ? (
        <form action={deleteDraftEvent} className="mt-4">
          <input type="hidden" name="eventId" value={event.id} />
          <button className="text-sm font-semibold text-clay underline">Delete this empty draft</button>
        </form>
      ) : null}

      {stats ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Registration statistics</h2>
          <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
            <Stat label="Total" value={stats.total} />
            <Stat label="Today" value={stats.today} />
            <Stat label="Personal details removed" value={stats.anonymized} />
          </div>
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            <Breakdown title="By age range" rows={stats.byAge} />
            <Breakdown title="By gender" rows={stats.byGender} />
            <Breakdown title="By area" rows={stats.byArea} />
          </div>
          {stats.byDay.length > 0 ? (
            <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-card">
              <table className="data">
                <thead><tr><th>Date</th><th>Registrations</th></tr></thead>
                <tbody>
                  {stats.byDay.map((row) => (
                    <tr key={row.label}><td>{row.label}</td><td>{row.count}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}

      {hasPermission(actor, "registrations.view", event.id) ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Latest registrations</h2>
          <div className="mt-3 overflow-x-auto rounded-3xl border border-line bg-card">
            <table className="data">
              <thead><tr><th>Name</th><th>Reference</th><th>Registered</th></tr></thead>
              <tbody>
                {recent.rows.map((row) => (
                  <tr key={row.id} className={row.duplicateFlag ? "bg-sand" : undefined}>
                    <td><Link className="font-semibold text-pine underline" href={`/admin/events/${event.id}/registrations/${row.id}`}>{row.fullName}</Link></td>
                    <td>{row.reference}</td>
                    <td>{formatLagosShort(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {recent.total === 0 ? <p className="px-4 py-6">No registrations yet.</p> : null}
          </div>
        </section>
      ) : null}

      {audit.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-2xl">Recent changes</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {audit.map((entry) => (
              <li key={entry.id}>
                <span className="font-semibold">{entry.action}</span> · {entry.actorName ?? "System"} · {formatLagosShort(entry.createdAt)}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function permissionFor(status: string) {
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
    default:
      return "events.update" as const;
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <p className="bg-card px-5 py-4">
      <span className="block truncate text-xs font-medium text-muted">{label}</span>
      <span className="mt-1 block text-xl font-semibold tracking-tight tabular-nums">{value}</span>
    </p>
  );
}

function Breakdown({ title, rows }: { title: string; rows: { label: string; count: number }[] }) {
  return (
    <div className="rounded-3xl border border-line bg-card p-4">
      <h3 className="font-semibold">{title}</h3>
      <ul className="mt-2 space-y-1 text-sm">
        {rows.length === 0 ? <li>None yet.</li> : rows.map((row) => <li key={row.label}>{row.label}: {row.count}</li>)}
      </ul>
    </div>
  );
}

