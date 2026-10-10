import type { Metadata } from "next";
import { PublicChrome } from "@/components/public-chrome";
import { PRIVACY_DRAFT_BANNER, PRIVACY_SECTIONS } from "@/lib/domain/privacy";

export const metadata: Metadata = { title: "Privacy notice" };

export default function PrivacyPage() {
  return (
    <PublicChrome>
      <article className="max-w-3xl">
        <p className="text-sm font-semibold tracking-[0.16em] text-gold uppercase">Privacy</p>
        <h1 className="mt-2 font-display text-4xl text-pine">How registration information is used</h1>
        <p className="mt-4 rounded-2xl bg-sand px-4 py-3 text-sm leading-6">{PRIVACY_DRAFT_BANNER}</p>
        <div className="mt-6 space-y-5">
          {PRIVACY_SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl">{section.title}</h2>
              <p className="mt-2 leading-7">{section.body}</p>
            </section>
          ))}
        </div>
      </article>
    </PublicChrome>
  );
}
