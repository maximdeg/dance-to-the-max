/**
 * The paywall logic, kept pure and free of the database so it can be unit-tested
 * as a table and reused anywhere. Whether a Subscriber may watch a Dance is a
 * function of two things only: their Subscription status and their Tier rank vs
 * the Dance's `minTierRank` (a cumulative ladder — a higher Tier unlocks every
 * Dance a lower one does).
 */

export type SubscriptionStatus = "trialing" | "active" | "past_due" | "canceled";

/** Statuses under which a Subscription still grants access. */
const ACCESS_GRANTING: ReadonlySet<SubscriptionStatus> = new Set([
  "trialing",
  "active",
  "past_due",
]);

export const grantsAccess = (status: SubscriptionStatus): boolean =>
  ACCESS_GRANTING.has(status);

/** A Subscriber's current entitlement inputs: their status and Tier rank. */
export interface Entitlement {
  readonly status: SubscriptionStatus;
  readonly tierRank: number;
}

/**
 * True iff the Subscriber may watch this Dance: they hold an access-granting
 * Subscription AND their Tier rank meets the Dance's minimum. A Visitor or a
 * Subscriber without a Subscription (`null`) is never entitled.
 */
export const isEntitledTo = (
  entitlement: Entitlement | null,
  dance: { readonly minTierRank: number },
): boolean =>
  entitlement !== null &&
  grantsAccess(entitlement.status) &&
  dance.minTierRank <= entitlement.tierRank;
