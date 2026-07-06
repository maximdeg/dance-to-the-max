import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { Layer } from "effect";
import * as schema from "~/db/schema";
import { Database, type AppDatabase } from "~/services/Database";

/**
 * Builds a `Database` layer backed by an in-memory PGLite instance so tests run
 * with no external Postgres. By default the generated Drizzle migrations are
 * applied; pass `{ migrated: false }` to exercise the un-migrated failure path.
 *
 * The cast is the one place we bridge the PGLite and Postgres.js Drizzle types —
 * both speak the same query builder, so it is safe for the service under test.
 */
export async function makeTestDatabaseLayer(
  options: { migrated?: boolean } = {},
): Promise<Layer.Layer<Database>> {
  const { migrated = true } = options;
  const client = new PGlite();
  const db = drizzle(client, { schema });

  if (migrated) {
    await migrate(db, { migrationsFolder: "drizzle" });
  }

  return Layer.succeed(Database, db as unknown as AppDatabase);
}
