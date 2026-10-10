import type { EventStatus } from "@/lib/domain/constants";
import { isSlugLocked } from "@/lib/domain/registration-window";
import { isHttpsUrl, normalizeSpaces, slugify } from "@/lib/domain/text";
import { lagosLocalToUtc } from "@/lib/domain/time";

export type EventFieldErrors = Partial<
  Record<
    | "title"
    | "theme"
    | "description"
    | "slug"
    | "startsAt"
    | "endsAt"
    | "venueName"
    | "venueAddress"
    | "registrationOpensAt"
    | "registrationClosesAt"
    | "capacity"
    | "contactEmail"
    | "contactPhone"
    | "bannerUrl"
    | "privacyNotice"
    | "faq"
    | "form",
    string
  >
>;

export type FaqItem = { question: string; answer: string };

export type EventDraft = {
  title: string;
  theme: string | null;
  description: string;
  slug: string;
  startsAt: Date;
  endsAt: Date | null;
  venueName: string;
  venueAddress: string;
  registrationOpensAt: Date | null;
  registrationClosesAt: Date | null;
  capacity: number | null;
  contactName: string | null;
  contactPhone: string | null;
  contactEmail: string | null;
  faq: FaqItem[];
  privacyNotice: string | null;
  bannerUrl: string | null;
  intent: "draft" | "publish";
};

export type RawEvent = {
  title?: unknown;
  theme?: unknown;
  description?: unknown;
  slug?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  venueName?: unknown;
  venueAddress?: unknown;
  registrationOpensAt?: unknown;
  registrationClosesAt?: unknown;
  capacity?: unknown;
  contactName?: unknown;
  contactPhone?: unknown;
  contactEmail?: unknown;
  privacyNotice?: unknown;
  bannerUrl?: unknown;
  intent?: unknown;
  faqQuestion?: unknown;
  faqAnswer?: unknown;
};

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => text(item));
  if (typeof value === "string") return [value];
  return [];
}

