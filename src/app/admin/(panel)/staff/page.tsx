import Link from "next/link";
import { forbidden, redirect } from "next/navigation";
import { Notice } from "@/components/notice";
import { buttonClass } from "@/components/styles";
import { getActor } from "@/lib/auth/session";
import { listStaff } from "@/lib/data";
import { ROLE_LABELS, hasPermission } from "@/lib/domain/permissions";
import { firstParam } from "@/lib/domain/text";
import { formatLagosShort } from "@/lib/domain/time";

export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!hasPermission(actor, "staff.manage")) forbidden();
  const query = await searchParams;
  const people = await listStaff();

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl text-pine">Staff</h1>
          <p className="mt-2 text-muted">
            Roles are enforced on the server. Prayer access stays off unless you grant it for a program.
          </p>
        </div>
        <Link href="/admin/staff/new" className={buttonClass}>
          New staff account
        </Link>
      </div>
      <div className="mt-4">
        <Notice notice={firstParam(query.notice)} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-3xl border border-line bg-card">
        <table className="data">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Last sign-in</th>
            </tr>
          </thead>
          <tbody>
            {people.map((person) => (
              <tr key={person.id}>
                <td>
                  <Link href={`/admin/staff/${person.id}`} className="font-semibold text-pine underline">
                    {person.name}
                  </Link>
                </td>
                <td>{person.email}</td>
                <td>{ROLE_LABELS[person.role]}</td>
                <td>{person.status === "active" ? "Active" : "Disabled"}</td>
                <td>{person.lastLoginAt ? formatLagosShort(person.lastLoginAt) : "Never"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
