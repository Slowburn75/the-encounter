import type { Metadata } from "next";
import Link from "next/link";
import { PublicChrome } from "@/components/public-chrome";
import { getRegistrationByReference } from "@/lib/data";
import { WHATSAPP_SUSPENDED } from "@/lib/domain/constants";
import { requestIp } from "@/lib/http";
import { confirmationMessageNote } from "@/lib/domain/messages";
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
  const messageNote = registration
    ? confirmationMessageNote(registration.messageStatus, WHATSAPP_SUSPENDED)
    : null;

  return (
    <PublicChrome>
      {!allowed ? (
        <Status
          title="Please wait"
          body="Too many confirmation lookups. Try this page again in a minute."
        />
      ) : !registration ? (
        <Status
          title="Confirmation not found"
          body="Check the reference, or contact the church if you need help."
        />
      ) : (
        <>
          <p className="text-xs font-semibold tracking-[0.2em] text-gold uppercase">Registration confirmed</p>
          <h1 className="mt-3 font-display text-4xl leading-tight text-pine sm:text-5xl">
            You are registered, {registration.fullName}
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8">
            Keep this reference. It is your confirmation for this gathering.
          </p>
          <div className="mt-8 border border-pine bg-pine px-6 py-7 text-white">
            <p className="text-xs font-semibold tracking-[0.18em] text-white/80 uppercase">
              Registration reference
            </p>
            <p className="mt-3 font-display text-3xl tracking-wide break-all sm:text-4xl">
              {registration.reference}
            </p>
          </div>
          <dl className="mt-8 border-t border-line">
            <Fact term="Program" value={registration.title} />
            {registration.theme ? <Fact term="Theme" value={registration.theme} /> : null}
            <Fact term="When" value={formatLagos(registration.startsAt)} />
            <Fact term="Where" value={formatVenue(registration.venueName, registration.venueAddress)} />
          </dl>
          {messageNote ? <p className="mt-6 max-w-xl text-base leading-7">{messageNote}</p> : null}
          <Link
            href={`/events/${slug}`}
            className="mt-8 inline-flex min-h-12 items-center font-semibold text-pine underline decoration-pine/30 underline-offset-4"
          >
            Back to the program
          </Link>
        </>
      )}
    </PublicChrome>
  );
}

function Status({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="font-display text-4xl leading-tight text-pine sm:text-5xl">{title}</h1>
      <p className="mt-4 max-w-xl text-lg leading-8">{body}</p>
    </>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-line py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
      <dt className="text-sm font-semibold tracking-[0.14em] text-pine uppercase">{term}</dt>
      <dd className="text-lg leading-8">{value}</dd>
    </div>
  );
}
