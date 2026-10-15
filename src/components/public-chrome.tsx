import Link from "next/link";
import { ChurchMark } from "@/components/church-mark";
import { SiteFooter } from "@/components/site-footer";

export function PublicChrome({
  children,
  width = "reading",
}: {
  children: React.ReactNode;
  width?: "reading" | "wide";
}) {
  const frame = width === "wide" ? "max-w-6xl" : "max-w-3xl";
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-line">
        <div className={`mx-auto flex ${frame} items-center justify-between gap-4 px-5 py-5`}>
          <ChurchMark />
          <nav aria-label="Site" className="flex shrink-0 gap-5 text-sm font-semibold">
            <Link href="/" className="text-ink underline decoration-line underline-offset-4 hover:decoration-pine">
              Home
            </Link>
            <Link href="/privacy" className="text-ink underline decoration-line underline-offset-4 hover:decoration-pine">
              Privacy
            </Link>
          </nav>
        </div>
      </header>
      <main id="content" className={`mx-auto w-full ${frame} flex-1 px-5 ${width === "wide" ? "py-12 sm:py-16" : "py-12"}`}>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
