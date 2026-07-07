import { asc, eq } from "drizzle-orm";
import { Effect } from "effect";
import { tiers } from "~/db/schema";
import { Database } from "./Database";
import { TIER_SEED } from "./tier-seed";

export type Tier = typeof tiers.$inferSelect;

export { TIER_SEED };

/** Insert the canonical Tiers if absent. Idempotent (keyed on unique `rank`). */
export const seedTiers = (): Effect.Effect<void, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    yield* Effect.promise(() =>
      db
        .insert(tiers)
        .values([...TIER_SEED])
        .onConflictDoNothing({ target: tiers.rank }),
    );
  });

export const listTiers = (): Effect.Effect<Tier[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db.select().from(tiers).orderBy(asc(tiers.rank)),
    );
  });

export const getTier = (
  id: string,
): Effect.Effect<Tier | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(tiers).where(eq(tiers.id, id)).limit(1),
    );
    return rows[0] ?? null;
  });
