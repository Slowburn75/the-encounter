import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { schema } from "@/lib/db/schema";

type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  encounterSql?: ReturnType<typeof postgres>;
  encounterDb?: Database;
};

export function getDb(): Database {
  if (!globalForDb.encounterDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    const local = /localhost|127\.0\.0\.1/.test(url);
    globalForDb.encounterSql = postgres(url, {
      max: local ? 10 : 1,
      idle_timeout: 20,
      ssl: local ? false : "require",
    });
    globalForDb.encounterDb = drizzle(globalForDb.encounterSql, { schema });
  }
  return globalForDb.encounterDb;
}

export async function closeDb(): Promise<void> {
  await globalForDb.encounterSql?.end({ timeout: 5 });
  globalForDb.encounterSql = undefined;
  globalForDb.encounterDb = undefined;
}
