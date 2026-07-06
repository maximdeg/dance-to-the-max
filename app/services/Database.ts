import { Context } from "effect";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type * as schema from "~/db/schema";

/**
 * The Drizzle client, typed against our schema. Postgres.js drives production
 * (via `DATABASE_URL`); tests provide a PGLite-backed instance under the same
 * tag, so service code never knows which driver it runs on.
 */
export type AppDatabase = PostgresJsDatabase<typeof schema>;

export class Database extends Context.Tag("app/Database")<Database, AppDatabase>() {}
