"use server";

import { redirect } from "next/navigation";
import { formString, requestIp } from "@/lib/http";
import { createRegistration } from "@/lib/registration/create";

export type RegistrationFormState = {
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function registerForEvent(
  _state: RegistrationFormState,
  formData: FormData,
): Promise<RegistrationFormState> {
  const result = await createRegistration({
    slug: formString(formData, "slug"),
    ip: await requestIp(),
    raw: {
      fullName: formString(formData, "fullName"),
      phone: formString(formData, "phone"),
      email: formString(formData, "email"),
      area: formString(formData, "area"),
      gender: formString(formData, "gender"),
      ageRange: formString(formData, "ageRange"),
      maritalStatus: formString(formData, "maritalStatus"),
      prayerRequest: formString(formData, "prayerRequest"),
      whatsappConsent: formString(formData, "whatsappConsent"),
      privacyAccepted: formString(formData, "privacyAccepted"),
      guardianAcknowledged: formString(formData, "guardianAcknowledged"),
      idempotencyKey: formString(formData, "idempotencyKey"),
      website: formString(formData, "website"),
      source: formString(formData, "source"),
    },
  });
  if (!result.ok) {
    return { message: result.message, fieldErrors: result.fieldErrors ?? {} };
  }
  redirect(`/events/${result.slug}/confirmation/${result.reference}`);
}
