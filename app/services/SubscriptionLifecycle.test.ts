import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { isEntitledTo } from "./Entitlement";
import { applyWebhookEvent } from "./SubscriptionLifecycle";
import {
  activateSubscription,
  getEntitlement,
  getSubscriptionForAccount,
  updateSubscriptionByProviderId,
} from "./Subscriptions";
import type { WebhookEvent } from "./StripeWebhooks";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const PROVIDER_ID = "sub_test_1";
const INITIAL_PERIOD_END = new Date("2026-08-01T00:00:00.000Z");

/** Seed Tiers + an Account with a trialing Subscription keyed on PROVIDER_ID. */
const setup = async (layer: TestLayer) => {
  await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
  const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
  const tier = tiers.find((t) => t.rank === 2)!;
  const account = await Effect.runPromise(
    signup("sub@example.com", "password123").pipe(Effect.provide(layer)),
  );
  await Effect.runPromise(
    activateSubscription({
      accountId: account.id,
      tierId: tier.id,
      status: "trialing",
      billingPeriod: "monthly",
      providerSubscriptionId: PROVIDER_ID,
      currentPeriodEnd: INITIAL_PERIOD_END,
    }).pipe(Effect.provide(layer)),
  );
  return { account };
};

const apply = (layer: TestLayer, event: WebhookEvent) =>
  Effect.runPromise(applyWebhookEvent(event).pipe(Effect.provide(layer)));

/** Whether the Account can currently watch a Tier-1 Dance (has access). */
const hasAccess = async (layer: TestLayer, accountId: string) => {
  const entitlement = await Effect.runPromise(
    getEntitlement(accountId).pipe(Effect.provide(layer)),
  );
  return isEntitledTo(entitlement, { minTierRank: 1 });
};

describe("applyWebhookEvent", () => {
  it("advances status and current-period end on an `updated` event", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);
    const newEnd = new Date("2026-09-01T00:00:00.000Z");

    const outcome = await apply(layer, {
      type: "updated",
      providerSubscriptionId: PROVIDER_ID,
      status: "active",
      currentPeriodEnd: newEnd,
    });

    expect(outcome._tag).toBe("applied");
    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(current?.subscription.status).toBe("active");
    expect(current?.subscription.currentPeriodEnd).toEqual(newEnd);
    expect(await hasAccess(layer, account.id)).toBe(true);
  });

  it("keeps access on `payment_failed` (moves to past_due)", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);

    const outcome = await apply(layer, {
      type: "payment_failed",
      providerSubscriptionId: PROVIDER_ID,
    });

    expect(outcome._tag).toBe("applied");
    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(current?.subscription.status).toBe("past_due");
    expect(await hasAccess(layer, account.id)).toBe(true);
  });

  it("removes access on `canceled`", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);

    const outcome = await apply(layer, {
      type: "canceled",
      providerSubscriptionId: PROVIDER_ID,
    });

    expect(outcome._tag).toBe("applied");
    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(current?.subscription.status).toBe("canceled");
    expect(await hasAccess(layer, account.id)).toBe(false);
  });

  it("ignores a `trial_will_end` heads-up, leaving status untouched", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);

    const outcome = await apply(layer, {
      type: "trial_will_end",
      providerSubscriptionId: PROVIDER_ID,
    });

    expect(outcome._tag).toBe("ignored");
    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(current?.subscription.status).toBe("trialing");
    expect(current?.subscription.currentPeriodEnd).toEqual(INITIAL_PERIOD_END);
    expect(await hasAccess(layer, account.id)).toBe(true);
  });

  it("applies a scheduled downgrade at the next renewal", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);
    const tiers = await Effect.runPromise(
      listTiers().pipe(Effect.provide(layer)),
    );
    const rank1 = tiers.find((t) => t.rank === 1)!;

    // Schedule a downgrade to Tier 1 (the setup subscription is on Tier 2).
    await Effect.runPromise(
      updateSubscriptionByProviderId(PROVIDER_ID, {
        pendingTierId: rank1.id,
      }).pipe(Effect.provide(layer)),
    );

    const newEnd = new Date("2026-09-01T00:00:00.000Z");
    const outcome = await apply(layer, {
      type: "updated",
      providerSubscriptionId: PROVIDER_ID,
      status: "active",
      currentPeriodEnd: newEnd,
    });

    expect(outcome._tag).toBe("applied");
    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    // The new period starts on Tier 1, schedule cleared.
    expect(current?.tier.rank).toBe(1);
    expect(current?.subscription.pendingTierId).toBeNull();
    expect(current?.subscription.currentPeriodEnd).toEqual(newEnd);
  });

  it("ignores an event for a subscription it doesn't track", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);

    const outcome = await apply(layer, {
      type: "canceled",
      providerSubscriptionId: "sub_unknown",
    });

    expect(outcome._tag).toBe("ignored");
    // The tracked Subscription is untouched.
    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(current?.subscription.status).toBe("trialing");
    expect(await hasAccess(layer, account.id)).toBe(true);
  });
});
