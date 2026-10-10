export const CHURCH_NAME = "Encounter Worship";
export const TIME_ZONE = "Africa/Lagos";
export const LAGOS_UTC_OFFSET = "+01:00";

export const AGE_RANGES = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55+",
] as const;

export const GENDER_OPTIONS = ["Female", "Male", "Prefer not to say"] as const;

export const MARITAL_OPTIONS = [
  "Single",
  "Married",
  "Widowed",
  "Prefer not to say",
] as const;

export const EVENT_STATUSES = [
  "draft",
  "published",
  "registration_closed",
  "completed",
  "cancelled",
  "archived",
] as const;

export type AgeRange = (typeof AGE_RANGES)[number];
export type GenderOption = (typeof GENDER_OPTIONS)[number];
export type MaritalOption = (typeof MARITAL_OPTIONS)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  draft: "Draft",
  published: "Published — registration open",
  registration_closed: "Registration closed",
  completed: "Completed",
  cancelled: "Cancelled",
  archived: "Archived",
};

export const PAGE_SIZE = 25;

/** Pause WhatsApp copy, consent, and delivery until the church connects a provider. */
export const WHATSAPP_SUSPENDED = true;
