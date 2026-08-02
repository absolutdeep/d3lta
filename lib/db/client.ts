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
  dbMigrating?: boolean;
};

function createDb() {
  const client = createClient({ url: getDbUrl() });
  const db = drizzle(client, { schema });
  logger.info(SOURCE, "Database client created", { url: getDbUrl() });
  // Fire-and-forget migration: applies the schema from lib/db/migrations on
  // first run so a fresh checkout has deterministic tables. getDb() is now
  // async and callers await it, so the migration has completed (or failed
  // safely) before the first query runs. On a DB that already has the tables
  // (auto-created by the app on first insert), the CREATE TABLE statements
  // fail safely and are ignored.
  if (!globalForDb.dbMigrating) {
    globalForDb.dbMigrating = true;
    void migrate(db, {
      migrationsFolder: path.join(process.cwd(), "lib/db/migrations"),
    }).catch((err) => {
      logger.warn(SOURCE, "Migration skipped or already applied", {
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }
  return { client, db };
}

export async function getDb() {
  if (!globalForDb.db) {
    const { client, db } = createDb();
    globalForDb.dbClient = client;
    globalForDb.db = db;
  }
  return globalForDb.db;
}

export { schema };
