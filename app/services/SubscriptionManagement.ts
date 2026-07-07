import { Data, Effect } from "effect";
import { grantsAccess } from "./Entitlement";
import { Database } from "./Database";
import {
  getSubscriptionForAccount,
  updateSubscriptionByAccount,
  type Subscription,
  type SubscriptionPatch,
} from "./Subscriptions";
import { getTier } from "./Tiers";

export class NoActiveSubscription extends Data.TaggedError(
  "NoActiveSubscription",
)<{}> {}

export class UnknownTier extends Data.TaggedError("UnknownTier")<{
  readonly id: string;
}> {}

/**
 * A plan change relative to the current Tier: an `upgrade` takes effect now, a
 * `downgrade` is scheduled for the next renewal, and `unchanged` is choosing the
 * current Tier (which also clears any pending downgrade).
 */
export type PlanChangeKind = "upgrade" | "downgrade" | "unchanged";

export interface PlanChange {
  readonly kind: PlanChangeKind;
  readonly subscription: Subscription;
}

/**
 * Switch the Account's plan. Upgrades (a higher Tier rank) apply immediately, so
 * newly included Dances unlock right away via the Entitlement check; downgrades
 * (a lower rank) are scheduled in `pendingTierId` and only take effect at the
 * next renewal, so the Subscriber keeps what they paid for until then. Requires
 * an access-granting Subscription — a lapsed Account re-subscribes via checkout.
 */
export const changePlan = (
  accountId: string,
  targetTierId: string,
): Effect.Effect<
  PlanChange,
  NoActiveSubscription | UnknownTier,
  Database
> =>
  Effect.gen(function* () {
    const current = yield* getSubscriptionForAccount(accountId);
    if (!current || !grantsAccess(current.subscription.status)) {
      return yield* new NoActiveSubscription();
    }

    const target = yield* getTier(targetTierId);
    if (!target) return yield* new UnknownTier({ id: targetTierId });

    const change: { kind: PlanChangeKind; patch: SubscriptionPatch } =
      target.rank > current.tier.rank
        ? // Upgrade: switch now and drop any scheduled downgrade.
          { kind: "upgrade", patch: { tierId: target.id, pendingTierId: null } }
        : target.rank < current.tier.rank
          ? // Downgrade: schedule for the next renewal; nothing changes now.
            { kind: "downgrade", patch: { pendingTierId: target.id } }
          : // Same Tier: cancel a pending downgrade back to today's plan.
            { kind: "unchanged", patch: { pendingTierId: null } };

    const updated = yield* updateSubscriptionByAccount(accountId, change.patch);
    if (!updated) {
      return yield* Effect.dieMessage("subscription vanished during plan change");
    }
    return { kind: change.kind, subscription: updated };
  });

/**
 * Cancel at period end: access continues (status is untouched) until
 * `currentPeriodEnd`, when a provider event flips the status to `canceled`.
 */
export const cancelSubscription = (
  accountId: string,
): Effect.Effect<Subscription, NoActiveSubscription, Database> =>
  Effect.gen(function* () {
    const current = yield* getSubscriptionForAccount(accountId);
    if (!current || !grantsAccess(current.subscription.status)) {
      return yield* new NoActiveSubscription();
    }
    const updated = yield* updateSubscriptionByAccount(accountId, {
      cancelAtPeriodEnd: true,
    });
    if (!updated) {
      return yield* Effect.dieMessage("subscription vanished during cancel");
    }
    return updated;
  });
