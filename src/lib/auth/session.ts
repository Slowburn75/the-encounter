import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { and, eq, gt } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { eventAssignments, sessions, users } from "@/lib/db/schema";
import type { Actor } from "@/lib/domain/permissions";

export const SESSION_COOKIE = "ew_session";
const SESSION_MS = 12 * 60 * 60 * 1000;

export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function createSession(userId: string): Promise<void> {
  const token = newSessionToken();
  await getDb()
    .insert(sessions)
    .values({
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt: new Date(Date.now() + SESSION_MS),
    });
  await setSessionCookie(token);
}

export async function deleteSessionToken(token: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
}

export async function deleteUserSessions(userId: string): Promise<void> {
  await getDb().delete(sessions).where(eq(sessions.userId, userId));
}

export const getActor = cache(async (): Promise<Actor | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const now = new Date();
  const [session] = await getDb()
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, now)));
  if (!session) return null;
  const [user] = await getDb().select().from(users).where(eq(users.id, session.userId));
  if (!user || user.status !== "active") return null;
  const assignments = await getDb()
    .select()
    .from(eventAssignments)
    .where(eq(eventAssignments.userId, user.id));
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    status: user.status,
    assignments: assignments.map((row) => ({
      eventId: row.eventId,
      canExport: row.canExport,
      canEdit: row.canEdit,
      canViewPrayer: row.canViewPrayer,
    })),
  };
});
