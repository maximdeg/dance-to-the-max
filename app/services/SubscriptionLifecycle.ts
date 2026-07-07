import { Effect } from "effect";
import { Database } from "./Database";
import {
  getSubscriptionByProviderId,
  updateSubscriptionByProviderId,
  type Subscription,
  type SubscriptionPatch,
} from "./Subscriptions";
import type { WebhookEvent } from "./StripeWebhooks";

/**
 * The result of applying a webhook event: either the updated Subscription, or
 * `ignored` when the event carried no state change (a `trial_will_end` heads-up)
 * or referenced a subscription we don't track. Both are success — an inbound
 * webhook should be acknowledged (2xx) so the provider stops retrying.
 */
export type WebhookOutcome =
  | { readonly _tag: "applied"; readonly subscription: Subscription }
  | { readonly _tag: "ignored" };

const IGNORED: WebhookOutcome = { _tag: "ignored" };

const outcome = (subscription: Subscription | null): WebhookOutcome =>
  subscription ? { _tag: "applied", subscription } : IGNORED;

/**
 * A renewal (`updated`) advances status + period end and is also where a
 * scheduled downgrade lands: if a `pendingTierId` was set, the new period
 * starts on that lower Tier and the schedule is cleared.
 */
const applyRenewal = (
  event: WebhookEvent,
): Effect.Effect<WebhookOutcome, never, Database> =>
  Effect.gen(function* () {
    const current = yield* getSubscriptionByProviderId(
      event.providerSubscriptionId,
    );
    if (!current) return IGNORED;

    const patch: SubscriptionPatch = {
      status: event.status,
      currentPeriodEnd: event.currentPeriodEnd,
      ...(current.pendingTierId !== null
        ? { tierId: current.pendingTierId, pendingTierId: null }
        : {}),
    };
    return outcome(
      yield* updateSubscriptionByProviderId(event.providerSubscriptionId, patch),
    );
  });

/**
 * Map a non-renewal event onto a lifecycle patch, or null for a no-op. The
 * access rule lives in the resulting status (see the Entitlement check):
 * `payment_failed` moves to `past_due`, which *keeps* access through the dunning
 * window; `canceled` ends access. `trial_will_end` is informational only.
 */
const toPatch = (event: WebhookEvent): SubscriptionPatch | null => {
  switch (event.type) {
    case "payment_failed":
      return { status: "past_due" };
    case "canceled":
      return { status: "canceled", currentPeriodEnd: event.currentPeriodEnd };
    case "trial_will_end":
      return null;
    case "updated":
      return null; // handled by applyRenewal
  }
};

/**
 * Advance a Subscription's lifecycle from an authenticated webhook event. Idle
 * events (no-op type, or an untracked subscription) are ignored rather than
 * failed, so the endpoint can still acknowledge them.
 */
export const applyWebhookEvent = (
  event: WebhookEvent,
): Effect.Effect<WebhookOutcome, never, Database> =>
  Effect.gen(function* () {
    if (event.type === "updated") return yield* applyRenewal(event);

    const patch = toPatch(event);
    if (!patch) return IGNORED;
    return outcome(
      yield* updateSubscriptionByProviderId(event.providerSubscriptionId, patch),
    );
  });
