import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { FaqItem } from "@/lib/domain/event-input";

export const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
  toDriver(value) {
    return value;
  },
  fromDriver(value: unknown) {
    if (Buffer.isBuffer(value)) return value;
    if (value instanceof Uint8Array) return Buffer.from(value);
    if (typeof value === "string") {
      return Buffer.from(value.replace(/^\\x/, ""), "hex");
    }
    throw new Error("Unexpected bytea value from Postgres.");
  },
});

export const userRole = pgEnum("user_role", [
  "super_admin",
  "event_admin",
  "registration_officer",
  "volunteer",
]);

export const accountStatus = pgEnum("account_status", ["active", "disabled"]);

export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "registration_closed",
  "completed",
  "cancelled",
  "archived",
]);

export const registrationStatus = pgEnum("registration_status", [
  "accepted",
  "anonymized",
]);

export const messageStatus = pgEnum("message_status", [
  "queued",
  "sending",
  "pending_provider",
  "sent",
  "delivered",
  "failed",
]);

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull(),
  status: accountStatus("status").notNull().default("active"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestamps,
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    theme: text("theme"),
    description: text("description").notNull().default(""),
    bannerUrl: text("banner_url"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    venueName: text("venue_name").notNull(),
    venueAddress: text("venue_address").notNull().default(""),
    registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
    registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
    capacity: integer("capacity"),
    contactName: text("contact_name"),
    contactPhone: text("contact_phone"),
    contactEmail: text("contact_email"),
    faq: jsonb("faq").$type<FaqItem[]>().notNull().default([]),
    status: eventStatus("status").notNull().default("draft"),
    privacyNotice: text("privacy_notice"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    ...timestamps,
  },
  (table) => [index("events_status_starts_idx").on(table.status, table.startsAt)],
);

export const eventBanners = pgTable("event_banners", {
  eventId: uuid("event_id")
    .primaryKey()
    .references(() => events.id, { onDelete: "cascade" }),
  contentType: text("content_type").notNull(),
  bytes: bytea("bytes").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const eventAssignments = pgTable(
  "event_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    canExport: boolean("can_export").notNull().default(false),
    canEdit: boolean("can_edit").notNull().default(false),
    canViewPrayer: boolean("can_view_prayer").notNull().default(false),
  },
  (table) => [
    uniqueIndex("event_assignments_user_event_idx").on(table.userId, table.eventId),
  ],
);

export const registrations = pgTable(
  "registrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    reference: text("reference").notNull().unique(),
    fullName: text("full_name").notNull(),
    phoneE164: text("phone_e164").notNull(),
    phoneDisplay: text("phone_display").notNull(),
    email: text("email"),
    area: text("area").notNull(),
    gender: text("gender"),
    ageRange: text("age_range").notNull(),
    maritalStatus: text("marital_status"),
    prayerRequest: text("prayer_request"),
    status: registrationStatus("status").notNull().default("accepted"),
    source: text("source"),
    whatsappConsent: boolean("whatsapp_consent").notNull().default(false),
    privacyAcceptedAt: timestamp("privacy_accepted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    guardianAcknowledged: boolean("guardian_acknowledged").notNull().default(false),
    idempotencyKey: text("idempotency_key").notNull(),
    duplicateFlag: boolean("duplicate_flag").notNull().default(false),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("registrations_event_idempotency_idx").on(
      table.eventId,
      table.idempotencyKey,
    ),
    index("registrations_event_created_idx").on(table.eventId, table.createdAt),
    index("registrations_event_phone_idx").on(table.eventId, table.phoneE164),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    registrationId: uuid("registration_id")
      .notNull()
      .references(() => registrations.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerRef: text("provider_ref"),
    status: messageStatus("status").notNull().default("queued"),
    attemptCount: integer("attempt_count").notNull().default(0),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("messages_registration_type_idx").on(table.registrationId, table.type),
    index("messages_provider_ref_idx").on(table.providerRef),
  ],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_created_idx").on(table.createdAt),
    index("audit_logs_entity_idx").on(table.entityType, table.entityId),
  ],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  count: integer("count").notNull().default(0),
});

export const schema = {
  users,
  sessions,
  events,
  eventBanners,
  eventAssignments,
  registrations,
  messages,
  auditLogs,
  rateLimits,
};

export const countSql = sql<number>`cast(count(*) as int)`;
