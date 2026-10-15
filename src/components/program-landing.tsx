import Image from "next/image";
import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
import { SiteFooter } from "@/components/site-footer";
import { WorshipHeader } from "@/components/worship-header";
import { acceptedCount, eventHasBanner } from "@/lib/data";
import { CHURCH_NAME } from "@/lib/domain/constants";
import { registrationClosedMessage } from "@/lib/domain/messages";
import { formatVenue, venueNeedsDirections } from "@/lib/domain/place";
import { registrationAvailability } from "@/lib/domain/registration-window";
import { formatLagos } from "@/lib/domain/time";
import { officialLogoSrc, worshipImages } from "@/lib/worship-assets";
import type { events } from "@/lib/db/schema";

type Program = typeof events.$inferSelect;

export async function ProgramLanding({
  event,
  others = [],
}: {
  event: Program;
  others?: { slug: string; title: string }[];
}) {
  const [count, hasBanner] = await Promise.all([
    acceptedCount(event.id),
    eventHasBanner(event.id),
  ]);
  const availability = registrationAvailability(event, new Date(), count);
  const registerHref = "#register";
  const when = formatLagos(event.startsAt);
  const until = event.endsAt ? formatLagos(event.endsAt) : null;
  const place = formatVenue(event.venueName, event.venueAddress);
  const needsDirections = venueNeedsDirections(event.venueName, event.venueAddress);
  const contact = contactLine(event);
  const remaining =
    event.capacity !== null && availability.open ? Math.max(event.capacity - count, 0) : null;
  const hero = hasBanner
    ? { src: `/media/events/${event.id}`, remote: false, staff: true }
    : event.bannerUrl
      ? { src: event.bannerUrl, remote: true, staff: true }
      : { src: worshipImages.hero, remote: false, staff: false };

  return (
    <div className="worship-page">
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:bg-card focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <WorshipHeader logoSrc={officialLogoSrc()} registerHref={registerHref} />
      <main id="content">
        <section className="relative flex min-h-[100svh] items-end overflow-hidden bg-pine text-white">
          {hero.remote ? (
            // Staff choose the banner host, so it cannot be limited to one image domain.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <Image
              src={hero.src}
              alt=""
              fill
              priority
              unoptimized={hero.staff}
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-pine via-pine/80 to-pine/55" />
          <div className="absolute inset-0 bg-gradient-to-b from-pine/75 via-pine/25 to-transparent" />
          <div className="relative z-10 mx-auto w-full max-w-6xl px-5 pt-32 pb-16 sm:pb-24">
            <p className="worship-rise text-xs font-semibold tracking-[0.28em] text-white uppercase">
              {CHURCH_NAME}
            </p>
            <h1 className="worship-rise mt-5 max-w-4xl font-display text-5xl leading-[1.02] break-words text-white sm:text-7xl lg:text-8xl">
              {event.title}
            </h1>
            {event.theme ? (
              <p className="worship-rise mt-6 max-w-xl text-lg leading-8 text-white sm:text-xl" style={{ animationDelay: "80ms" }}>
                {event.theme}
              </p>
            ) : null}
            <p className="worship-rise mt-6 text-lg font-medium text-white" style={{ animationDelay: "140ms" }}>
              {when}
              {place ? ` · ${place}` : ""}
            </p>
            <div className="worship-rise mt-8" style={{ animationDelay: "200ms" }}>
              {availability.open ? (
                <a
                  href={registerHref}
                  className="worship-cta inline-flex min-h-14 items-center justify-center bg-white px-7 text-base font-semibold text-pine hover:bg-sand"
                >
                  Register now
                </a>
              ) : (
                <p className="max-w-xl border border-white/50 bg-pine/80 px-4 py-3 font-semibold text-white">
                  {registrationClosedMessage(availability.reason, event.registrationOpensAt)}
                </p>
              )}
            </div>
          </div>
        </section>

        <section id="about" className="px-5 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-2 lg:gap-20">
            <div className="lg:pt-6">
              <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">About</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-pine sm:text-5xl">
                About this gathering
              </h2>
              {event.description ? (
                <div className="mt-6 max-w-xl space-y-4 text-lg leading-8 whitespace-pre-wrap text-ink">
                  {event.description}
                </div>
              ) : (
                <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
                  A description of this gathering has not been published yet.
                </p>
              )}
            </div>
            <figure className="lg:pt-16">
              <div className="relative aspect-[4/3] overflow-hidden bg-pine sm:aspect-[3/2]">
                <Image
                  src={worshipImages.hands}
                  alt="People gathered in worship"
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="mt-3 text-xs leading-5 text-muted">
                Temporary photograph, until the church provides its own.
              </figcaption>
            </figure>
          </div>
        </section>

        <section className="relative h-[52vh] min-h-72 overflow-hidden bg-pine">
          <Image
            src={worshipImages.room}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-pine/25" />
        </section>

        <section id="gathering" className="px-5 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">The gathering</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-pine sm:text-5xl">
              When and where
            </h2>
            <dl className="mt-10 border-t border-line">
              <Detail term="When" value={until ? `${when} to ${until}` : when} />
              <Detail term="Where" value={place || "The venue has not been published yet."} />
              <Detail
                term="Directions"
                value={
                  needsDirections
                    ? "Directions have not been published yet. They will appear here when the church confirms the venue."
                    : event.venueAddress.trim()
                }
              />
              <Detail
                term="Registration"
                value={
                  availability.open
                    ? remaining !== null
                      ? `Open. ${remaining} ${remaining === 1 ? "place" : "places"} remaining.`
                      : "Open. You do not need an account."
                    : registrationClosedMessage(availability.reason, event.registrationOpensAt)
                }
              />
              {contact ? <Detail term="Contact" value={contact} /> : null}
            </dl>
          </div>
        </section>

        <section id="expect" className="bg-sand px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">Order of service</p>
            <h2 className="mt-4 max-w-2xl font-display text-4xl leading-tight text-pine sm:text-5xl">
              The program will be published here
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink">
              The church has not confirmed an order for this gathering. This page shows only the details the church supplies.
            </p>
          </div>
        </section>

        <section id="register" className="px-5 py-20 sm:py-28">
          <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)] lg:gap-16">
            <div className="lg:pt-4">
              <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">Registration</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-pine sm:text-5xl">
                Come, and let the church know
              </h2>
              <p className="mt-6 max-w-md text-lg leading-8 text-ink">
                A few details are enough. You do not need an account. After you register, keep the reference on the next screen.
              </p>
              <p className="mt-4 max-w-md text-base leading-7 text-muted">
                Required fields are marked. A prayer request is optional, and only authorised pastoral staff can read it.
              </p>
            </div>
            <div className="min-w-0">
              {availability.open ? (
                <RegistrationForm
                  slug={event.slug}
                  idempotencyKey={crypto.randomUUID()}
                  source="landing"
                />
              ) : (
                <p className="border border-line bg-card px-6 py-8 text-lg leading-8">
                  {registrationClosedMessage(availability.reason, event.registrationOpensAt)}
                </p>
              )}
            </div>
          </div>
        </section>

        {event.faq.length > 0 ? (
          <section id="questions" className="px-5 py-20 sm:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">Questions</p>
              <h2 className="mt-4 font-display text-4xl text-pine sm:text-5xl">Before you come</h2>
              <div className="mt-10 border-t border-line">
                {event.faq.map((item) => (
                  <details key={item.question} className="group border-b border-line">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-5 font-display text-2xl leading-snug text-pine [&::-webkit-details-marker]:hidden">
                      <span>{item.question}</span>
                      <span aria-hidden="true" className="relative block size-3 shrink-0">
                        <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-pine" />
                        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-pine group-open:hidden" />
                      </span>
                    </summary>
                    <p className="max-w-3xl pb-6 text-base leading-7 whitespace-pre-wrap text-ink">{item.answer}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <section id="questions" className="px-5 py-20 sm:py-28">
            <div className="mx-auto max-w-6xl">
              <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">Questions</p>
              <h2 className="mt-4 font-display text-4xl text-pine sm:text-5xl">Before you come</h2>
              <p className="mt-6 max-w-xl text-lg leading-8 text-muted">
                Practical questions have not been published for this program yet.
              </p>
            </div>
          </section>
        )}

        <section className="bg-pine px-5 py-24 text-white sm:py-32">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-white/70 uppercase">{CHURCH_NAME}</p>
            <h2 className="mt-5 max-w-3xl font-display text-5xl leading-[1.05] sm:text-7xl">{event.title}</h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-white">
              If you are coming, register so the church can prepare a place for you.
            </p>
            <p className="mt-4 text-base font-medium text-white">
              {when}
              {place ? ` · ${place}` : ""}
            </p>
            <a
              href={registerHref}
              className="worship-cta mt-8 inline-flex min-h-14 items-center justify-center bg-white px-7 text-base font-semibold text-pine hover:bg-sand"
            >
              {availability.open ? "Register now" : "See registration"}
            </a>
          </div>
        </section>

        {others.length > 0 ? (
          <section className="px-5 py-16">
            <div className="mx-auto max-w-6xl">
              <h2 className="font-display text-2xl text-pine">Other programs</h2>
              <ul className="mt-4 space-y-2">
                {others.map((program) => (
                  <li key={program.slug}>
                    <Link href={`/events/${program.slug}`} className="text-lg font-semibold text-pine underline decoration-pine/30 underline-offset-4">
                      {program.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter
        contactName={event.contactName}
        contactPhone={event.contactPhone}
        contactEmail={event.contactEmail}
      />
    </div>
  );
}

function contactLine(event: Program) {
  const parts = [event.contactName, event.contactPhone, event.contactEmail].filter(
    (part): part is string => Boolean(part && part.trim()),
  );
  return parts.length > 0 ? parts.join(" · ") : null;
}

function Detail({ term, value }: { term: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-line py-7 sm:grid-cols-[14rem_minmax(0,1fr)] sm:items-baseline sm:gap-10">
      <dt className="text-sm font-semibold tracking-[0.16em] text-pine uppercase">{term}</dt>
      <dd className="max-w-2xl text-lg leading-8 text-ink">{value}</dd>
    </div>
  );
}
