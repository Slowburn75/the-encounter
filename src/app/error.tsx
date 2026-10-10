"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-display text-4xl text-pine">Something went wrong</h1>
      <p className="mt-3 leading-7">
        Please try again. If you were registering, your place is saved only after you see a registration reference.
      </p>
      <button type="button" onClick={() => reset()} className="mt-6 font-semibold text-pine underline">
        Try again
      </button>
    </main>
  );
}
