import { connection } from "next/server";
import { and, asc, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  auditLogs,
  eventBanners,
  events,
  messages,
  registrations,
  users,
} from "@/lib/db/schema";
import type { ExportRow } from "@/lib/domain/csv";
import { PAGE_SIZE, TIME_ZONE } from "@/lib/domain/constants";
import { whatsAppStatusLabel } from "@/lib/domain/messages";
import { normalizePhone } from "@/lib/domain/phone";
import { isPublicEventStatus } from "@/lib/domain/registration-window";
import { likeContains } from "@/lib/domain/text";
import { formatLagosShort, lagosLocalToUtc } from "@/lib/domain/time";

export async function listPublicEvents() {
  await connection();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  return getDb()
    .select()
    .from(events)
    .where(
      or(
        eq(events.status, "published"),
        and(
          inArray(events.status, ["registration_closed", "cancelled", "completed"]),
          gte(events.startsAt, cutoff),
        ),
      ),
    )
    .orderBy(asc(events.startsAt));
}

export async function getEventBySlug(slug: string) {
  await connection();
  const [event] = await getDb().select().from(events).where(eq(events.slug, slug));
  return event ?? null;
}

export async function getEventById(eventId: string) {
  const [event] = await getDb().select().from(events).where(eq(events.id, eventId));
  return event ?? null;
}

export async function acceptedCount(eventId: string): Promise<number> {
  const [row] = await getDb()
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(registrations)
    .where(and(eq(registrations.eventId, eventId), eq(registrations.status, "accepted")));
  return Number(row?.count ?? 0);
}

export async function getRegistrationByReference(slug: string, reference: string) {
  await connection();
  const [row] = await getDb()
    .select({
      reference: registrations.reference,
      fullName: registrations.fullName,
      whatsappConsent: registrations.whatsappConsent,
      messageStatus: messages.status,
      title: events.title,
      theme: events.theme,
      startsAt: events.startsAt,
      venueName: events.venueName,
      venueAddress: events.venueAddress,
      status: events.status,
    })
    .from(registrations)
    .innerJoin(events, eq(events.id, registrations.eventId))
    .leftJoin(
      messages,
      and(eq(messages.registrationId, registrations.id), eq(messages.type, "confirmation")),
    )
    .where(and(eq(events.slug, slug), eq(registrations.reference, reference)));
  if (!row || !isPublicEventStatus(row.status)) return null;
  return row;
}

export type RegistrationFilters = {
  q?: string;
  from?: string;
  to?: string;
  sort?: string;
  dir?: string;
  page?: number;
};

function registrationWhere(eventId: string, filters: RegistrationFilters) {
  const clauses = [eq(registrations.eventId, eventId)];
  const query = filters.q?.trim().slice(0, 80) ?? "";
  if (query) {
    const digits = query.replace(/\D/g, "");
    const phone = normalizePhone(query);
    const matches = [
      ilike(registrations.fullName, likeContains(query)),
      ilike(registrations.reference, likeContains(query)),
    ];
    if (phone.ok) matches.push(eq(registrations.phoneE164, phone.e164));
    else if (digits.length >= 4) {
      matches.push(ilike(registrations.phoneE164, likeContains(digits.replace(/^0+/, ""))));
    }
    clauses.push(or(...matches)!);
  }
  if (filters.from) {
    const start = lagosLocalToUtc(`${filters.from}T00:00:00`);
    if (start) clauses.push(gte(registrations.createdAt, start));
  }
  if (filters.to) {
    const end = lagosLocalToUtc(`${filters.to}T23:59:59`);
    if (end) clauses.push(lte(registrations.createdAt, end));
  }
  return and(...clauses);
}

function registrationOrder(filters: RegistrationFilters) {
  const direction = filters.dir === "asc" ? asc : desc;
  if (filters.sort === "name") {
    return [direction(registrations.fullName), desc(registrations.createdAt)];
  }
  return [direction(registrations.createdAt)];
}

