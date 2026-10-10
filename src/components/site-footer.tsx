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
  const hasContact = Boolean(contactName || contactPhone || contactEmail);
  return (
    <footer className="border-t border-line px-5 py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div>
          <ChurchMark />
          <p className="mt-4 max-w-xs text-sm leading-6 text-muted">
            {CHURCH_NAME} gathers from time to time. Each program has its own page and registration link.
          </p>
        </div>
        <div className="text-sm leading-7">
          {hasContact ? (
            <>
              <p className="font-semibold text-ink">Contact</p>
              {contactName ? <p>{contactName}</p> : null}
              {contactPhone ? <p>{contactPhone}</p> : null}
              {contactEmail ? <p>{contactEmail}</p> : null}
            </>
          ) : (
            <p className="max-w-xs text-muted">Contact details are published on each program page.</p>
          )}
          <p className="mt-4">
            <Link href="/privacy" className="font-semibold text-pine">
              Privacy notice
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
