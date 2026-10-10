import type { Metadata } from "next";
import { PublicChrome } from "@/components/public-chrome";
import { ProgramLanding } from "@/components/program-landing";
import { listPublicEvents } from "@/lib/data";

export const metadata: Metadata = {
  title: "The Encounter",
  description: "Register for The Encounter, a gathering of Encounter Worship. No account is required.",
};

export default async function HomePage() {
  const programs = await listPublicEvents();
  const featured = programs.find((program) => program.slug === "the-encounter") ?? programs[0];
  if (!featured) {
    return (
      <PublicChrome>
        <h1 className="font-display text-5xl text-pine">The Encounter</h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          Registration is not open yet. Check back when Encounter Worship publishes the gathering.
        </p>
      </PublicChrome>
    );
  }
  return (
    <ProgramLanding
      event={featured}
      others={programs
        .filter((program) => program.id !== featured.id)
        .map((program) => ({ slug: program.slug, title: program.title }))}
    />
  );
}
