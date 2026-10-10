import Link from "next/link";
import { desc, inArray } from "drizzle-orm";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { listRegistrations } from "@/lib/data";
import { EVENT_STATUS_LABELS } from "@/lib/domain/constants";
import { hasPermission } from "@/lib/domain/permissions";
import { formatLagos, formatLagosShort } from "@/lib/domain/time";
import { redirect } from "next/navigation";

export default async function AdminHomePage() {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  const programs = actor.role === "super_admin"
    ? await getDb().select().from(events).orderBy(desc(events.startsAt))
    : actor.assignments.length === 0
      ? []
      : await getDb()
          .select()
          .from(events)
          .where(inArray(events.id, actor.assignments.map((item) => item.eventId)))
          .orderBy(desc(events.startsAt));

  const lists = await Promise.all(
    programs.map(async (program) => {
      if (!hasPermission(actor, "registrations.view", program.id)) {
        return { program, rows: [], total: 0, hidden: true };
      }
      const sensitive = hasPermission(actor, "registrations.view_sensitive", program.id);
      const result = await listRegistrations(
        program.id,
        { page: 1, sort: "registered", dir: "desc" },
        sensitive,
      );
      return { program, rows: result.rows, total: result.total, hidden: false };
    }),
  );

  return (
    <>
      <h1 className="font-display text-4xl text-pine">Overview</h1>
      <p className="mt-2 text-muted">People registered for the programs you can open.</p>
      {lists.length === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-card px-5 py-6">No programs are assigned to you yet.</p>
      ) : null}
      <div className="mt-6 space-y-8">
        {lists.map(({ program, rows, total, hidden }) => (
          <section key={program.id}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-medium tracking-widest text-muted uppercase">
                  {EVENT_STATUS_LABELS[program.status]}
                </p>
                <h2 className="mt-1 text-xl font-semibold tracking-tight">
                  <Link href={`/admin/events/${program.id}`}>{program.title}</Link>
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {formatLagos(program.startsAt)} · {program.venueName}
                  {hidden ? "" : ` · ${total} registered`}
                </p>
              </div>
              {hidden ? null : (
                <Link href={`/admin/events/${program.id}/registrations`} className="text-sm font-semibold text-pine">
                  Full list
                </Link>
              )}
            </div>
            {hidden ? (
              <p className="mt-4 text-sm text-muted">You can open this program, but not its registration list.</p>
            ) : rows.length === 0 ? (
              <p className="mt-4 rounded-xl border border-line bg-card px-5 py-6">No one has registered yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-xl border border-line bg-card">
                <table className="data">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Reference</th>
                      <th>Phone</th>
                      <th>Registered</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <Link className="font-semibold text-pine" href={`/admin/events/${program.id}/registrations/${row.id}`}>
                            {row.fullName}
                          </Link>
                        </td>
                        <td className="font-mono text-xs">{row.reference}</td>
                        <td>{row.phoneDisplay}</td>
                        <td>{formatLagosShort(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {total > rows.length ? (
                  <p className="px-4 py-3 text-sm text-muted">Showing the latest {rows.length} of {total}.</p>
                ) : null}
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
