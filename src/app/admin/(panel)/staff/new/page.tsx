import { desc } from "drizzle-orm";
import { forbidden, redirect } from "next/navigation";
import { StaffForm } from "@/components/staff-form";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { hasPermission } from "@/lib/domain/permissions";

export default async function NewStaffPage() {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!hasPermission(actor, "staff.manage")) forbidden();
  const programs = await getDb()
    .select({ id: events.id, title: events.title })
    .from(events)
    .orderBy(desc(events.startsAt));

  return (
    <>
      <h1 className="font-display text-4xl text-pine">New staff account</h1>
      <p className="mt-2 mb-6 text-muted">
        Assign only the programs this person should see. Volunteers cannot export, correct records, or read prayer requests.
      </p>
      <StaffForm events={programs} />
    </>
  );
}
