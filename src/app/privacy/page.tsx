import type { Metadata } from "next";
import { PublicChrome } from "@/components/public-chrome";
import { PRIVACY_DRAFT_BANNER, PRIVACY_SECTIONS } from "@/lib/domain/privacy";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <PublicChrome>
      <article className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">Privacy</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-pine sm:text-5xl">How registration information is used</h1>
        <p className="mt-6 border border-line bg-card px-4 py-3 text-sm leading-6 text-muted">{PRIVACY_DRAFT_BANNER}</p>
        <div className="mt-10 space-y-8">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl text-pine">{section.title}</h2>
              <p className="mt-3 text-base leading-7">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </PublicChrome>
  );
}
