import { forbidden, redirect } from "next/navigation";
import { EventForm } from "@/components/event-form";
import { getActor } from "@/lib/auth/session";
import { hasPermission } from "@/lib/domain/permissions";

export default async function NewEventPage() {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!hasPermission(actor, "events.create")) forbidden();
  return (
    <>
      <h1 className="font-display text-4xl text-pine">New program</h1>
      <p className="mt-2 mb-6 text-muted">Times are West Africa Time, Lagos. A draft stays off the public site.</p>
      <EventForm />
    </>
  );
}
