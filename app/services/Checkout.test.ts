import { randomUUID } from "node:crypto";
import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { Billing, BillingLive } from "./Billing";
import { fulfillCheckout, startCheckout } from "./Checkout";
import { isEntitledTo } from "./Entitlement";
import { getEntitlement, getSubscriptionForAccount } from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const ORIGIN = "https://app.example";

/** Seed the Tiers and one Account; return the Account and Tiers by rank. */
const setup = async (layer: TestLayer) => {
  await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
  const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
  const account = await Effect.runPromise(
    signup("buyer@example.com", "password123").pipe(Effect.provide(layer)),
  );
  const tierByRank = (rank: number) => tiers.find((t) => t.rank === rank)!;
  return { account, tierByRank };
};

/** Run `startCheckout` against the real placeholder Billing + the test DB. */
const runStart = (
  layer: TestLayer,
  params: Parameters<typeof startCheckout>[0],
) =>
  Effect.runPromise(
    startCheckout(params).pipe(
      Effect.either,
      Effect.provide(Layer.merge(layer, BillingLive)),
    ),
  );

/** Run `fulfillCheckout` against the real placeholder Billing + the test DB. */
const runFulfill = (layer: TestLayer, accountId: string, sessionId: string) =>
  Effect.runPromise(
    fulfillCheckout(accountId, sessionId).pipe(
      Effect.either,
      Effect.provide(Layer.merge(layer, BillingLive)),
    ),
  );

describe("startCheckout", () => {
  it("opens a session that carries the chosen Tier and Billing Period", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer);
    const tier = tierByRank(2);

    const started = await runStart(layer, {
      accountId: account.id,
      tierId: tier.id,
      billingPeriod: "annual",
      trial: true,
      origin: ORIGIN,
    });

    expect(Either.isRight(started)).toBe(true);
    if (Either.isRight(started)) {
      expect(started.right.url).toBe(
        `${ORIGIN}/checkout/success?session_id=${started.right.id}`,
      );
      // The session decodes back to exactly the plan that was chosen.
      const decoded = await Effect.runPromise(
        Effect.gen(function* () {
          const billing = yield* Billing;
          return yield* billing.retrieveCheckoutSession(started.right.id);
        }).pipe(Effect.provide(BillingLive)),
      );
      expect(decoded).toMatchObject({
        accountId: account.id,
        tierId: tier.id,
        billingPeriod: "annual",
        trial: true,
        status: "complete",
      });
    }
  });

  it("rejects an unknown Tier", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);

    const started = await runStart(layer, {
      accountId: account.id,
      tierId: randomUUID(),
      billingPeriod: "monthly",
      trial: true,
      origin: ORIGIN,
    });

    expect(Either.isLeft(started)).toBe(true);
    if (Either.isLeft(started)) expect(started.left._tag).toBe("TierNotFound");
  });
});

