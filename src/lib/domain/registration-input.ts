import {
  AGE_RANGES,
  GENDER_OPTIONS,
  MARITAL_OPTIONS,
  type AgeRange,
  type GenderOption,
  type MaritalOption,
} from "@/lib/domain/constants";
import { normalizePhone } from "@/lib/domain/phone";
import { isReasonableName, isUuid, normalizeSpaces } from "@/lib/domain/text";

export type FieldErrors = Partial<
  Record<
    | "fullName"
    | "phone"
    | "email"
    | "area"
    | "gender"
    | "ageRange"
    | "maritalStatus"
    | "prayerRequest"
    | "privacy"
    | "guardian"
    | "form",
    string
  >
>;

export type RegistrationDraft = {
  fullName: string;
  phoneE164: string;
  phoneDisplay: string;
  email: string | null;
  area: string;
  gender: GenderOption | null;
  ageRange: AgeRange;
  maritalStatus: MaritalOption | null;
  prayerRequest: string | null;
  whatsappConsent: boolean;
  guardianAcknowledged: boolean;
  idempotencyKey: string;
  source: string | null;
};

export type RawRegistration = {
  fullName?: unknown;
  phone?: unknown;
  email?: unknown;
  area?: unknown;
  gender?: unknown;
  ageRange?: unknown;
  maritalStatus?: unknown;
  prayerRequest?: unknown;
  whatsappConsent?: unknown;
  privacyAccepted?: unknown;
  guardianAcknowledged?: unknown;
  idempotencyKey?: unknown;
  website?: unknown;
  source?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function checked(value: unknown): boolean {
  return value === "on" || value === "true" || value === true;
}

export function parseRegistration(
  raw: RawRegistration,
):
  | { ok: true; value: RegistrationDraft }
  | { ok: false; honeypot: boolean; fieldErrors: FieldErrors } {
  if (text(raw.website).trim()) {
    return {
      ok: false,
      honeypot: true,
      fieldErrors: { form: "Registration could not be submitted." },
    };
  }

  const fieldErrors: FieldErrors = {};
  const fullName = normalizeSpaces(text(raw.fullName));
  if (!isReasonableName(fullName)) {
    fieldErrors.fullName =
      "Enter the name you would like the church to use. Letters, spaces, hyphens and apostrophes are fine.";
  }

  const phone = normalizePhone(text(raw.phone));
  if (!phone.ok) {
    fieldErrors.phone =
      "Enter a valid phone number. Nigerian numbers can start with 0. International numbers can start with +.";
  }

  const emailRaw = text(raw.email).trim();
  let email: string | null = null;
  if (emailRaw) {
    if (emailRaw.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      fieldErrors.email = "Enter a valid email address, or leave this blank.";
    } else {
      email = emailRaw.toLowerCase();
    }
  }

  const area = normalizeSpaces(text(raw.area));
  if (area.length < 2 || area.length > 160 || /[\u0000-\u001F]/.test(area)) {
    fieldErrors.area = "Enter your neighbourhood or area of residence.";
  }

  const genderRaw = text(raw.gender);
  let gender: GenderOption | null = null;
  if (genderRaw) {
    if (!GENDER_OPTIONS.includes(genderRaw as GenderOption)) {
      fieldErrors.gender = "Choose one of the listed options, or leave this blank.";
    } else {
      gender = genderRaw as GenderOption;
    }
  }

  const ageRaw = text(raw.ageRange);
  let ageRange: AgeRange | null = null;
  if (!AGE_RANGES.includes(ageRaw as AgeRange)) {
    fieldErrors.ageRange = "Choose an age range.";
  } else {
    ageRange = ageRaw as AgeRange;
  }

  const maritalRaw = text(raw.maritalStatus);
  let maritalStatus: MaritalOption | null = null;
  if (maritalRaw) {
    if (!MARITAL_OPTIONS.includes(maritalRaw as MaritalOption)) {
      fieldErrors.maritalStatus =
        "Choose one of the listed options, or leave this blank.";
    } else {
      maritalStatus = maritalRaw as MaritalOption;
    }
  }

  const prayerRaw = text(raw.prayerRequest).trim();
  let prayerRequest: string | null = null;
  if (prayerRaw.length > 2000) {
    fieldErrors.prayerRequest = "Prayer requests must be 2,000 characters or fewer.";
  } else if (prayerRaw) {
    prayerRequest = prayerRaw;
  }

  if (!checked(raw.privacyAccepted)) {
    fieldErrors.privacy =
      "Please confirm that you understand how this information will be used.";
  }

  const guardianAcknowledged = checked(raw.guardianAcknowledged);
  if (ageRange === "Under 18" && !guardianAcknowledged) {
    fieldErrors.guardian =
      "A parent or guardian needs to know about this registration before it can be submitted.";
  }

  const idempotencyKey = text(raw.idempotencyKey);
  if (!isUuid(idempotencyKey)) {
    fieldErrors.form = "Please reload the page and submit the form again.";
  }

  const sourceRaw = text(raw.source).trim();
  let source: string | null = null;
  if (sourceRaw) {
    if (!/^[a-z0-9_-]{1,40}$/i.test(sourceRaw)) {
      source = null;
    } else {
      source = sourceRaw.slice(0, 40);
    }
  }

  if (Object.keys(fieldErrors).length > 0 || !phone.ok || !ageRange) {
    return { ok: false, honeypot: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      fullName,
      phoneE164: phone.e164,
      phoneDisplay: phone.display,
      email,
      area,
      gender,
      ageRange,
      maritalStatus,
      prayerRequest,
      whatsappConsent: checked(raw.whatsappConsent),
      guardianAcknowledged,
      idempotencyKey,
      source,
    },
  };
}

export type RegistrationUpdate = {
  fullName: string;
  phoneE164: string;
  phoneDisplay: string;
  email: string | null;
  area: string;
  gender: GenderOption | null;
  ageRange: AgeRange;
  maritalStatus: MaritalOption | null;
  prayerRequest: string | null;
  guardianAcknowledged: boolean;
};

export function parseRegistrationUpdate(
  raw: RawRegistration,
  options: { allowPrayer: boolean },
): { ok: true; value: RegistrationUpdate } | { ok: false; fieldErrors: FieldErrors } {
  const parsed = parseRegistration({
    ...raw,
    privacyAccepted: "on",
    whatsappConsent: "",
    idempotencyKey: "8b0b5a2e-4c1d-4e5f-8a11-6d0e9a7c2b44",
    website: "",
  });
  if (!parsed.ok) {
    const fieldErrors = { ...parsed.fieldErrors };
    delete fieldErrors.form;
    delete fieldErrors.privacy;
    return { ok: false, fieldErrors };
  }
  return {
    ok: true,
    value: {
      fullName: parsed.value.fullName,
      phoneE164: parsed.value.phoneE164,
      phoneDisplay: parsed.value.phoneDisplay,
      email: parsed.value.email,
      area: parsed.value.area,
      gender: parsed.value.gender,
      ageRange: parsed.value.ageRange,
      maritalStatus: parsed.value.maritalStatus,
      prayerRequest: options.allowPrayer ? parsed.value.prayerRequest : null,
      guardianAcknowledged: parsed.value.guardianAcknowledged,
    },
  };
}
