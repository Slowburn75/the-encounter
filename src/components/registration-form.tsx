"use client";

import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import Link from "next/link";
import { useActionState } from "react";
import { AGE_RANGES, GENDER_OPTIONS, MARITAL_OPTIONS, WHATSAPP_SUSPENDED } from "@/lib/domain/constants";
import { PRIVACY_DRAFT_BANNER } from "@/lib/domain/privacy";
import { registerForEvent, type RegistrationFormState } from "@/server/public-actions";

const FOCUS_ID: Record<string, string> = {
  fullName: "fullName",
  phone: "phone",
  email: "email",
  area: "area",
  gender: "gender",
  ageRange: "ageRange",
  maritalStatus: "maritalStatus",
  prayerRequest: "prayerRequest",
  privacy: "privacyAccepted",
  guardian: "guardianAcknowledged",
  form: "registration-alert",
};

type Draft = {
  fullName: string;
  phone: string;
  email: string;
  area: string;
  gender: string;
  ageRange: string;
  maritalStatus: string;
  prayerRequest: string;
  privacyAccepted: boolean;
  guardianAcknowledged: boolean;
  whatsappConsent: boolean;
};

const EMPTY_DRAFT: Draft = {
  fullName: "",
  phone: "",
  email: "",
  area: "",
  gender: "",
  ageRange: "",
  maritalStatus: "",
  prayerRequest: "",
  privacyAccepted: false,
  guardianAcknowledged: false,
  whatsappConsent: false,
};

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
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const errors = state.fieldErrors ?? {};
  const errorKey = Object.keys(FOCUS_ID)
    .filter((name) => errors[name])
    .join("|");

  useEffect(() => {
    if (!state.message && !errorKey) return;
    const first = errorKey ? errorKey.split("|")[0] : "form";
    const node = document.getElementById(FOCUS_ID[first] ?? "registration-alert");
    node?.focus();
  }, [state.message, errorKey]);

  function text(name: keyof Draft) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setDraft((current) => ({ ...current, [name]: event.target.value }));
    };
  }

  function tick(name: "privacyAccepted" | "guardianAcknowledged" | "whatsappConsent") {
    return (event: ChangeEvent<HTMLInputElement>) => {
      setDraft((current) => ({ ...current, [name]: event.target.checked }));
    };
  }

  return (
    <form action={action} className="worship-form" noValidate aria-busy={pending || undefined}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="idempotencyKey" value={idempotencyKey} />
      <input type="hidden" name="source" value={source} />
      <div className="sr-only" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      {state.message ? (
        <div
          id="registration-alert"
          role="alert"
          tabIndex={-1}
          className="mb-8 border border-clay/40 bg-sand px-4 py-3 text-sm leading-6"
        >
          <p className="font-semibold text-clay">{state.message}</p>
        </div>
      ) : null}

      <FormSection index="01" title="Your details">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Full name" name="fullName" required error={errors.fullName}>
            <input
              id="fullName"
              name="fullName"
              autoComplete="name"
              autoCapitalize="words"
              required
              value={draft.fullName}
              onChange={text("fullName")}
              aria-invalid={Boolean(errors.fullName)}
              aria-describedby={errors.fullName ? "fullName-error" : undefined}
              className="worship-field"
            />
          </Field>
          <Field
            label="Phone number"
            name="phone"
            required
            error={errors.phone}
            hint="A Nigerian number can start with 0. An international number can start with +."
          >
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              placeholder="0803 000 0000"
              value={draft.phone}
              onChange={text("phone")}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={describedBy("phone", true, errors.phone)}
              className="worship-field"
            />
          </Field>
        </div>
        <Field label="Email address" name="email" error={errors.email}>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={draft.email}
            onChange={text("email")}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "email-error" : undefined}
            className="worship-field"
          />
        </Field>
      </FormSection>

      <FormSection index="02" title="A little about you">
        <Field
          label="Area of residence"
          name="area"
          required
          error={errors.area}
          hint="A neighbourhood is enough. A full street address is not required."
        >
          <input
            id="area"
            name="area"
            autoComplete="address-level2"
            required
            value={draft.area}
            onChange={text("area")}
            aria-invalid={Boolean(errors.area)}
            aria-describedby={describedBy("area", true, errors.area)}
            className="worship-field"
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Gender" name="gender" error={errors.gender}>
            <select
              id="gender"
              name="gender"
              value={draft.gender}
              onChange={text("gender")}
              aria-invalid={Boolean(errors.gender)}
              aria-describedby={errors.gender ? "gender-error" : undefined}
              className="worship-field"
            >
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
              value={draft.ageRange}
              onChange={text("ageRange")}
              aria-invalid={Boolean(errors.ageRange)}
              aria-describedby={errors.ageRange ? "ageRange-error" : undefined}
              className="worship-field"
            >
              <option value="">Select an age range</option>
              {AGE_RANGES.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </Field>
        </div>
        {draft.ageRange === "Under 18" ? (
          <div className="border border-line bg-sand px-4 py-4">
            <label htmlFor="guardianAcknowledged" className="flex min-h-12 items-start gap-3">
              <input
                id="guardianAcknowledged"
                name="guardianAcknowledged"
                type="checkbox"
                className="worship-check"
                checked={draft.guardianAcknowledged}
                onChange={tick("guardianAcknowledged")}
                aria-invalid={Boolean(errors.guardian)}
                aria-describedby={errors.guardian ? "guardian-error" : "guardian-hint"}
              />
              <span className="text-base leading-6">
                A parent or guardian knows about this registration.
                <span id="guardian-hint" className="mt-1 block text-sm leading-6 text-muted">
                  Required when the age range is under 18.
                </span>
              </span>
            </label>
            {errors.guardian ? (
              <p id="guardian-error" className="mt-2 text-sm font-semibold text-clay">
                {errors.guardian}
              </p>
            ) : null}
          </div>
        ) : null}
        <Field label="Marital status" name="maritalStatus" error={errors.maritalStatus}>
          <select
            id="maritalStatus"
            name="maritalStatus"
            value={draft.maritalStatus}
            onChange={text("maritalStatus")}
            aria-invalid={Boolean(errors.maritalStatus)}
            aria-describedby={errors.maritalStatus ? "maritalStatus-error" : undefined}
            className="worship-field"
          >
            <option value="">Leave unanswered</option>
            {MARITAL_OPTIONS.map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
        </Field>
      </FormSection>

      <FormSection
        index="03"
        title="Prayer and reflection"
        quiet
        intro="Sharing a prayer request is optional. If you write one, only authorised pastoral staff can read it. It is not shown on public pages, ordinary attendance lists, or standard spreadsheet exports."
      >
        <Field label="Prayer request" name="prayerRequest" error={errors.prayerRequest}>
          <textarea
            id="prayerRequest"
            name="prayerRequest"
            rows={6}
            maxLength={2000}
            value={draft.prayerRequest}
            onChange={text("prayerRequest")}
            aria-invalid={Boolean(errors.prayerRequest)}
            aria-describedby={errors.prayerRequest ? "prayerRequest-error" : undefined}
            className="worship-field"
          />
        </Field>
      </FormSection>

      <div className="mt-10 border-t border-line pt-8">
        <h3 className="font-display text-[1.65rem] leading-tight text-pine">How your details are used</h3>
        <div id="privacy-note" className="mt-4 space-y-3 text-base leading-7">
          <p>
            Encounter Worship uses your name, phone number, area of residence, and age range to register you for this gathering and to prepare for the people who are coming. Email, gender, and marital status are optional.
          </p>
          <p>
            These details are used for this gathering only. Registration does not sign you up for unrelated messages.
          </p>
          {WHATSAPP_SUSPENDED ? null : (
            <p>
              If you opt in below, the church will try to send a registration confirmation by WhatsApp. That message does not include a prayer request. A tick does not guarantee delivery.
            </p>
          )}
        </div>
        <p className="mt-4 text-sm leading-6 text-muted">{PRIVACY_DRAFT_BANNER}</p>
        {WHATSAPP_SUSPENDED ? null : (
          <label htmlFor="whatsappConsent" className="mt-6 flex min-h-12 items-start gap-3">
            <input
              id="whatsappConsent"
              name="whatsappConsent"
              type="checkbox"
              className="worship-check"
              checked={draft.whatsappConsent}
              onChange={tick("whatsappConsent")}
            />
            <span className="text-base leading-6">
              Send my registration confirmation by WhatsApp. This is optional, and registration does not depend on it.
            </span>
          </label>
        )}
        <label htmlFor="privacyAccepted" className="mt-6 flex min-h-12 items-start gap-3">
          <input
            id="privacyAccepted"
            name="privacyAccepted"
            type="checkbox"
            className="worship-check"
            checked={draft.privacyAccepted}
            onChange={tick("privacyAccepted")}
            aria-invalid={Boolean(errors.privacy)}
            aria-describedby={errors.privacy ? "privacy-note privacy-error" : "privacy-note"}
            required
          />
          <span className="text-base leading-6">
            I agree that Encounter Worship may use these details to register me for this gathering.{" "}
            <Link href="/privacy" className="font-semibold text-pine underline decoration-pine/30 underline-offset-4">
              Privacy notice
            </Link>
            .
          </span>
        </label>
        {errors.privacy ? (
          <p id="privacy-error" className="mt-2 text-sm font-semibold text-clay">
            {errors.privacy}
          </p>
        ) : null}
      </div>

      <button type="submit" className="worship-submit mt-8" disabled={pending}>
        {pending ? "Registering…" : "Complete registration"}
      </button>
    </form>
  );
}

