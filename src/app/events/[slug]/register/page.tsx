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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  return { title: event ? `Register for ${event.title}` : "Register" };
}

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
  const when = formatLagos(event.startsAt);
  const place = formatVenue(event.venueName, event.venueAddress);

  return (
    <PublicChrome width="wide">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(16rem,0.72fr)_minmax(0,1.28fr)] lg:gap-16">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Registration</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-pine sm:text-5xl">
            <Link href={`/events/${event.slug}`} className="hover:underline decoration-pine/30 underline-offset-8">
              {event.title}
            </Link>
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink">{when}</p>
          {place ? <p className="text-lg leading-8 text-ink">{place}</p> : null}
          <p className="mt-5 max-w-md text-base leading-7 text-muted">
            You do not need an account. Required fields are marked. After you register, keep the reference on the next screen.
          </p>
        </div>
        <div className="min-w-0">
          {availability.open ? (
            <RegistrationForm slug={event.slug} idempotencyKey={crypto.randomUUID()} source={source} />
          ) : (
            <p className="border border-line bg-card px-6 py-8 text-lg leading-8">
              {registrationClosedMessage(availability.reason, event.registrationOpensAt)}
            </p>
          )}
        </div>
      </div>
    </PublicChrome>
  );
}
