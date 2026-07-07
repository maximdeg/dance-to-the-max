import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { isEntitledTo } from "./Entitlement";
import {
  createSubscription,
  getEntitlement,
  getSubscriptionForAccount,
} from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

/** Seed Tiers + an Account, and subscribe the Account to the given rank. */
const setup = async (
  layer: TestLayer,
  opts: { rank: number; status: "trialing" | "active" | "past_due" | "canceled" },
) => {
  await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
  const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
  const tier = tiers.find((t) => t.rank === opts.rank)!;
  const account = await Effect.runPromise(
    signup(`r${opts.rank}@example.com`, "password123").pipe(
      Effect.provide(layer),
    ),
  );
  await Effect.runPromise(
    createSubscription({
      accountId: account.id,
      tierId: tier.id,
      status: opts.status,
      billingPeriod: "monthly",
    }).pipe(Effect.provide(layer)),
  );
  return { account, tier };
};

describe("subscriptions", () => {
  it("links an Account to a Tier and reads it back joined", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tier } = await setup(layer, { rank: 2, status: "active" });

    const found = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(found?.subscription.accountId).toBe(account.id);
    expect(found?.subscription.status).toBe("active");
    expect(found?.tier.id).toBe(tier.id);
    expect(found?.tier.rank).toBe(2);
  });

  it("returns null entitlement for an Account with no Subscription", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("none@example.com", "password123").pipe(Effect.provide(layer)),
    );
    const entitlement = await Effect.runPromise(
      getEntitlement(account.id).pipe(Effect.provide(layer)),
    );
    expect(entitlement).toBeNull();
  });

  it("loads entitlement inputs that drive the cumulative ladder", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer, { rank: 2, status: "active" });

    const entitlement = await Effect.runPromise(
      getEntitlement(account.id).pipe(Effect.provide(layer)),
    );
    expect(entitlement).toEqual({ status: "active", tierRank: 2 });

    // A rank-2 subscriber unlocks Dances gated at T1 and T2, not T3.
    expect(isEntitledTo(entitlement, { minTierRank: 1 })).toBe(true);
    expect(isEntitledTo(entitlement, { minTierRank: 2 })).toBe(true);
    expect(isEntitledTo(entitlement, { minTierRank: 3 })).toBe(false);
  });

  it("denies access once the Subscription is canceled", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer, { rank: 3, status: "canceled" });

    const entitlement = await Effect.runPromise(
      getEntitlement(account.id).pipe(Effect.provide(layer)),
    );
    // Top tier, but canceled → no Dance is entitled.
    expect(isEntitledTo(entitlement, { minTierRank: 1 })).toBe(false);
  });
});
