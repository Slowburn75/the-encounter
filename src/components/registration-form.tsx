"use client";

import { useState } from "react";
import { AGE_RANGES, GENDER_OPTIONS, MARITAL_OPTIONS } from "@/lib/domain/constants";
import { PRIVACY_DRAFT_BANNER } from "@/lib/domain/privacy";
import { registerForEvent, type RegistrationFormState } from "@/server/public-actions";
import { useActionState } from "react";
import Link from "next/link";
import { buttonClass, inputClass, labelClass } from "@/components/styles";

export function RegistrationForm({
  slug,
  idempotencyKey,
  source,
}: {
  slug: string;
  idempotencyKey: string;
  source: string;
}) {
  const [state, action, pending] = useActionState<RegistrationFormState, FormData>(
    registerForEvent,
    {},
  );
  const [ageRange, setAgeRange] = useState("");
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="source" value={source} />
      <div className="absolute -left-[9999px] h-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {state.message ? (
        <div role="alert" className="rounded-2xl border border-clay/30 bg-sand px-4 py-3 text-sm">
          <p className="font-semibold text-clay">{state.message}</p>
        </div>
      ) : null}
      <Field label="Full name" name="fullName" required error={errors.fullName}>
        <input id="fullName" name="fullName" autoComplete="name" required className={inputClass} />
      </Field>
      <Field label="Phone number" name="phone" required error={errors.phone} hint="Nigerian numbers can start with 0. International numbers can start with +.">
        <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="0803 000 0000" className={inputClass} />
      </Field>
      <Field label="Email address" name="email" error={errors.email} hint="Optional.">
        <input id="email" name="email" type="email" autoComplete="email" className={inputClass} />
      </Field>
      <Field label="Home address or area of residence" name="area" required error={errors.area} hint="A neighbourhood is enough. A full street address is not required.">
        <input id="area" name="area" autoComplete="address-level2" required className={inputClass} />
      </Field>
      <Field label="Gender" name="gender" error={errors.gender} hint="Optional.">
        <select id="gender" name="gender" className={inputClass} defaultValue="">
          <option value="">Leave unanswered</option>
          {GENDER_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      <Field label="Age range" name="ageRange" required error={errors.ageRange}>
        <select
          id="ageRange"
          name="ageRange"
          required
          className={inputClass}
          value={ageRange}
          onChange={(event) => setAgeRange(event.target.value)}
        >
          <option value="">Select an age range</option>
          {AGE_RANGES.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      {ageRange === "Under 18" ? (
        <label className="flex gap-3 rounded-2xl bg-sand px-4 py-3 text-sm">
          <input name="guardianAcknowledged" type="checkbox" className="mt-1" />
          <span>
            A parent or guardian knows about this registration.
            {errors.guardian ? <span className="mt-1 block font-semibold text-clay">{errors.guardian}</span> : null}
          </span>
        </label>
      ) : null}
      <Field label="Marital status" name="maritalStatus" error={errors.maritalStatus} hint="Optional.">
        <select id="maritalStatus" name="maritalStatus" className={inputClass} defaultValue="">
          <option value="">Leave unanswered</option>
          {MARITAL_OPTIONS.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </Field>
      <Field
        label="Prayer requests"
        name="prayerRequest"
        error={errors.prayerRequest}
        hint="Optional. Only authorised pastoral staff can read this. It is not included in attendance lists or standard exports."
      >
        <textarea id="prayerRequest" name="prayerRequest" rows={5} maxLength={2000} className={inputClass} />
      </Field>
      <section className="rounded-2xl border border-line bg-sand px-4 py-4 text-sm leading-6">
        <p className="font-semibold">Before you submit</p>
        <p className="mt-2 text-muted">{PRIVACY_DRAFT_BANNER}</p>
        <p className="mt-2">
          The church uses this information to register you, prepare for the program, and respond if you ask for prayer. Read the{" "}
          <Link href="/privacy" className="font-semibold text-pine underline">
            privacy notice
          </Link>
          .
        </p>
        <label className="mt-3 flex gap-3">
          <input name="privacyAccepted" type="checkbox" className="mt-1" />
          <span>I understand how Encounter Worship will use this information.</span>
        </label>
        {errors.privacy ? <p className="mt-2 font-semibold text-clay">{errors.privacy}</p> : null}
      </section>
      <button className={`${buttonClass} w-full sm:w-auto`} disabled={pending}>
        {pending ? "Submitting…" : "Submit registration"}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>
        {label}
        {required ? <span className="text-clay"> *</span> : null}
      </label>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      {children}
      {error ? (
        <p id={`${name}-error`} className="mt-1 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
