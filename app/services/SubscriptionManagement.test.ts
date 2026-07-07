import { randomUUID } from "node:crypto";
import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { isEntitledTo } from "./Entitlement";
import { applyWebhookEvent } from "./SubscriptionLifecycle";
import {
  cancelSubscription,
  changePlan,
} from "./SubscriptionManagement";
import {
  activateSubscription,
  getEntitlement,
  getSubscriptionForAccount,
} from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const PROVIDER_ID = "sub_mgmt_1";

/** Seed Tiers + an Account subscribed (active) at `rank`. Returns helpers. */
const setup = async (layer: TestLayer, rank: number) => {
  await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
  const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
  const tierByRank = (r: number) => tiers.find((t) => t.rank === r)!;
  const account = await Effect.runPromise(
    signup("member@example.com", "password123").pipe(Effect.provide(layer)),
  );
  await Effect.runPromise(
    activateSubscription({
      accountId: account.id,
      tierId: tierByRank(rank).id,
      status: "active",
      billingPeriod: "monthly",
      providerSubscriptionId: PROVIDER_ID,
      currentPeriodEnd: new Date("2026-08-01T00:00:00.000Z"),
    }).pipe(Effect.provide(layer)),
  );
  return { account, tierByRank };
};

const reach = (layer: TestLayer, accountId: string, minTierRank: number) =>
  Effect.runPromise(
    getEntitlement(accountId).pipe(Effect.provide(layer)),
  ).then((e) => isEntitledTo(e, { minTierRank }));

const load = (layer: TestLayer, accountId: string) =>
  Effect.runPromise(
    getSubscriptionForAccount(accountId).pipe(Effect.provide(layer)),
  );

describe("changePlan", () => {
  it("upgrades immediately and unlocks newly included Dances now", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer, 1);

    // Before: a rank-1 subscriber can't reach a Tier-2 Dance.
    expect(await reach(layer, account.id, 2)).toBe(false);

    const result = await Effect.runPromise(
      changePlan(account.id, tierByRank(2).id).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) expect(result.right.kind).toBe("upgrade");
    // After: the Tier-2 Dance is unlocked immediately.
    expect(await reach(layer, account.id, 2)).toBe(true);
    const current = await load(layer, account.id);
    expect(current?.tier.rank).toBe(2);
    expect(current?.subscription.pendingTierId).toBeNull();
  });

  it("schedules a downgrade for renewal without changing access now", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer, 3);

    const result = await Effect.runPromise(
      changePlan(account.id, tierByRank(1).id).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) expect(result.right.kind).toBe("downgrade");
    const current = await load(layer, account.id);
    // Still on T3 today, with the downgrade pending.
    expect(current?.tier.rank).toBe(3);
    expect(current?.subscription.pendingTierId).toBe(tierByRank(1).id);
    expect(await reach(layer, account.id, 3)).toBe(true);
  });

  it("clears a pending downgrade when re-selecting the current Tier", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer, 3);
    await Effect.runPromise(
      changePlan(account.id, tierByRank(1).id).pipe(Effect.provide(layer)),
    );

    const result = await Effect.runPromise(
      changePlan(account.id, tierByRank(3).id).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) expect(result.right.kind).toBe("unchanged");
    const current = await load(layer, account.id);
    expect(current?.subscription.pendingTierId).toBeNull();
  });

  it("rejects a change for a lapsed (canceled) Account", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer, 2);
    await Effect.runPromise(
      applyWebhookEvent({ type: "canceled", providerSubscriptionId: PROVIDER_ID }).pipe(
        Effect.provide(layer),
      ),
    );

    const result = await Effect.runPromise(
      changePlan(account.id, tierByRank(3).id).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("NoActiveSubscription");
    }
  });

  it("rejects an unknown target Tier", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer, 1);

    const result = await Effect.runPromise(
      changePlan(account.id, randomUUID()).pipe(
        Effect.either,
        Effect.provide(layer),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left._tag).toBe("UnknownTier");
  });
});

describe("cancelSubscription", () => {
  it("keeps access until the period end, losing it only when canceled lands", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer, 2);

    const result = await Effect.runPromise(
      cancelSubscription(account.id).pipe(Effect.either, Effect.provide(layer)),
    );

    expect(Either.isRight(result)).toBe(true);
    const afterCancel = await load(layer, account.id);
    expect(afterCancel?.subscription.cancelAtPeriodEnd).toBe(true);
    // Status is untouched, so access continues to the period end.
    expect(afterCancel?.subscription.status).toBe("active");
    expect(await reach(layer, account.id, 1)).toBe(true);

    // At period end the provider fires `canceled` and access ends.
    await Effect.runPromise(
      applyWebhookEvent({ type: "canceled", providerSubscriptionId: PROVIDER_ID }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(await reach(layer, account.id, 1)).toBe(false);
  });
});

describe("re-subscribe", () => {
  it("lets a lapsed Account re-subscribe on the same record, keeping history", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer, 2);
    const before = await load(layer, account.id);
    const subscriptionId = before!.subscription.id;

    // Lapse: cancel fires and access ends.
    await Effect.runPromise(
      applyWebhookEvent({ type: "canceled", providerSubscriptionId: PROVIDER_ID }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(await reach(layer, account.id, 1)).toBe(false);

    // Re-subscribe (as checkout fulfillment does): same Account, same row.
    await Effect.runPromise(
      activateSubscription({
        accountId: account.id,
        tierId: tierByRank(1).id,
        status: "active",
        billingPeriod: "monthly",
        providerSubscriptionId: PROVIDER_ID,
        currentPeriodEnd: new Date("2026-10-01T00:00:00.000Z"),
      }).pipe(Effect.provide(layer)),
    );

    const after = await load(layer, account.id);
    expect(after?.subscription.id).toBe(subscriptionId);
    expect(after?.subscription.status).toBe("active");
    expect(after?.subscription.cancelAtPeriodEnd).toBe(false);
    expect(await reach(layer, account.id, 1)).toBe(true);
  });
});
