import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { listTiers, seedTiers } from "./Tiers";

describe("seedTiers", () => {
  it("seeds three Tiers with ascending ranks and monthly/annual prices", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));

    const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
    expect(tiers.map((t) => t.rank)).toEqual([1, 2, 3]);
    for (const tier of tiers) {
      expect(tier.monthlyPriceCents).toBeGreaterThan(0);
      expect(tier.annualPriceCents).toBeGreaterThan(0);
      // Annual is a discount on twelve monthly payments.
      expect(tier.annualPriceCents).toBeLessThan(tier.monthlyPriceCents * 12);
    }
  });

  it("is idempotent — seeding twice still leaves exactly three Tiers", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
    await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));

    const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
    expect(tiers).toHaveLength(3);
  });
});
