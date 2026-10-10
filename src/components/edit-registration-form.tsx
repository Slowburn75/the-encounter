"use client";

import { useState } from "react";
import { useActionState } from "react";
import { AGE_RANGES, GENDER_OPTIONS, MARITAL_OPTIONS } from "@/lib/domain/constants";
import { buttonClass, inputClass, labelClass } from "@/components/styles";
import { updateRegistration, type EditRegistrationState } from "@/server/registration-actions";

export function EditRegistrationForm({
  registration,
  allowPrayer,
}: {
  registration: {
    id: string;
    fullName: string;
    phoneDisplay: string;
    email: string | null;
    area: string;
    gender: string | null;
    ageRange: string;
    maritalStatus: string | null;
    prayerRequest: string | null;
    guardianAcknowledged: boolean;
  };
  allowPrayer: boolean;
}) {
  const [state, action, pending] = useActionState<EditRegistrationState, FormData>(updateRegistration, {});
  const [ageRange, setAgeRange] = useState(registration.ageRange);
  const errors = state.fieldErrors ?? {};
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="registrationId" value={registration.id} />
      {state.message ? <p className="text-sm font-semibold text-clay">{state.message}</p> : null}
      <Labeled name="fullName" label="Full name" error={errors.fullName}>
        <input id="fullName" name="fullName" defaultValue={registration.fullName} className={inputClass} />
      </Labeled>
      <Labeled name="phone" label="Phone number" error={errors.phone}>
        <input id="phone" name="phone" defaultValue={registration.phoneDisplay} className={inputClass} />
      </Labeled>
      <Labeled name="email" label="Email" error={errors.email}>
        <input id="email" name="email" defaultValue={registration.email ?? ""} className={inputClass} />
      </Labeled>
      <Labeled name="area" label="Area of residence" error={errors.area}>
        <input id="area" name="area" defaultValue={registration.area} className={inputClass} />
      </Labeled>
      <Labeled name="gender" label="Gender" error={errors.gender}>
        <select id="gender" name="gender" defaultValue={registration.gender ?? ""} className={inputClass}>
          <option value="">Leave unanswered</option>
          {GENDER_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </Labeled>
      <Labeled name="ageRange" label="Age range" error={errors.ageRange}>
        <select id="ageRange" name="ageRange" value={ageRange} onChange={(event) => setAgeRange(event.target.value)} className={inputClass}>
          {AGE_RANGES.map((option) => <option key={option}>{option}</option>)}
        </select>
      </Labeled>
      {ageRange === "Under 18" ? (
        <label className="flex gap-2 text-sm">
          <input name="guardianAcknowledged" type="checkbox" defaultChecked={registration.guardianAcknowledged} />
          A parent or guardian knows about this registration.
        </label>
      ) : null}
      {errors.guardian ? <p className="text-sm font-semibold text-clay">{errors.guardian}</p> : null}
      <Labeled name="maritalStatus" label="Marital status" error={errors.maritalStatus}>
        <select id="maritalStatus" name="maritalStatus" defaultValue={registration.maritalStatus ?? ""} className={inputClass}>
          <option value="">Leave unanswered</option>
          {MARITAL_OPTIONS.map((option) => <option key={option}>{option}</option>)}
        </select>
      </Labeled>
      {allowPrayer ? (
        <Labeled name="prayerRequest" label="Prayer request" error={errors.prayerRequest}>
          <textarea id="prayerRequest" name="prayerRequest" rows={5} defaultValue={registration.prayerRequest ?? ""} className={inputClass} />
        </Labeled>
      ) : null}
      <button className={buttonClass} disabled={pending}>{pending ? "Saving…" : "Save corrections"}</button>
    </form>
  );
}

function Labeled({
  name,
  label,
  error,
  children,
}: {
  name: string;
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className={labelClass}>{label}</label>
      {children}
      {error ? <p className="mt-1 text-sm font-semibold text-clay">{error}</p> : null}
    </div>
  );
}
