import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicChrome } from "@/components/public-chrome";
import { RegistrationForm } from "@/components/registration-form";
import { acceptedCount, getEventBySlug } from "@/lib/data";
import { registrationClosedMessage } from "@/lib/domain/messages";
import { isPublicEventStatus, registrationAvailability } from "@/lib/domain/registration-window";
import { firstParam } from "@/lib/domain/text";
import { formatVenue } from "@/lib/domain/place";
import { formatLagos } from "@/lib/domain/time";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const event = await getEventBySlug(slug);
  if (!event || !isPublicEventStatus(event.status)) notFound();
  const availability = registrationAvailability(event, new Date(), await acceptedCount(event.id));
  const source = firstParam(query.src).replace(/[^a-z0-9_-]/gi, "").slice(0, 40);

  return (
    <PublicChrome>
      <p className="text-sm font-semibold text-gold">
        <Link href={`/events/${event.slug}`}>{event.title}</Link>
      </p>
      <h1 className="mt-2 font-display text-4xl text-pine">Register</h1>
      <p className="mt-2 text-muted">{formatLagos(event.startsAt)} · {formatVenue(event.venueName, event.venueAddress)}</p>
      <p className="mt-4 text-sm">Required fields are marked. You do not need an account.</p>
      <div className="mt-6 max-w-2xl">
        {availability.open ? (
          <RegistrationForm slug={event.slug} idempotencyKey={crypto.randomUUID()} source={source} />
        ) : (
          <p className="rounded-2xl bg-sand px-4 py-4 font-semibold">
            {registrationClosedMessage(availability.reason, event.registrationOpensAt)}
          </p>
        )}
      </div>
    </PublicChrome>
  );
}
