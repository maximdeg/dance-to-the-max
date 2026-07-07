import { Effect } from "effect";
import { Database } from "./Database";
import {
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

/**
 * Map an event onto a lifecycle patch, or null for a no-op. The access rule
 * lives in the resulting status (see the Entitlement check): `payment_failed`
 * moves to `past_due`, which *keeps* access through the dunning window;
 * `canceled` ends access. `trial_will_end` is informational only.
 */
const toPatch = (event: WebhookEvent): SubscriptionPatch | null => {
  switch (event.type) {
    case "updated":
      return { status: event.status, currentPeriodEnd: event.currentPeriodEnd };
    case "payment_failed":
      return { status: "past_due" };
    case "canceled":
      return { status: "canceled", currentPeriodEnd: event.currentPeriodEnd };
    case "trial_will_end":
      return null;
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
    const patch = toPatch(event);
    if (!patch) return { _tag: "ignored" as const };

    const updated = yield* updateSubscriptionByProviderId(
      event.providerSubscriptionId,
      patch,
    );
    return updated
      ? { _tag: "applied" as const, subscription: updated }
      : { _tag: "ignored" as const };
  });