export async function listRegistrations(
  eventId: string,
  filters: RegistrationFilters,
  includeSensitive: boolean,
) {
  const where = registrationWhere(eventId, filters);
  const page = Math.max(1, filters.page ?? 1);
  const db = getDb();
  const [countRow] = await db
    .select({ count: sql<number>`cast(count(*) as int)` })
    .from(registrations)
    .where(where);
  const total = Number(countRow?.count ?? 0);
  const rows = await db
    .select({
      id: registrations.id,
      reference: registrations.reference,
      fullName: registrations.fullName,
      phoneDisplay: registrations.phoneDisplay,
      email: includeSensitive ? registrations.email : sql<string | null>`null`,
      area: includeSensitive ? registrations.area : sql<string | null>`null`,
      gender: includeSensitive ? registrations.gender : sql<string | null>`null`,
      ageRange: registrations.ageRange,
      maritalStatus: includeSensitive ? registrations.maritalStatus : sql<string | null>`null`,
      status: registrations.status,
      duplicateFlag: registrations.duplicateFlag,
      createdAt: registrations.createdAt,
      whatsappStatus: messages.status,
    })
    .from(registrations)
    .leftJoin(
      messages,
      and(eq(messages.registrationId, registrations.id), eq(messages.type, "confirmation")),
    )
    .where(where)
    .orderBy(...registrationOrder(filters))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);
  return { rows, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export async function registrationsForExport(
  eventId: string,
  filters: RegistrationFilters,
): Promise<ExportRow[]> {
  const rows = await getDb()
    .select({
      reference: registrations.reference,
      fullName: registrations.fullName,
      phone: registrations.phoneDisplay,
      email: registrations.email,
      area: registrations.area,
      gender: registrations.gender,
      ageRange: registrations.ageRange,
      maritalStatus: registrations.maritalStatus,
      status: registrations.status,
      whatsappStatus: messages.status,
      duplicateFlag: registrations.duplicateFlag,
      createdAt: registrations.createdAt,
      source: registrations.source,
    })
    .from(registrations)
    .leftJoin(
      messages,
      and(eq(messages.registrationId, registrations.id), eq(messages.type, "confirmation")),
    )
    .where(registrationWhere(eventId, filters))
    .orderBy(desc(registrations.createdAt))
    .limit(50000);
  return rows.map((row) => ({
    reference: row.reference,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    area: row.area,
    gender: row.gender,
    ageRange: row.ageRange,
    maritalStatus: row.maritalStatus,
    status: row.status,
    whatsappStatus: whatsAppStatusLabel(row.whatsappStatus),
    duplicateFlag: row.duplicateFlag ? "Yes" : "No",
    registeredAt: formatLagosShort(row.createdAt),
    source: row.source,
  }));
}

export async function getRegistrationDetail(
  registrationId: string,
  access: { includePrayer: boolean; includeSensitive: boolean },
) {
  const [row] = await getDb()
    .select({
      id: registrations.id,
      eventId: registrations.eventId,
      reference: registrations.reference,
      fullName: registrations.fullName,
      phoneDisplay: registrations.phoneDisplay,
      phoneE164: registrations.phoneE164,
      email: access.includeSensitive ? registrations.email : sql<string | null>`null`,
      area: access.includeSensitive ? registrations.area : sql<string | null>`null`,
      gender: access.includeSensitive ? registrations.gender : sql<string | null>`null`,
      ageRange: registrations.ageRange,
      maritalStatus: access.includeSensitive
        ? registrations.maritalStatus
        : sql<string | null>`null`,
      prayerRequest: access.includePrayer
        ? registrations.prayerRequest
        : sql<string | null>`null`,
      status: registrations.status,
      source: registrations.source,
      whatsappConsent: registrations.whatsappConsent,
      guardianAcknowledged: registrations.guardianAcknowledged,
      duplicateFlag: registrations.duplicateFlag,
      createdAt: registrations.createdAt,
      updatedAt: registrations.updatedAt,
      messageStatus: messages.status,
      messageError: messages.lastError,
      attemptCount: messages.attemptCount,
    })
    .from(registrations)
    .leftJoin(
      messages,
      and(eq(messages.registrationId, registrations.id), eq(messages.type, "confirmation")),
    )
    .where(eq(registrations.id, registrationId));
  return row ?? null;
}

export type EventStats = {
  total: number;
  today: number;
  anonymized: number;
  byDay: { label: string; count: number }[];
  byAge: { label: string; count: number }[];
  byGender: { label: string; count: number }[];
  byArea: { label: string; count: number }[];
  whatsapp: {
    delivered: number;
    sent: number;
    failed: number;
    pending: number;
    notRequested: number;
  };
};

export async function eventStats(eventId: string): Promise<EventStats> {
  const db = getDb();
  const [totals] = await db.execute<{ total: number; today: number; anonymized: number }>(sql`
    select
      count(*) filter (where status = 'accepted')::int as total,
      count(*) filter (
        where status = 'accepted'
          and (created_at at time zone ${TIME_ZONE})::date
            = (now() at time zone ${TIME_ZONE})::date
      )::int as today,
      count(*) filter (where status = 'anonymized')::int as anonymized
    from registrations
    where event_id = ${eventId}
  `);
  const byDay = await db.execute<{ label: string; count: number }>(sql`
    select to_char(created_at at time zone ${TIME_ZONE}, 'YYYY-MM-DD') as label,
           count(*)::int as count
    from registrations
    where event_id = ${eventId} and status = 'accepted'
    group by 1
    order by 1
  `);
  const byAge = await db.execute<{ label: string; count: number }>(sql`
    select age_range as label, count(*)::int as count
    from registrations
    where event_id = ${eventId} and status = 'accepted'
    group by age_range
    order by count desc, age_range
  `);
  const byGender = await db.execute<{ label: string; count: number }>(sql`
    select coalesce(gender, 'Not answered') as label, count(*)::int as count
    from registrations
    where event_id = ${eventId} and status = 'accepted'
    group by 1
    order by count desc, label
  `);
  const byArea = await db.execute<{ label: string; count: number }>(sql`
    select area as label, count(*)::int as count
    from registrations
    where event_id = ${eventId} and status = 'accepted'
    group by area
    order by count desc, area
    limit 8
  `);
  const [whatsapp] = await db.execute<{
    delivered: number;
    sent: number;
    failed: number;
    pending: number;
    not_requested: number;
  }>(sql`
    select
      count(*) filter (where m.status = 'delivered')::int as delivered,
      count(*) filter (where m.status = 'sent')::int as sent,
      count(*) filter (where m.status = 'failed')::int as failed,
      count(*) filter (where m.status in ('queued', 'sending', 'pending_provider'))::int as pending,
      count(*) filter (where r.whatsapp_consent = false)::int as not_requested
    from registrations r
    left join messages m on m.registration_id = r.id and m.type = 'confirmation'
    where r.event_id = ${eventId} and r.status = 'accepted'
  `);
  return {
    total: Number(totals?.total ?? 0),
    today: Number(totals?.today ?? 0),
    anonymized: Number(totals?.anonymized ?? 0),
    byDay: [...byDay].map((row) => ({ label: row.label, count: Number(row.count) })),
    byAge: [...byAge].map((row) => ({ label: row.label, count: Number(row.count) })),
    byGender: [...byGender].map((row) => ({ label: row.label, count: Number(row.count) })),
    byArea: [...byArea].map((row) => ({ label: row.label, count: Number(row.count) })),
    whatsapp: {
      delivered: Number(whatsapp?.delivered ?? 0),
      sent: Number(whatsapp?.sent ?? 0),
      failed: Number(whatsapp?.failed ?? 0),
      pending: Number(whatsapp?.pending ?? 0),
      notRequested: Number(whatsapp?.not_requested ?? 0),
    },
  };
}

export async function eventSummaries(eventIds: string[]) {
  if (eventIds.length === 0) return [];
  const idList = sql.join(
    eventIds.map((id) => sql`${id}`),
    sql`, `,
  );
  return getDb().execute<{
    event_id: string;
    total: number;
    today: number;
    failed: number;
  }>(sql`
    select r.event_id,
      count(*) filter (where r.status = 'accepted')::int as total,
      count(*) filter (
        where r.status = 'accepted'
          and (r.created_at at time zone ${TIME_ZONE})::date
            = (now() at time zone ${TIME_ZONE})::date
      )::int as today,
      count(*) filter (where m.status = 'failed')::int as failed
    from registrations r
    left join messages m on m.registration_id = r.id and m.type = 'confirmation'
    where r.event_id in (${idList})
    group by r.event_id
  `);
}

export async function listAudit(options: { eventId?: string; limit?: number }) {
  const limit = options.limit ?? 100;
  const db = getDb();
  if (!options.eventId) {
    return db
      .select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        entityId: auditLogs.entityId,
        metadata: auditLogs.metadata,
        createdAt: auditLogs.createdAt,
        actorName: users.name,
      })
      .from(auditLogs)
      .leftJoin(users, eq(users.id, auditLogs.actorId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
  return db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorId))
    .where(
      or(
        eq(auditLogs.entityId, options.eventId),
        sql`${auditLogs.metadata} ->> 'eventId' = ${options.eventId}`,
      ),
    )
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export async function listStaff() {
  const people = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      status: users.status,
      lastLoginAt: users.lastLoginAt,
    })
    .from(users)
    .orderBy(asc(users.name));
  return people;
}

export async function getBanner(eventId: string) {
  const [banner] = await getDb()
    .select()
    .from(eventBanners)
    .where(eq(eventBanners.eventId, eventId));
  return banner ?? null;
}

export async function eventHasBanner(eventId: string): Promise<boolean> {
  const [row] = await getDb()
    .select({ eventId: eventBanners.eventId })
    .from(eventBanners)
    .where(eq(eventBanners.eventId, eventId));
  return Boolean(row);
}
