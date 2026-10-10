import { config } from "dotenv";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { closeDb, getDb } from "../lib/db";

config({ path: ".env.local" });
config({ path: ".env" });

async function main() {
  await migrate(getDb(), { migrationsFolder: "drizzle" });
  await closeDb();
  console.log("Migrations applied.");
}

main().catch(async (error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  await closeDb();
  process.exit(1);
});
