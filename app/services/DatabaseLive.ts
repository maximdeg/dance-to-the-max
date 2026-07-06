import { drizzle } from "drizzle-orm/postgres-js";
import { Effect, Layer } from "effect";
import postgres from "postgres";
import * as schema from "~/db/schema";
import { Database } from "./Database";

/**
 * Production `Database` layer: opens a pooled Postgres.js connection from
 * `DATABASE_URL` and closes it when the runtime is disposed. On Vercel this
 * should point at a pooled connection string (e.g. Neon's pooler).
 */
export const DatabaseLive = Layer.scoped(
  Database,
  Effect.gen(function* () {
    const url = process.env.DATABASE_URL;
    if (!url) {
      return yield* Effect.dieMessage(
        "DATABASE_URL environment variable is not set",
      );
    }

    const client = yield* Effect.acquireRelease(
      Effect.sync(() => postgres(url, { max: 10 })),
      (connection) => Effect.promise(() => connection.end()),
    );

    return drizzle(client, { schema });
  }),
);