describe("fulfillCheckout", () => {
  it("creates a trialing Subscription on success, driving Entitlement", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer);
    const tier = tierByRank(2);

    const started = await runStart(layer, {
      accountId: account.id,
      tierId: tier.id,
      billingPeriod: "monthly",
      trial: true,
      origin: ORIGIN,
    });
    const sessionId = Either.isRight(started) ? started.right.id : "";
    const fulfilled = await runFulfill(layer, account.id, sessionId);

    expect(Either.isRight(fulfilled)).toBe(true);
    if (Either.isRight(fulfilled)) {
      expect(fulfilled.right.tierId).toBe(tier.id);
      expect(fulfilled.right.status).toBe("trialing");
      expect(fulfilled.right.billingPeriod).toBe("monthly");
    }

    const entitlement = await Effect.runPromise(
      getEntitlement(account.id).pipe(Effect.provide(layer)),
    );
    expect(entitlement).toEqual({ status: "trialing", tierRank: 2 });
    expect(isEntitledTo(entitlement, { minTierRank: 2 })).toBe(true);
    expect(isEntitledTo(entitlement, { minTierRank: 3 })).toBe(false);
  });

  it("activates immediately (no trial) when trial is false", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer);
    const tier = tierByRank(1);

    const started = await runStart(layer, {
      accountId: account.id,
      tierId: tier.id,
      billingPeriod: "annual",
      trial: false,
      origin: ORIGIN,
    });
    const sessionId = Either.isRight(started) ? started.right.id : "";
    const fulfilled = await runFulfill(layer, account.id, sessionId);

    expect(Either.isRight(fulfilled)).toBe(true);
    if (Either.isRight(fulfilled)) expect(fulfilled.right.status).toBe("active");
  });

  it("is idempotent and switches plan in place (one Subscription per Account)", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer);
    const t2 = tierByRank(2);
    const t3 = tierByRank(3);

    // First checkout: trial on T2.
    const first = await runStart(layer, {
      accountId: account.id,
      tierId: t2.id,
      billingPeriod: "monthly",
      trial: true,
      origin: ORIGIN,
    });
    const firstId = Either.isRight(first) ? first.right.id : "";
    // Fulfilling the same session twice must not create a second row.
    await runFulfill(layer, account.id, firstId);
    const again = await runFulfill(layer, account.id, firstId);
    expect(Either.isRight(again)).toBe(true);

    // Switch up to T3, active.
    const switched = await runStart(layer, {
      accountId: account.id,
      tierId: t3.id,
      billingPeriod: "annual",
      trial: false,
      origin: ORIGIN,
    });
    const switchedId = Either.isRight(switched) ? switched.right.id : "";
    await runFulfill(layer, account.id, switchedId);

    const current = await Effect.runPromise(
      getSubscriptionForAccount(account.id).pipe(Effect.provide(layer)),
    );
    expect(current?.tier.id).toBe(t3.id);
    expect(current?.subscription.status).toBe("active");
    expect(current?.subscription.billingPeriod).toBe("annual");
  });

  it("refuses a session that belongs to another Account", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer);
    const tier = tierByRank(1);
    const intruder = await Effect.runPromise(
      signup("intruder@example.com", "password123").pipe(Effect.provide(layer)),
    );

    const started = await runStart(layer, {
      accountId: account.id,
      tierId: tier.id,
      billingPeriod: "monthly",
      trial: true,
      origin: ORIGIN,
    });
    const sessionId = Either.isRight(started) ? started.right.id : "";
    const stolen = await runFulfill(layer, intruder.id, sessionId);

    expect(Either.isLeft(stolen)).toBe(true);
    if (Either.isLeft(stolen)) expect(stolen.left.reason).toBe("account_mismatch");
    const intruderSub = await Effect.runPromise(
      getSubscriptionForAccount(intruder.id).pipe(Effect.provide(layer)),
    );
    expect(intruderSub).toBeNull();
  });

  it("refuses an unknown session id", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account } = await setup(layer);

    const result = await runFulfill(layer, account.id, "cs_stub_bogus");
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.reason).toBe("unknown_session");
  });

  it("refuses an incomplete (unpaid) session", async () => {
    const layer = await makeTestDatabaseLayer();
    const { account, tierByRank } = await setup(layer);
    const tier = tierByRank(1);

    // A provider stub that reports the session as still open (not paid).
    const openBilling = Layer.succeed(Billing, {
      createCheckoutSession: () => Effect.die("unused"),
      retrieveCheckoutSession: () =>
        Effect.succeed({
          status: "open" as const,
          accountId: account.id,
          tierId: tier.id,
          billingPeriod: "monthly" as const,
          trial: true,
        }),
    });

    const result = await Effect.runPromise(
      fulfillCheckout(account.id, "cs_stub_open").pipe(
        Effect.either,
        Effect.provide(Layer.merge(layer, openBilling)),
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.reason).toBe("incomplete");
  });
});
