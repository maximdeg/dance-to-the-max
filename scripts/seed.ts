import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
// Relative imports (not the `~` alias): this runs under tsx, which doesn't
// resolve tsconfig paths. schema.ts and tier-seed.ts have no aliased imports.
import * as schema from "../app/db/schema";
import { TIER_SEED } from "../app/services/tier-seed";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is required to seed");
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

// Idempotent: the canonical Tiers are keyed on unique `rank`.
await db
  .insert(schema.tiers)
  .values([...TIER_SEED])
  .onConflictDoNothing({ target: schema.tiers.rank });

await client.end();

console.log(`Seeded ${TIER_SEED.length} tiers.`);
