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
  readonly providerSubscriptionId?: string;
  readonly currentPeriodEnd?: Date;
}

/**
 * A partial update to a Subscription — applied by a webhook event (status,
 * period end) or a management action (tier switch, a scheduled downgrade in
 * `pendingTierId`, `cancelAtPeriodEnd`). A `null` clears the column.
 */
export interface SubscriptionPatch {
  readonly status?: Subscription["status"];
  readonly currentPeriodEnd?: Date;
  readonly tierId?: string;
  readonly pendingTierId?: string | null;
  readonly cancelAtPeriodEnd?: boolean;
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
            providerSubscriptionId: input.providerSubscriptionId,
            currentPeriodEnd: input.currentPeriodEnd,
            // A fresh checkout (incl. a lapsed Account re-subscribing) clears
            // any previously scheduled cancel/downgrade.
            cancelAtPeriodEnd: false,
            pendingTierId: null,
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

/**
 * Apply a lifecycle patch to the Subscription with this provider id, returning
 * the updated row — or null when no Subscription matches (an event for a
 * subscription we don't track, which the caller safely ignores).
 */
export const updateSubscriptionByProviderId = (
  providerSubscriptionId: string,
  patch: SubscriptionPatch,
): Effect.Effect<Subscription | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(subscriptions)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
        .returning(),
    );
    return updated[0] ?? null;
  });

/** The Subscription with this provider id, or null. Used by the webhook path. */
export const getSubscriptionByProviderId = (
  providerSubscriptionId: string,
): Effect.Effect<Subscription | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.providerSubscriptionId, providerSubscriptionId))
        .limit(1),
    );
    return rows[0] ?? null;
  });

/**
 * Apply a patch to an Account's Subscription (management actions act by the
 * signed-in Account, not a provider id). Returns the updated row, or null when
 * the Account has no Subscription.
 */
export const updateSubscriptionByAccount = (
  accountId: string,
  patch: SubscriptionPatch,
): Effect.Effect<Subscription | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(subscriptions)
        .set({ ...patch, updatedAt: new Date() })
        .where(eq(subscriptions.accountId, accountId))
        .returning(),
    );
    return updated[0] ?? null;
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
