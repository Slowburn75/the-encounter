import { forbidden, redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { listAudit } from "@/lib/data";
import { hasPermission } from "@/lib/domain/permissions";
import { formatLagosShort } from "@/lib/domain/time";

function metadataSummary(metadata: Record<string, unknown>): string {
  const safe = Object.fromEntries(
    Object.entries(metadata).filter(([key]) => !/prayer|password|token|authorization|secret|cookie/i.test(key)),
  );
  const text = JSON.stringify(safe);
  return text === "{}" ? "—" : text.length > 240 ? `${text.slice(0, 237)}…` : text;
}

export default async function AuditPage() {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!hasPermission(actor, "audit.view")) forbidden();
  const entries = await listAudit({ limit: 100 });

  return (
    <>
      <h1 className="font-display text-4xl text-pine">Audit</h1>
      <p className="mt-2 text-muted">
        Recent staff actions. Prayer text, passwords, and tokens are not stored in this log.
      </p>
      <div className="mt-6 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="data">
          <thead>
            <tr>
              <th>When</th>
              <th>Staff</th>
              <th>Action</th>
              <th>Record</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{formatLagosShort(entry.createdAt)}</td>
                <td>{entry.actorName ?? "Unknown"}</td>
                <td>{entry.action}</td>
                <td>
                  {entry.entityType}
                  <span className="mt-1 block font-mono text-xs text-muted">{entry.entityId}</span>
                </td>
                <td className="max-w-xs font-mono text-xs">{metadataSummary(entry.metadata ?? {})}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {entries.length === 0 ? <p className="px-4 py-6">No audit entries yet.</p> : null}
      </div>
    </>
  );
}
