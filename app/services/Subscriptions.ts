import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { subscriptions, tiers } from "~/db/schema";
import { Database } from "./Database";
import type { Entitlement } from "./Entitlement";
import type { Tier } from "./Tiers";

export type Subscription = typeof subscriptions.$inferSelect;

export interface SubscriptionWithTier {
  readonly subscription: Subscription;
  readonly tier: Tier;
}

export interface SubscriptionInput {
  readonly accountId: string;
  readonly tierId: string;
  readonly status: Subscription["status"];
  readonly billingPeriod: Subscription["billingPeriod"];
}

/** Create a Subscription for an Account (manual/seeded until Stripe, #10). */
export const createSubscription = (
  input: SubscriptionInput,
): Effect.Effect<Subscription, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const inserted = yield* Effect.promise(() =>
      db.insert(subscriptions).values(input).returning(),
    );
    const subscription = inserted[0];
    if (!subscription) {
      return yield* Effect.dieMessage("subscription insert returned no row");
    }
    return subscription;
  });

export const getSubscriptionForAccount = (
  accountId: string,
): Effect.Effect<SubscriptionWithTier | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select({ subscription: subscriptions, tier: tiers })
        .from(subscriptions)
        .innerJoin(tiers, eq(subscriptions.tierId, tiers.id))
        .where(eq(subscriptions.accountId, accountId))
        .limit(1),
    );
    return rows[0] ?? null;
  });

/**
 * The Account's entitlement inputs (status + Tier rank) for the pure
 * `isEntitledTo` check, or null when they have no Subscription.
 */
export const getEntitlement = (
  accountId: string,
): Effect.Effect<Entitlement | null, never, Database> =>
  Effect.gen(function* () {
    const found = yield* getSubscriptionForAccount(accountId);
    if (!found) return null;
    return { status: found.subscription.status, tierRank: found.tier.rank };
  });
