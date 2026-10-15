import Link from "next/link";
import { ChurchMark } from "@/components/church-mark";
import { CHURCH_NAME } from "@/lib/domain/constants";

export function SiteFooter({
  contactName,
  contactPhone,
  contactEmail,
}: {
  contactName?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
}) {
  const phone = contactPhone?.trim() || null;
  const email = contactEmail?.trim() || null;
  const name = contactName?.trim() || null;
  const hasContact = Boolean(name || phone || email);

  return (
    <footer className="border-t border-line px-5 py-16">
      <div className="mx-auto grid max-w-6xl gap-12 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
        <div>
          <ChurchMark />
          <p className="mt-4 max-w-sm text-base leading-7 text-ink">
            {CHURCH_NAME} gathers from time to time. Each program has its own page and registration link.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">Contact</p>
          {hasContact ? (
            <div className="mt-4 space-y-2 text-base leading-7 text-ink">
              {name ? <p>{name}</p> : null}
              {phone ? (
                <p>
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className="underline decoration-line underline-offset-4 hover:decoration-pine"
                  >
                    {phone}
                  </a>
                </p>
              ) : null}
              {email ? (
                <p>
                  <a
                    href={`mailto:${encodeURIComponent(email)}`}
                    className="break-all underline decoration-line underline-offset-4 hover:decoration-pine"
                  >
                    {email}
                  </a>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 max-w-xs text-base leading-7 text-ink">
              Contact details are published on each program page.
            </p>
          )}
        </div>
        <nav aria-label="Footer">
          <p className="text-xs font-semibold tracking-[0.16em] text-muted uppercase">On this site</p>
          <ul className="mt-4 space-y-3">
            <li>
              <Link
                href="/"
                className="text-base font-semibold text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine"
              >
                Home
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-base font-semibold text-pine underline decoration-pine/30 underline-offset-4 hover:decoration-pine"
              >
                Privacy notice
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
