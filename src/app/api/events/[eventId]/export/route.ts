import { writeAudit } from "@/lib/audit";
import { getActor } from "@/lib/auth/session";
import { getEventById, registrationsForExport } from "@/lib/data";
import { toCsv } from "@/lib/domain/csv";
import { toXlsx } from "@/lib/domain/xlsx";
import { permissionDenial } from "@/lib/domain/permissions";
import { firstParam } from "@/lib/domain/text";
import { requestIp } from "@/lib/http";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const actor = await getActor();
  const event = await getEventById(eventId);
  if (!actor || !event) return new Response("Not found", { status: 404 });
  const denial = permissionDenial(actor, "registrations.export", event.id);
  if (denial) return new Response("You do not have permission to export this list.", { status: 403 });

  const url = new URL(request.url);
  const format = url.searchParams.get("format") === "xlsx" ? "xlsx" : "csv";
  const rows = await registrationsForExport(event.id, {
    q: firstParam(url.searchParams.get("q") ?? undefined),
    from: firstParam(url.searchParams.get("from") ?? undefined),
    to: firstParam(url.searchParams.get("to") ?? undefined),
  });
  await writeAudit({
    actorId: actor.id,
    action: "registration.export",
    entityType: "event",
    entityId: event.id,
    metadata: { eventId: event.id, rows: rows.length, format },
    ip: await requestIp(),
  });
  if (format === "xlsx") {
    return new Response(new Uint8Array(toXlsx(rows)), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="encounter-${event.slug}-registrations.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  }
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="encounter-${event.slug}-registrations.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
