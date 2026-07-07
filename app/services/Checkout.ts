import { Data, Effect } from "effect";
import {
  Billing,
  type BillingInterval,
  type CheckoutSession,
} from "./Billing";
import { Database } from "./Database";
import { activateSubscription, type Subscription } from "./Subscriptions";
import { getTier } from "./Tiers";

export class TierNotFound extends Data.TaggedError("TierNotFound")<{
  readonly id: string;
}> {}

/** Why a returning checkout can't be turned into a Subscription. */
export type CheckoutDenial =
  | "unknown_session"
  | "incomplete"
  | "account_mismatch";

export class CheckoutNotFulfillable extends Data.TaggedError(
  "CheckoutNotFulfillable",
)<{
  readonly reason: CheckoutDenial;
}> {}

export interface StartCheckoutParams {
  readonly accountId: string;
  readonly tierId: string;
  readonly billingPeriod: BillingInterval;
  readonly trial: boolean;
  /** Absolute origin (e.g. `https://app.example`) for building return URLs. */
  readonly origin: string;
}

/**
 * Begin subscribing: validate the chosen Tier, then open a Checkout Session for
 * that Tier + Billing Period. The caller redirects the browser to the returned
 * `url`. No Subscription exists yet — it is created only once checkout
 * completes, in `fulfillCheckout`.
 */
export const startCheckout = (
  params: StartCheckoutParams,
): Effect.Effect<CheckoutSession, TierNotFound, Database | Billing> =>
  Effect.gen(function* () {
    const tier = yield* getTier(params.tierId);
    if (!tier) return yield* new TierNotFound({ id: params.tierId });

    const billing = yield* Billing;
    return yield* billing.createCheckoutSession({
      accountId: params.accountId,
      tierId: params.tierId,
      billingPeriod: params.billingPeriod,
      trial: params.trial,
      successUrl: `${params.origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${params.origin}/pricing`,
    });
  });

/**
 * Complete a checkout: read the Session back from the provider and, if it is
 * complete and belongs to this Account, create/activate the Subscription — a
 * trial starts `trialing`, otherwise `active`. Idempotent: re-running with the
 * same session just re-applies the same plan (one Subscription per Account).
 * Until Stripe webhooks (#11), this success-redirect fulfillment is what turns a
 * paid checkout into an entitling Subscription.
 */
export const fulfillCheckout = (
  accountId: string,
  sessionId: string,
): Effect.Effect<Subscription, CheckoutNotFulfillable, Database | Billing> =>
  Effect.gen(function* () {
    const billing = yield* Billing;
    const session = yield* billing.retrieveCheckoutSession(sessionId);
    if (!session) {
      return yield* new CheckoutNotFulfillable({ reason: "unknown_session" });
    }
    if (session.status !== "complete") {
      return yield* new CheckoutNotFulfillable({ reason: "incomplete" });
    }
    // The signed-in Account must own the session — guards against replaying
    // someone else's session id to grant yourself their plan.
    if (session.accountId !== accountId) {
      return yield* new CheckoutNotFulfillable({ reason: "account_mismatch" });
    }
    return yield* activateSubscription({
      accountId,
      tierId: session.tierId,
      status: session.trial ? "trialing" : "active",
      billingPeriod: session.billingPeriod,
    });
  });
