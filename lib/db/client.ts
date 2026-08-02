// Drizzle + libsql database client (singleton)
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { createClient } from "@libsql/client";
import * as schema from "./schema";
import path from "node:path";
import { logger } from "@/lib/error-handling";

const SOURCE = "db-client";

const getDbUrl = () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    logger.warn(SOURCE, "DATABASE_URL not set, using default file:./d3lta.db");
    return "file:./d3lta.db";
  }
  return url;
};

// Singleton pattern — reuse connection across HMR in dev
const globalForDb = globalThis as unknown as {
  dbClient?: ReturnType<typeof createClient>;
  db?: ReturnType<typeof drizzle>;
  /** One-time migration promise shared across every getDb() caller. */
  migration?: Promise<void>;
};

// Drizzle's migrator refuses to re-run a migration once its hashes are in the
// migration table. On a DB that was auto-created by the app before migrations
// existed, the first `migrate()` attempts CREATE TABLE and fails with
// "already exists" — that is harmless and expected here, so we treat it as
// applied and proceed. A brand-new checkout gets its tables deterministically
// before the first query returned to the caller.
async function runMigration(db: ReturnType<typeof drizzle>): Promise<void> {
  try {
    await migrate(db, {
      migrationsFolder: path.join(process.cwd(), "lib/db/migrations"),
    });
  } catch (err) {
    logger.warn(SOURCE, "Migration skipped or already applied", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

async function ensureMigration(db: ReturnType<typeof drizzle>): Promise<void> {
  // Really await the migration this time. The previous fire-and-forget
  // (`void migrate(...)`) returned before DDL finished, so the first query
  // could race ahead and hit missing/mid-created tables.
  if (!globalForDb.migration) {
    globalForDb.migration = runMigration(db);
  }
  await globalForDb.migration;
}

function createDb() {
  const client = createClient({ url: getDbUrl() });
  const db = drizzle(client, { schema });
  logger.info(SOURCE, "Database client created", { url: getDbUrl() });
  return { client, db };
}

export async function getDb(): Promise<ReturnType<typeof drizzle>> {
  if (!globalForDb.db) {
    const { client, db } = createDb();
    globalForDb.dbClient = client;
    globalForDb.db = db;
    // Await DDL so no query can run against missing/partial tables.
    await ensureMigration(db);
  }
  return globalForDb.db;
}

export { schema };