export function parseEventForm(
  raw: RawEvent,
  options: { currentSlug?: string; status?: EventStatus },
): { ok: true; value: EventDraft } | { ok: false; fieldErrors: EventFieldErrors } {
  const fieldErrors: EventFieldErrors = {};
  const intent = raw.intent === "publish" ? "publish" : "draft";
  const title = normalizeSpaces(text(raw.title));
  if (title.length < 3 || title.length > 140) {
    fieldErrors.title = "Enter a program title of at least 3 characters.";
  }

  const themeRaw = normalizeSpaces(text(raw.theme));
  const theme = themeRaw ? themeRaw.slice(0, 140) : null;
  if (themeRaw.length > 140) fieldErrors.theme = "Keep the theme under 140 characters.";

  const description = text(raw.description).trim();
  if (description.length > 5000) {
    fieldErrors.description = "Keep the description under 5,000 characters.";
  }
  if (intent === "publish" && description.length < 20) {
    fieldErrors.description =
      "Add a short description before publishing. At least 20 characters.";
  }

  const slugLocked = options.status ? isSlugLocked(options.status) : false;
  const slugSource = slugLocked
    ? (options.currentSlug ?? "")
    : text(raw.slug) || title;
  const slug = slugify(slugSource);
  if (!slug || slug.length < 3) {
    fieldErrors.slug = "Enter a public link using letters, numbers and hyphens.";
  }

  const startsAt = lagosLocalToUtc(text(raw.startsAt));
  if (!startsAt) fieldErrors.startsAt = "Enter the program date and time.";
  const endsRaw = text(raw.endsAt);
  const endsAt = endsRaw ? lagosLocalToUtc(endsRaw) : null;
  if (endsRaw && !endsAt) fieldErrors.endsAt = "Enter a valid end time.";
  if (startsAt && endsAt && endsAt <= startsAt) {
    fieldErrors.endsAt = "The end time must be after the start time.";
  }

  const venueName = normalizeSpaces(text(raw.venueName));
  if (venueName.length < 2 || venueName.length > 160) {
    fieldErrors.venueName = "Enter the venue name.";
  }
  const venueAddress = normalizeSpaces(text(raw.venueAddress));
  if (venueAddress.length > 240) {
    fieldErrors.venueAddress = "Keep the address under 240 characters.";
  }
  if (intent === "publish" && venueAddress.length < 3) {
    fieldErrors.venueAddress = "Add the venue address before publishing.";
  }

  const opensRaw = text(raw.registrationOpensAt);
  const closesRaw = text(raw.registrationClosesAt);
  const registrationOpensAt = opensRaw ? lagosLocalToUtc(opensRaw) : null;
  const registrationClosesAt = closesRaw ? lagosLocalToUtc(closesRaw) : null;
  if (opensRaw && !registrationOpensAt) {
    fieldErrors.registrationOpensAt = "Enter a valid opening time.";
  }
  if (closesRaw && !registrationClosesAt) {
    fieldErrors.registrationClosesAt = "Enter a valid closing time.";
  }
  if (
    registrationOpensAt &&
    registrationClosesAt &&
    registrationClosesAt <= registrationOpensAt
  ) {
    fieldErrors.registrationClosesAt =
      "Registration must close after it opens.";
  }

  const capacityRaw = text(raw.capacity).trim();
  let capacity: number | null = null;
  if (capacityRaw) {
    if (!/^\d+$/.test(capacityRaw)) {
      fieldErrors.capacity = "Capacity must be a whole number, or left blank.";
    } else {
      capacity = Number(capacityRaw);
      if (capacity < 1 || capacity > 100000) {
        fieldErrors.capacity = "Capacity must be between 1 and 100,000, or blank.";
      }
    }
  }

  const contactName = normalizeSpaces(text(raw.contactName)) || null;
  const contactPhone = normalizeSpaces(text(raw.contactPhone)) || null;
  const contactEmailRaw = text(raw.contactEmail).trim();
  let contactEmail: string | null = null;
  if (contactEmailRaw) {
    if (
      contactEmailRaw.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmailRaw)
    ) {
      fieldErrors.contactEmail = "Enter a valid contact email, or leave it blank.";
    } else {
      contactEmail = contactEmailRaw.toLowerCase();
    }
  }
  if (intent === "publish" && !contactPhone && !contactEmail) {
    fieldErrors.contactPhone =
      "Add a contact phone number or email before publishing.";
  }

  const bannerRaw = text(raw.bannerUrl).trim();
  let bannerUrl: string | null = null;
  if (bannerRaw) {
    if (!isHttpsUrl(bannerRaw) || bannerRaw.length > 500) {
      fieldErrors.bannerUrl = "Banner links must be full https addresses.";
    } else {
      bannerUrl = bannerRaw;
    }
  }

  const privacyRaw = text(raw.privacyNotice).trim();
  if (privacyRaw.length > 8000) {
    fieldErrors.privacyNotice = "Keep the privacy notice under 8,000 characters.";
  }

  const questions = list(raw.faqQuestion);
  const answers = list(raw.faqAnswer);
  const faq: FaqItem[] = [];
  const pairs = Math.max(questions.length, answers.length);
  for (let index = 0; index < pairs; index += 1) {
    const question = normalizeSpaces(questions[index] ?? "");
    const answer = (answers[index] ?? "").trim();
    if (!question && !answer) continue;
    if (!question || !answer) {
      fieldErrors.faq = "Each question needs an answer, and each answer needs a question.";
      break;
    }
    if (question.length > 200 || answer.length > 1000) {
      fieldErrors.faq = "Questions must be under 200 characters and answers under 1,000.";
      break;
    }
    faq.push({ question, answer });
  }
  if (faq.length > 8) fieldErrors.faq = "You can add up to 8 questions.";

  if (Object.keys(fieldErrors).length > 0 || !startsAt) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      title,
      theme,
      description,
      slug,
      startsAt,
      endsAt,
      venueName,
      venueAddress,
      registrationOpensAt,
      registrationClosesAt,
      capacity,
      contactName,
      contactPhone,
      contactEmail,
      faq,
      privacyNotice: privacyRaw || null,
      bannerUrl,
      intent,
    },
  };
}
