import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { passwordProblem } from "@/lib/auth/password";
import { exportIncludesPrayer, toCsv, type ExportRow } from "@/lib/domain/csv";
import { toXlsx } from "@/lib/domain/xlsx";
import { parseEventForm } from "@/lib/domain/event-input";
import { normalizePhone } from "@/lib/domain/phone";
import { formatVenue, venueNeedsDirections } from "@/lib/domain/place";
import {
  hasPermission,
  type Actor,
  type Assignment,
} from "@/lib/domain/permissions";
import { createRegistrationReference } from "@/lib/domain/reference";
import { parseRegistration } from "@/lib/domain/registration-input";
import {
  canTransition,
  isPublicEventStatus,
  isSlugLocked,
  registrationAvailability,
} from "@/lib/domain/registration-window";
import {
  isReasonableName,
  redactMetadata,
  safeAdminNext,
  sanitizeTemplateParameter,
  scrubSensitiveText,
  slugify,
} from "@/lib/domain/text";
import { lagosLocalToUtc, utcToLagosInput } from "@/lib/domain/time";
import { verifyMetaSignature } from "@/lib/domain/whatsapp-signature";
import { imageKind } from "@/lib/banners";

const eventId = "11111111-1111-4111-8111-111111111111";

function actor(
  role: Actor["role"],
  assignment?: Partial<Assignment>,
  status: Actor["status"] = "active",
): Actor {
  return {
    id: "user",
    name: "Tester",
    role,
    status,
    assignments: assignment
      ? [
          {
            eventId,
            canExport: false,
            canEdit: false,
            canViewPrayer: false,
            ...assignment,
          },
        ]
      : [],
  };
}

const validRegistration = {
  fullName: "Adaeze O'Neil",
  phone: "08031234567",
  email: "",
  area: "Yaba",
  gender: "",
  ageRange: "25–34",
  maritalStatus: "",
  prayerRequest: "Please pray for my family.",
  whatsappConsent: "on",
  privacyAccepted: "on",
  guardianAcknowledged: "",
  idempotencyKey: "8b0b5a2e-4c1d-4e5f-8a11-6d0e9a7c2b44",
  website: "",
  source: "flyer",
};

describe("permissions", () => {
  it("keeps prayer, export and editing off volunteers", () => {
    const volunteer = actor("volunteer", {
      canExport: true,
      canEdit: true,
      canViewPrayer: true,
    });
    expect(hasPermission(volunteer, "registrations.view", eventId)).toBe(true);
    expect(hasPermission(volunteer, "registrations.view_prayer", eventId)).toBe(false);
    expect(hasPermission(volunteer, "registrations.export", eventId)).toBe(false);
    expect(hasPermission(volunteer, "registrations.update", eventId)).toBe(false);
    expect(hasPermission(volunteer, "stats.view", eventId)).toBe(false);
    expect(hasPermission(volunteer, "staff.manage")).toBe(false);
  });

  it("requires an explicit grant before an officer can export or read prayer", () => {
    const officer = actor("registration_officer", { canEdit: true });
    expect(hasPermission(officer, "registrations.export", eventId)).toBe(false);
    expect(hasPermission(officer, "registrations.view_prayer", eventId)).toBe(false);
    expect(hasPermission(officer, "registrations.update", eventId)).toBe(true);
    expect(hasPermission(officer, "registrations.view_sensitive", eventId)).toBe(true);
    expect(
      hasPermission(actor("registration_officer", { canExport: true }), "registrations.export", eventId),
    ).toBe(true);
    expect(
      hasPermission(
        actor("registration_officer", { canViewPrayer: true }),
        "registrations.view_prayer",
        eventId,
      ),
    ).toBe(true);
    expect(
      hasPermission(actor("registration_officer", { canEdit: false }), "registrations.update", eventId),
    ).toBe(false);
  });

  it("limits event administrators to assigned events and blocks global security", () => {
    const admin = actor("event_admin", {});
    expect(hasPermission(admin, "events.create")).toBe(true);
    expect(hasPermission(admin, "registrations.export", eventId)).toBe(true);
    expect(hasPermission(admin, "events.publish", eventId)).toBe(true);
    expect(hasPermission(admin, "events.archive", eventId)).toBe(false);
    expect(hasPermission(admin, "staff.manage")).toBe(false);
    expect(hasPermission(admin, "settings.manage")).toBe(false);
    expect(hasPermission(admin, "registrations.view_prayer", eventId)).toBe(false);
    expect(hasPermission(admin, "registrations.export", "other-event")).toBe(false);
    expect(
      hasPermission(actor("event_admin", { canViewPrayer: true }), "registrations.view_prayer", eventId),
    ).toBe(true);
  });

  it("gives an active super administrator every permission and a disabled one none", () => {
    const superAdmin = actor("super_admin");
    expect(hasPermission(superAdmin, "events.archive")).toBe(true);
    expect(hasPermission(superAdmin, "registrations.view_prayer", eventId)).toBe(true);
    expect(hasPermission(superAdmin, "registrations.anonymize")).toBe(true);
    expect(hasPermission({ ...superAdmin, status: "disabled" }, "events.create")).toBe(false);
  });
});

