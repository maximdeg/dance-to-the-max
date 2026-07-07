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

/**
 * Create the Account's Subscription, or update it in place if one already
 * exists (one per Account — the unique index). This is how a completed checkout
 * takes effect and how a plan switch is applied, without a duplicate row.
 */
export const activateSubscription = (
  input: SubscriptionInput,
): Effect.Effect<Subscription, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const upserted = yield* Effect.promise(() =>
      db
        .insert(subscriptions)
        .values(input)
        .onConflictDoUpdate({
          target: subscriptions.accountId,
          set: {
            tierId: input.tierId,
            status: input.status,
            billingPeriod: input.billingPeriod,
            updatedAt: new Date(),
          },
        })
        .returning(),
    );
    const subscription = upserted[0];
    if (!subscription) {
      return yield* Effect.dieMessage("subscription upsert returned no row");
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
