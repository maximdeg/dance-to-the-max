import { Data, Effect } from "effect";
import { healthChecks } from "~/db/schema";
import { Database } from "./Database";

export class HealthCheckError extends Data.TaggedError("HealthCheckError")<{
  readonly cause: unknown;
}> {}

export type HealthReport = {
  readonly status: "healthy" | "unhealthy";
  readonly database: "up" | "down";
  readonly timestamp: string;
};

/**
 * Proves the whole wiring end to end: resolve the `Database` service and run a
 * schema-backed query. It fails if the DB is unreachable or the migrations have
 * not been applied — exactly the states a health probe should surface.
 */
export const checkHealth: Effect.Effect<HealthReport, HealthCheckError, Database> =
  Effect.gen(function* () {
    const db = yield* Database;

    yield* Effect.tryPromise({
      try: () => db.select().from(healthChecks).limit(1),
      catch: (cause) => new HealthCheckError({ cause }),
    });

    return {
      status: "healthy",
      database: "up",
      timestamp: new Date().toISOString(),
    } satisfies HealthReport;
  });
