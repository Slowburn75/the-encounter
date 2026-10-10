import Link from "next/link";
import { ChurchMark } from "@/components/church-mark";
import { SiteFooter } from "@/components/site-footer";

export function PublicChrome({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a href="#content" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-card focus:px-3 focus:py-2">
        Skip to content
      </a>
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-5">
          <ChurchMark />
          <nav aria-label="Site" className="flex gap-5 text-sm font-semibold">
            <Link href="/">Home</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
        </div>
      </header>
      <main id="content" className="mx-auto w-full max-w-3xl flex-1 px-5 py-12">
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
