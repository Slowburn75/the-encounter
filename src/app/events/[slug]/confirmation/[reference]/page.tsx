import type { Metadata } from "next";
import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";
import { getRegistrationByReference } from "@/lib/data";
import { requestIp } from "@/lib/http";
import { formatVenue } from "@/lib/domain/place";
import { formatLagos } from "@/lib/domain/time";
import { consumeRateLimit } from "@/lib/rate-limit";

export const metadata: Metadata = { title: "Registration confirmed", robots: { index: false } };

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ slug: string; reference: string }>;
}) {
  const { slug, reference } = await params;
  const allowed = await consumeRateLimit(`confirm:${await requestIp()}`, 60, 60);
  const registration = allowed ? await getRegistrationByReference(slug, reference) : null;

  return (
    <PublicChrome>
      {!allowed ? (
        <>
          <h1 className="font-display text-4xl text-pine">Please wait</h1>
          <p className="mt-3">Too many confirmation lookups. Try this page again in a minute.</p>
        </>
      ) : !registration ? (
        <>
          <h1 className="font-display text-4xl text-pine">Confirmation not found</h1>
          <p className="mt-3">Check the reference, or contact the church if you need help.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">Registration confirmed</p>
          <h1 className="mt-2 font-display text-4xl text-pine">You are registered, {registration.fullName}</h1>
          <p className="mt-4 max-w-2xl leading-7">
            Keep this reference. It is your confirmation of registration.
          </p>
          <p className="mt-6 rounded-3xl bg-pine px-5 py-6 text-center text-white">
            <span className="block text-sm tracking-[0.14em] uppercase text-white/70">Registration reference</span>
            <span className="mt-2 block font-display text-3xl tracking-wide">{registration.reference}</span>
          </p>
          <div className="mt-6 max-w-2xl space-y-2">
            <p><span className="font-semibold">Program. </span>{registration.title}</p>
            <p><span className="font-semibold">When. </span>{formatLagos(registration.startsAt)}</p>
            <p><span className="font-semibold">Where. </span>{formatVenue(registration.venueName, registration.venueAddress)}</p>
          </div>
          <Link href={`/events/${slug}`} className="mt-8 inline-flex font-semibold text-pine underline">Back to the program</Link>
        </>
      )}
    </PublicChrome>
  );
}


