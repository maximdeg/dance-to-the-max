import { Context, Effect, Layer } from "effect";

/** How often a Subscription is billed. Mirrors the `billing_period` enum. */
export type BillingInterval = "monthly" | "annual";

export interface CheckoutRequest {
  readonly accountId: string;
  readonly tierId: string;
  readonly billingPeriod: BillingInterval;
  readonly trial: boolean;
  /**
   * Absolute URL the provider redirects to on success. May contain the literal
   * `{CHECKOUT_SESSION_ID}` placeholder, which the provider substitutes with the
   * created session id (this is Stripe's own convention).
   */
  readonly successUrl: string;
  readonly cancelUrl: string;
}

export interface CheckoutSession {
  readonly id: string;
  readonly url: string;
}

export type CheckoutStatus = "complete" | "open" | "expired";

/** What a Checkout Session resolved to, read back on the success redirect. */
export interface CheckoutResult {
  readonly status: CheckoutStatus;
  readonly accountId: string;
  readonly tierId: string;
  readonly billingPeriod: BillingInterval;
  readonly trial: boolean;
  /** The provider's id for the created subscription — the key later webhook
   * events correlate against (see #11). */
  readonly providerSubscriptionId: string;
}

/**
 * The payment provider, behind an interface so Stripe can be swapped in later
 * and tests can stub it. It opens a Checkout Session for a chosen plan and, on
 * return, reports what that session resolved to. It knows nothing about
 * Entitlement or the Subscription record — those live above it, in Checkout.
 */
export interface BillingService {
  readonly createCheckoutSession: (
    request: CheckoutRequest,
  ) => Effect.Effect<CheckoutSession>;
  readonly retrieveCheckoutSession: (
    sessionId: string,
  ) => Effect.Effect<CheckoutResult | null>;
}

export class Billing extends Context.Tag("app/Billing")<
  Billing,
  BillingService
>() {}

interface SessionPayload {
  readonly accountId: string;
  readonly tierId: string;
  readonly billingPeriod: BillingInterval;
  readonly trial: boolean;
}

const SESSION_PREFIX = "cs_stub_";

// The placeholder's session id opaquely carries the checkout params, so the
// success redirect can be fulfilled with no server-side store — which matters
// on serverless, where create and fulfill run in different invocations. Real
// Stripe (#11) replaces this with a Stripe session id backed by webhooks.
const encodeSession = (payload: SessionPayload): string =>
  SESSION_PREFIX +
  Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");

const decodeSession = (sessionId: string): SessionPayload | null => {
  if (!sessionId.startsWith(SESSION_PREFIX)) return null;
  try {
    const json = Buffer.from(
      sessionId.slice(SESSION_PREFIX.length),
      "base64url",
    ).toString("utf8");
    const parsed = JSON.parse(json) as SessionPayload;
    const ok =
      typeof parsed.accountId === "string" &&
      typeof parsed.tierId === "string" &&
      (parsed.billingPeriod === "monthly" ||
        parsed.billingPeriod === "annual") &&
      typeof parsed.trial === "boolean";
    return ok ? parsed : null;
  } catch {
    return null;
  }
};

/**
 * Placeholder billing provider until Stripe is wired in (#11). It fakes Stripe
 * Checkout with no network and no keys: `createCheckoutSession` returns a
 * session id that encodes the chosen plan and a `url` pointing straight at the
 * caller's success URL (as if payment already succeeded), and
 * `retrieveCheckoutSession` decodes that id back as a completed session. Same
 * shape as real Stripe, so the routes don't change when the SDK lands.
 */
export const BillingLive = Layer.succeed(Billing, {
  createCheckoutSession: (request) =>
    Effect.sync(() => {
      const id = encodeSession({
        accountId: request.accountId,
        tierId: request.tierId,
        billingPeriod: request.billingPeriod,
        trial: request.trial,
      });
      const url = request.successUrl.replace("{CHECKOUT_SESSION_ID}", id);
      return { id, url };
    }),
  retrieveCheckoutSession: (sessionId) =>
    Effect.sync(() => {
      const payload = decodeSession(sessionId);
      if (!payload) return null;
      // One subscription per Account, so a deterministic per-account id is a
      // stable correlation key that survives re-fulfilling the same session.
      return {
        status: "complete" as const,
        ...payload,
        providerSubscriptionId: `sub_stub_${payload.accountId}`,
      };
    }),
});