describe("registration window", () => {
  const base = {
    status: "published" as const,
    registrationOpensAt: null,
    registrationClosesAt: null,
    capacity: null,
  };
  const now = new Date("2026-10-10T12:00:00Z");

  it("opens a published event and closes the other states", () => {
    expect(registrationAvailability(base, now, 0)).toEqual({ open: true });
    expect(registrationAvailability({ ...base, status: "draft" }, now, 0).open).toBe(false);
    expect(registrationAvailability({ ...base, status: "cancelled" }, now, 0)).toMatchObject({
      reason: "cancelled",
    });
    expect(registrationAvailability({ ...base, status: "registration_closed" }, now, 0)).toMatchObject({
      reason: "registration_closed",
    });
    expect(isPublicEventStatus("draft")).toBe(false);
    expect(isPublicEventStatus("archived")).toBe(false);
    expect(isPublicEventStatus("published")).toBe(true);
  });

  it("honours the window and capacity", () => {
    expect(
      registrationAvailability(
        { ...base, registrationOpensAt: new Date("2026-10-11T00:00:00Z") },
        now,
        0,
      ),
    ).toMatchObject({ reason: "not_open_yet" });
    expect(
      registrationAvailability(
        { ...base, registrationClosesAt: new Date("2026-10-09T00:00:00Z") },
        now,
        0,
      ),
    ).toMatchObject({ reason: "window_elapsed" });
    expect(registrationAvailability({ ...base, capacity: 2 }, now, 2)).toMatchObject({
      reason: "full",
    });
    expect(registrationAvailability({ ...base, capacity: 2 }, now, 1)).toEqual({ open: true });
  });

  it("locks the public slug after draft and allows the documented status changes", () => {
    expect(isSlugLocked("draft")).toBe(false);
    expect(isSlugLocked("published")).toBe(true);
    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("published", "registration_closed")).toBe(true);
    expect(canTransition("registration_closed", "published")).toBe(true);
    expect(canTransition("completed", "archived")).toBe(true);
    expect(canTransition("published", "archived")).toBe(false);
    expect(canTransition("archived", "published")).toBe(false);
  });
});

describe("registration input", () => {
  it("accepts the eight fields and normalises a Nigerian number", () => {
    const parsed = parseRegistration(validRegistration);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.phoneE164).toBe("+2348031234567");
    expect(parsed.value.email).toBeNull();
    expect(parsed.value.prayerRequest).toContain("family");
    expect(parsed.value.whatsappConsent).toBe(true);
  });

  it("requires guardian acknowledgement for under 18 and allows a shared optional email to be blank", () => {
    const underAge = parseRegistration({
      ...validRegistration,
      ageRange: "Under 18",
    });
    expect(underAge.ok).toBe(false);
    if (underAge.ok) return;
    expect(underAge.fieldErrors.guardian).toBeTruthy();

    const acknowledged = parseRegistration({
      ...validRegistration,
      ageRange: "Under 18",
      guardianAcknowledged: "on",
    });
    expect(acknowledged.ok).toBe(true);
  });

  it("rejects an empty privacy confirmation, a bad phone and a honeypot fill", () => {
    const privacy = parseRegistration({ ...validRegistration, privacyAccepted: "" });
    expect(privacy.ok).toBe(false);
    const phone = parseRegistration({ ...validRegistration, phone: "12345" });
    expect(phone.ok).toBe(false);
    const bot = parseRegistration({ ...validRegistration, website: "spam" });
    expect(bot.ok).toBe(false);
    if (bot.ok) return;
    expect(bot.honeypot).toBe(true);
  });

  it("accepts names with apostrophes and an international number", () => {
    expect(isReasonableName("Mary-Jane Chukwu")).toBe(true);
    expect(isReasonableName("A")).toBe(false);
    expect(normalizePhone("+14155552671").ok).toBe(true);
  });
});

