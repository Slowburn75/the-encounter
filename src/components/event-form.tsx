"use client";

import { useActionState } from "react";
import { buttonClass, inputClass, labelClass, secondaryButtonClass } from "@/components/styles";
import type { EventStatus } from "@/lib/domain/constants";
import type { FaqItem } from "@/lib/domain/event-input";
import { saveEvent, type EventFormState } from "@/server/event-actions";

export type EventFormDefaults = {
  eventId?: string;
  status?: EventStatus;
  title: string;
  theme: string;
  description: string;
  slug: string;
  slugLocked: boolean;
  startsAt: string;
  endsAt: string;
  venueName: string;
  venueAddress: string;
  registrationOpensAt: string;
  registrationClosesAt: string;
  capacity: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  privacyNotice: string;
  bannerUrl: string;
  hasBanner: boolean;
  faq: FaqItem[];
};

const empty = {
  title: "",
  theme: "",
  description: "",
  slug: "",
  slugLocked: false,
  startsAt: "",
  endsAt: "",
  venueName: "",
  venueAddress: "",
  registrationOpensAt: "",
  registrationClosesAt: "",
  capacity: "",
  contactName: "",
  contactPhone: "",
  contactEmail: "",
  privacyNotice: "",
  bannerUrl: "",
  hasBanner: false,
  faq: [],
} satisfies EventFormDefaults;

export function EventForm({ defaults = empty }: { defaults?: EventFormDefaults }) {
  const [state, action, pending] = useActionState<EventFormState, FormData>(saveEvent, {});
  const errors = state.fieldErrors ?? {};
  const faq = [...defaults.faq];
  while (faq.length < 6) faq.push({ question: "", answer: "" });
  const isDraft = !defaults.status || defaults.status === "draft";

  return (
    <form action={action} className="space-y-5">
      {defaults.eventId ? <input type="hidden" name="eventId" value={defaults.eventId} /> : null}
      {state.message ? <p className="rounded-2xl bg-sand px-4 py-3 text-sm font-semibold text-clay">{state.message}</p> : null}
      <Field label="Program title" name="title" error={errors.title}>
        <input name="title" id="title" required defaultValue={defaults.title} className={inputClass} />
      </Field>
      <Field label="Theme" name="theme" error={errors.theme} hint="Optional.">
        <input name="theme" id="theme" defaultValue={defaults.theme} className={inputClass} />
      </Field>
      <Field label="Description" name="description" error={errors.description}>
        <textarea name="description" id="description" rows={5} defaultValue={defaults.description} className={inputClass} />
      </Field>
      <Field label="Public link" name="slug" error={errors.slug} hint={defaults.slugLocked ? "The link stays the same after publishing so printed QR codes keep working." : "Letters, numbers and hyphens. Leave blank to create one from the title."}>
        <input name="slug" id="slug" defaultValue={defaults.slug} readOnly={defaults.slugLocked} className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Starts (West Africa Time)" name="startsAt" error={errors.startsAt}>
          <input name="startsAt" id="startsAt" type="datetime-local" required defaultValue={defaults.startsAt} className={inputClass} />
        </Field>
        <Field label="Ends (West Africa Time)" name="endsAt" error={errors.endsAt} hint="Optional.">
          <input name="endsAt" id="endsAt" type="datetime-local" defaultValue={defaults.endsAt} className={inputClass} />
        </Field>
        <Field label="Registration opens" name="registrationOpensAt" error={errors.registrationOpensAt} hint="Optional. Published programs are open immediately if this is blank.">
          <input name="registrationOpensAt" id="registrationOpensAt" type="datetime-local" defaultValue={defaults.registrationOpensAt} className={inputClass} />
        </Field>
        <Field label="Registration closes" name="registrationClosesAt" error={errors.registrationClosesAt}>
          <input name="registrationClosesAt" id="registrationClosesAt" type="datetime-local" defaultValue={defaults.registrationClosesAt} className={inputClass} />
        </Field>
      </div>
      <Field label="Venue" name="venueName" error={errors.venueName}>
        <input name="venueName" id="venueName" required defaultValue={defaults.venueName} className={inputClass} />
      </Field>
      <Field label="Address" name="venueAddress" error={errors.venueAddress}>
        <input name="venueAddress" id="venueAddress" defaultValue={defaults.venueAddress} className={inputClass} />
      </Field>
      <Field label="Capacity" name="capacity" error={errors.capacity} hint="Leave blank if there is no limit.">
        <input name="capacity" id="capacity" inputMode="numeric" defaultValue={defaults.capacity} className={inputClass} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Contact name" name="contactName">
          <input name="contactName" id="contactName" defaultValue={defaults.contactName} className={inputClass} />
        </Field>
        <Field label="Contact phone" name="contactPhone" error={errors.contactPhone}>
          <input name="contactPhone" id="contactPhone" defaultValue={defaults.contactPhone} className={inputClass} />
        </Field>
        <Field label="Contact email" name="contactEmail" error={errors.contactEmail}>
          <input name="contactEmail" id="contactEmail" type="email" defaultValue={defaults.contactEmail} className={inputClass} />
        </Field>
      </div>
      <Field label="Banner image" name="banner" hint="JPEG, PNG or WebP, up to 4 MB. Or paste an https link.">
        <input name="banner" id="banner" type="file" accept="image/jpeg,image/png,image/webp" className={inputClass} />
      </Field>
      <Field label="Banner link" name="bannerUrl" error={errors.bannerUrl}>
        <input name="bannerUrl" id="bannerUrl" defaultValue={defaults.bannerUrl} placeholder="https://" className={inputClass} />
      </Field>
      {defaults.hasBanner || defaults.bannerUrl ? (
        <label className="flex gap-3 text-sm">
          <input name="removeBanner" type="checkbox" />
          Remove the current banner
        </label>
      ) : null}
      <fieldset className="space-y-3">
        <legend className={labelClass}>Questions and answers</legend>
        {errors.faq ? <p className="text-sm font-semibold text-clay">{errors.faq}</p> : null}
        {faq.slice(0, 6).map((item, index) => (
          <div key={index} className="grid gap-3 rounded-2xl border border-line bg-card p-3">
            <input name="faqQuestion" defaultValue={item.question} placeholder={`Question ${index + 1}`} className={inputClass} />
            <textarea name="faqAnswer" defaultValue={item.answer} rows={2} placeholder="Answer" className={inputClass} />
          </div>
        ))}
      </fieldset>
      <Field label="Privacy notice override" name="privacyNotice" error={errors.privacyNotice} hint="Optional. Leave blank to use the draft church notice. The church must approve the final wording.">
        <textarea name="privacyNotice" id="privacyNotice" rows={5} defaultValue={defaults.privacyNotice} className={inputClass} />
      </Field>
      <div className="flex flex-wrap gap-3">
        {isDraft ? (
          <>
            <button name="intent" value="draft" disabled={pending} className={secondaryButtonClass}>
              {pending ? "Saving…" : "Save draft"}
            </button>
            <button name="intent" value="publish" disabled={pending} className={buttonClass}>
              {pending ? "Saving…" : "Save and publish"}
            </button>
          </>
        ) : (
          <button name="intent" value="draft" disabled={pending} className={buttonClass}>
            {pending ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      {hint ? <p className="text-sm text-muted">{hint}</p> : null}
      {children}
      {error ? <p className="mt-1 text-sm font-semibold text-clay">{error}</p> : null}
    </div>
  );
}
