import { getActor } from "@/lib/auth/session";
import { getEventById } from "@/lib/data";
import { canAccessEvent } from "@/lib/domain/permissions";
import { eventRegisterUrl } from "@/lib/http";
import { registrationQrSvg } from "@/lib/qr-mark";

export async function GET(
  request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const actor = await getActor();
  const event = await getEventById(eventId);
  if (!actor || !event || !canAccessEvent(actor, event.id)) {
    return new Response("Not found", { status: 404 });
  }
  const svg = await registrationQrSvg(eventRegisterUrl(event.slug));
  const download = new URL(request.url).searchParams.get("download") === "1";
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="encounter-${event.slug}-qr.svg"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
