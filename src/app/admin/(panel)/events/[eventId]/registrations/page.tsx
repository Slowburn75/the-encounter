import Link from "next/link";
import { forbidden, notFound, redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { secondaryButtonClass } from "@/components/styles";
import { getActor } from "@/lib/auth/session";
import { getEventById, listRegistrations } from "@/lib/data";
import { PAGE_SIZE } from "@/lib/domain/constants";
import { hasPermission } from "@/lib/domain/permissions";
import { firstParam } from "@/lib/domain/text";
import { formatLagosShort } from "@/lib/domain/time";

export default async function RegistrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { eventId } = await params;
  const query = await searchParams;
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  const event = await getEventById(eventId);
  if (!event) notFound();
  if (!hasPermission(actor, "registrations.view", event.id)) forbidden();
  const filters = {
    q: firstParam(query.q),
    from: firstParam(query.from),
    to: firstParam(query.to),
    sort: firstParam(query.sort) === "name" ? "name" : "registered",
    dir: firstParam(query.dir) === "asc" ? "asc" : "desc",
    page: Number(firstParam(query.page) || "1"),
  };
  const sensitive = hasPermission(actor, "registrations.view_sensitive", event.id);
  const result = await listRegistrations(event.id, filters, sensitive);
  const exportParams = new URLSearchParams();
  if (filters.q) exportParams.set("q", filters.q);
  if (filters.from) exportParams.set("from", filters.from);
  if (filters.to) exportParams.set("to", filters.to);
  const excelParams = new URLSearchParams(exportParams);
  excelParams.set("format", "xlsx");
  const pageLink = (page: number, patch: Record<string, string> = {}) => {
    const next = new URLSearchParams();
    const merged = { q: filters.q, from: filters.from, to: filters.to, sort: filters.sort, dir: filters.dir, page: String(page), ...patch };
    for (const [key, value] of Object.entries(merged)) if (value) next.set(key, value);
    return `/admin/events/${event.id}/registrations?${next.toString()}`;
  };

  return (
    <>
      <p className="text-sm font-semibold text-gold"><Link href={`/admin/events/${event.id}`}>{event.title}</Link></p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl text-pine">Registrations</h1>
        {hasPermission(actor, "registrations.export", event.id) ? (
          <div className="flex flex-wrap gap-2">
            <a className={secondaryButtonClass} href={`/api/events/${event.id}/export?${exportParams.toString()}`}>
              Download CSV
            </a>
            <a className={secondaryButtonClass} href={`/api/events/${event.id}/export?${excelParams.toString()}`}>
              Download Excel
            </a>
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-sm text-muted">Prayer requests are not in this list or in either download.</p>
      <Notice notice={firstParam(query.notice)} />
      <form className="mt-4 grid gap-3 rounded-3xl border border-line bg-card p-4 sm:grid-cols-4">
        <label className="text-sm font-semibold sm:col-span-2">Search
          <input name="q" defaultValue={filters.q} placeholder="Name, phone or reference" className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
        </label>
        <label className="text-sm font-semibold">From
          <input name="from" type="date" defaultValue={filters.from} className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
        </label>
        <label className="text-sm font-semibold">To
          <input name="to" type="date" defaultValue={filters.to} className="mt-1 w-full rounded-xl border border-line px-3 py-3" />
        </label>
        <button className={`${secondaryButtonClass} sm:col-span-4 sm:w-fit`}>Search</button>
      </form>
      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link href={pageLink(1, { sort: "registered", dir: filters.sort === "registered" && filters.dir === "desc" ? "asc" : "desc" })}>Sort by date</Link>
        <Link href={pageLink(1, { sort: "name", dir: filters.sort === "name" && filters.dir === "asc" ? "desc" : "asc" })}>Sort by name</Link>
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Reference</th>
              <th>Phone</th>
              {sensitive ? <th>Area</th> : null}
              <th>Age</th>
              <th>Registered</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.id} className={row.duplicateFlag ? "bg-sand" : undefined}>
                <td>
                  <Link className="font-semibold text-pine underline" href={`/admin/events/${event.id}/registrations/${row.id}`}>{row.fullName}</Link>
                  {row.duplicateFlag ? <span className="mt-1 block text-xs font-semibold text-gold">Possible duplicate phone</span> : null}
                </td>
                <td>{row.reference}</td>
                <td>{row.phoneDisplay}</td>
                {sensitive ? <td>{row.area}</td> : null}
                <td>{row.ageRange}</td>
                <td>{formatLagosShort(row.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.total === 0 ? <p className="px-4 py-6">No registrations match.</p> : null}
      </div>
      <p className="mt-3 text-sm text-muted">
        Showing {(result.page - 1) * PAGE_SIZE + (result.total === 0 ? 0 : 1)}–{Math.min(result.page * PAGE_SIZE, result.total)} of {result.total}
      </p>
      <div className="mt-2 flex gap-3 text-sm font-semibold">
        {result.page > 1 ? <Link href={pageLink(result.page - 1)}>Previous</Link> : null}
        {result.page < result.pages ? <Link href={pageLink(result.page + 1)}>Next</Link> : null}
      </div>
    </>
  );
}
