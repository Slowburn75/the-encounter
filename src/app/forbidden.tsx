import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-4xl text-pine">You do not have access</h1>
      <p className="mt-3 text-muted">This part of the staff area is outside your role.</p>
      <Link href="/admin" className="mt-6 inline-flex font-semibold text-pine underline">Back to the overview</Link>
    </main>
  );
}
