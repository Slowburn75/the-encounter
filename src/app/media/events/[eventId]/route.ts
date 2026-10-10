import { getActor } from "@/lib/auth/session";
import { getBanner, getEventById } from "@/lib/data";
import { canAccessEvent } from "@/lib/domain/permissions";
import { isPublicEventStatus } from "@/lib/domain/registration-window";

export async function GET(
  _request: Request,
  context: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await context.params;
  const [event, banner] = await Promise.all([getEventById(eventId), getBanner(eventId)]);
  if (!event || !banner) return new Response("Not found", { status: 404 });
  const isPublic = isPublicEventStatus(event.status);
  if (!isPublic) {
    const actor = await getActor();
    if (!actor || !canAccessEvent(actor, event.id)) return new Response("Not found", { status: 404 });
  }
  return new Response(new Uint8Array(banner.bytes), {
    headers: {
      "Content-Type": banner.contentType,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": isPublic ? "public, max-age=300" : "private, no-store",
    },
  });
}