describe("event input", () => {
  const raw = {
    title: "Annual Gathering",
    description: "An evening of worship, prayer and fellowship for the church.",
    startsAt: "2026-11-15T17:00",
    venueName: "Main auditorium",
    venueAddress: "12 Church Road, Lagos",
    contactPhone: "08031234567",
    intent: "publish",
    faqQuestion: ["Is there a fee?"],
    faqAnswer: ["No. Registration is free."],
  };

  it("converts Lagos local time to UTC and publishes a complete event", () => {
    const parsed = parseEventForm(raw, {});
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.startsAt.toISOString()).toBe("2026-11-15T16:00:00.000Z");
    expect(parsed.value.slug).toBe("annual-gathering");
    expect(utcToLagosInput(parsed.value.startsAt)).toBe("2026-11-15T17:00");
  });

  it("keeps a published slug even if a new one is submitted", () => {
    const parsed = parseEventForm(
      { ...raw, slug: "replaced-link", intent: "draft" },
      { status: "published", currentSlug: "annual-gathering" },
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.slug).toBe("annual-gathering");
  });

  it("blocks publishing without a description or contact", () => {
    const parsed = parseEventForm(
      { ...raw, description: "Too short", contactPhone: "" },
      {},
    );
    expect(parsed.ok).toBe(false);
  });
});

describe("exports and redaction", () => {
  it("never exports prayer requests and neutralises spreadsheet formulas", () => {
    expect(exportIncludesPrayer()).toBe(false);
    const row: ExportRow = {
      reference: "EW-2026-ABCDEFGHJK",
      fullName: "=cmd()",
      phone: "+2348031234567",
      email: null,
      area: "Yaba",
      gender: null,
      ageRange: "25–34",
      maritalStatus: null,
      status: "accepted",
      whatsappStatus: "Pending",
      duplicateFlag: false,
      registeredAt: "2026-10-10 13:00",
      source: null,
    };
    const csv = toCsv([row]);
    expect(csv).not.toMatch(/prayer/i);
    expect(csv).toContain("'=cmd()");
    const workbook = toXlsx([row]).toString("utf8");
    expect(workbook.startsWith("PK")).toBe(true);
    expect(workbook).toContain("xl/worksheets/sheet1.xml");
    expect(workbook).not.toMatch(/prayer/i);
    expect(workbook).not.toMatch(/whatsapp/i);
    expect(workbook).toContain("'=cmd()");
    expect(workbook).toContain("Registration reference");
  });

  it("drops prayer text and long digit strings from operational records", () => {
    expect(
      redactMetadata({
        prayerRequest: "secret request",
        password: "hunter2",
        fields: ["fullName", "prayerRequest"],
        eventId,
      }),
    ).toEqual({ fields: ["fullName", "prayerRequest"], eventId });
    expect(scrubSensitiveText("failed for 2348031234567")).toBe("failed for [redacted]");
    expect(sanitizeTemplateParameter("Ada\nOkonkwo")).toBe("Ada Okonkwo");
  });
});

describe("venue lines", () => {
  it("does not repeat a city that was stored as both name and address", () => {
    expect(formatVenue("Lagos", "Lagos")).toBe("Lagos");
    expect(venueNeedsDirections("Lagos", "Lagos")).toBe(true);
    expect(formatVenue("The hall", "12 Broad Street, Lagos")).toBe("The hall, 12 Broad Street, Lagos");
    expect(venueNeedsDirections("The hall", "12 Broad Street, Lagos")).toBe(false);
  });
});

describe("links, references and images", () => {
  it("slugifies and refuses open redirects", () => {
    expect(slugify("Àdìgún Night")).toBe("adigun-night");
    expect(safeAdminNext("/admin/events")).toBe("/admin/events");
    expect(safeAdminNext("https://evil.example")).toBe("/admin");
    expect(safeAdminNext("//evil.example")).toBe("/admin");
  });

  it("builds an unguessable reference and recognises image bytes", () => {
    const reference = createRegistrationReference(new Date("2026-10-10T00:00:00Z"), () =>
      Uint8Array.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]),
    );
    expect(reference).toBe("EW-2026-ABCDEFGHJK");
    expect(imageKind(Uint8Array.from([0xff, 0xd8, 0xff, 0x00]))).toBe("image/jpeg");
    expect(imageKind(Uint8Array.from([0x3c, 0x68, 0x74, 0x6d, 0x6c]))).toBeNull();
  });

  it("verifies a Meta webhook signature", () => {
    const body = "{\"ok\":true}";
    const digest = createHmac("sha256", "secret").update(body).digest("hex");
    expect(verifyMetaSignature("secret", body, `sha256=${digest}`)).toBe(true);
    expect(verifyMetaSignature("secret", body, "sha256=nope")).toBe(false);
  });

  it("requires a staff password with a letter and a number", () => {
    expect(passwordProblem("short1")).toBeTruthy();
    expect(passwordProblem("longpassword")).toBeTruthy();
    expect(passwordProblem("Encounter2026", "admin@encounterworship.local")).toBeNull();
    expect(passwordProblem("admin@encounterworship.local", "admin@encounterworship.local")).toBeTruthy();
  });

  it("converts a known Lagos local time", () => {
    expect(lagosLocalToUtc("2026-11-15T17:00")?.toISOString()).toBe(
      "2026-11-15T16:00:00.000Z",
    );
    expect(lagosLocalToUtc("2026-13-15T17:00")).toBeNull();
  });
});
