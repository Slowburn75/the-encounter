import { desc, eq } from "drizzle-orm";
import { forbidden, notFound, redirect } from "next/navigation";
import { StaffForm, type StaffDefaults } from "@/components/staff-form";
import { getActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { eventAssignments, events, users } from "@/lib/db/schema";
import { hasPermission } from "@/lib/domain/permissions";

export default async function EditStaffPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!hasPermission(actor, "staff.manage")) forbidden();

  const db = getDb();
  const [person] = await db.select().from(users).where(eq(users.id, userId));
  if (!person) notFound();

  const [programs, assignments] = await Promise.all([
    db
      .select({ id: events.id, title: events.title })
      .from(events)
      .orderBy(desc(events.startsAt)),
    db.select().from(eventAssignments).where(eq(eventAssignments.userId, person.id)),
  ]);

  const defaults: StaffDefaults = {
    userId: person.id,
    name: person.name,
    email: person.email,
    role: person.role,
    status: person.status,
    assignments: Object.fromEntries(
      assignments.map((assignment) => [
        assignment.eventId,
        {
          canExport: assignment.canExport,
          canEdit: assignment.canEdit,
          canViewPrayer: assignment.canViewPrayer,
        },
      ]),
    ),
  };

  return (
    <>
      <h1 className="font-display text-4xl text-pine">Edit staff account</h1>
      <p className="mt-2 mb-6 text-muted">
        Changing the role, status, or password signs this person out. At least one active super administrator must remain.
      </p>
      <StaffForm defaults={defaults} events={programs} />
    </>
  );
}