function describedBy(name: string, hint: boolean, error?: string) {
  const ids = [];
  if (hint) ids.push(`${name}-hint`);
  if (error) ids.push(`${name}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
}

function FormSection({
  index,
  title,
  intro,
  quiet = false,
  children,
}: {
  index: string;
  title: string;
  intro?: string;
  quiet?: boolean;
  children: ReactNode;
}) {
  const headingId = `section-${index}`;
  return (
    <section
      aria-labelledby={headingId}
      className={quiet ? "worship-section worship-section-quiet" : "worship-section"}
    >
      <p className="text-xs font-semibold tracking-[0.18em] text-gold">{index}</p>
      <h3 id={headingId} className="mt-1 font-display text-[1.65rem] leading-tight text-pine">
        {title}
      </h3>
      {intro ? <p className="mt-3 max-w-prose text-sm leading-6 text-muted">{intro}</p> : null}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
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
  children: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={name} className="text-base font-semibold text-ink">
          {label}
        </label>
        <span className="shrink-0 text-[0.7rem] font-semibold tracking-[0.14em] text-muted uppercase">
          {required ? "Required" : "Optional"}
        </span>
      </div>
      {children}
      {hint ? (
        <p id={`${name}-hint`} className="mt-2 text-sm leading-6 text-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${name}-error`} className="mt-2 text-sm font-semibold text-clay">
          {error}
        </p>
      ) : null}
    </div>
  );
}
