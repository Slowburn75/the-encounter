import { forbidden, redirect } from "next/navigation";
import { getActor } from "@/lib/auth/session";
import { PRIVACY_DRAFT_BANNER } from "@/lib/domain/privacy";
import { hasPermission } from "@/lib/domain/permissions";

export default async function SettingsPage() {
  const actor = await getActor();
  if (!actor) redirect("/admin/login");
  if (!hasPermission(actor, "settings.manage")) forbidden();

  return (
    <>
      <h1 className="font-display text-4xl text-pine">Settings</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Decisions the church still needs to record before a public launch.
      </p>

      <section className="mt-6 rounded-3xl border border-line bg-card px-5 py-5">
        <h2 className="font-display text-2xl">Still to confirm with the church</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>{PRIVACY_DRAFT_BANNER}</li>
          <li>Final required and optional status of the eight registration fields, and the wording of gender, age, and marital options.</li>
          <li>How long registration records are kept, and who may authorise deletion.</li>
          <li>The public site address used in QR codes, before any printed materials are produced.</li>
          <li>Multi-factor authentication for privileged staff is not built in this release.</li>
        </ul>
      </section>
    </>
  );
}
