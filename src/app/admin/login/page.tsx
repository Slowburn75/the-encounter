import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getActor } from "@/lib/auth/session";
import { firstParam, safeAdminNext } from "@/lib/domain/text";

export const metadata: Metadata = { title: "Staff sign in", robots: { index: false, follow: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (await getActor()) redirect("/admin");
  const query = await searchParams;
  return (
    <main className="admin-ui flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-xl border border-line bg-card px-6 py-7">
        <p className="text-xs font-medium tracking-widest text-muted uppercase">Staff console</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="mt-2 text-sm text-muted">Use the account an administrator gave you. Attendees do not sign in.</p>
        {firstParam(query.notice) ? <p className="mt-4 rounded-lg bg-sand px-4 py-3 text-sm">{firstParam(query.notice)}</p> : null}
        <div className="mt-6">
          <LoginForm next={safeAdminNext(firstParam(query.next))} />
        </div>
      </div>
    </main>
  );
}
