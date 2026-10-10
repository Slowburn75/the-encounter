import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { buttonClass } from "@/components/styles";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { EVENT_STATUS_LABELS } from "@/lib/domain/constants";
import { hasPermission } from "@/lib/domain/permissions";
import { firstParam } from "@/lib/domain/text";
import { formatLagos } from "@/lib/domain/time";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  const query = await searchParams;
  const programs = actor.role === "super_admin"
    ? await getDb().select().from(events).orderBy(desc(events.startsAt))
    : actor.assignments.length === 0
      ? []
      : await getDb()
          .select()
          .from(events)
          .where(inArray(events.id, actor.assignments.map((item) => item.eventId)))
          .orderBy(desc(events.startsAt));

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-pine">Programs</h1>
          <p className="mt-2 text-muted">Each program has its own link, QR code and registration list.</p>
        </div>
        {hasPermission(actor, "events.create") ? <Link href="/admin/events/new" className={buttonClass}>New program</Link> : null}
      </div>
      <div className="mt-4"><Notice notice={firstParam(query.notice)} /></div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="data">
          <thead>
            <tr><th>Program</th><th>When</th><th>Status</th></tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr key={program.id}>
                <td><Link href={`/admin/events/${program.id}`} className="font-semibold text-pine underline">{program.title}</Link></td>
                <td>{formatLagos(program.startsAt)}</td>
                <td>{EVENT_STATUS_LABELS[program.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {programs.length === 0 ? <p className="px-4 py-6">No programs yet.</p> : null}
      </div>
    </>
  );
}
