import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const rows = await getDb().execute<{ count: number }>(sql`
    insert into rate_limits (key, window_start, count)
    values (${key}, now(), 1)
    on conflict (key) do update set
      count = case
        when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then 1
        else rate_limits.count + 1
      end,
      window_start = case
        when rate_limits.window_start < now() - make_interval(secs => ${windowSeconds}) then now()
        else rate_limits.window_start
      end
    returning count
  `);
  const count = Number(rows[0]?.count ?? limit + 1);
  return count <= limit;
}
