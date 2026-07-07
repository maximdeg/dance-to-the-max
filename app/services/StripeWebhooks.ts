import { createHmac, timingSafeEqual } from "node:crypto";
import { Context, Data, Effect, Layer } from "effect";
import type { SubscriptionStatus } from "./Entitlement";

/**
 * The lifecycle-affecting webhook events we act on. Named for what they mean to
 * the Subscription (the real Stripe event types map onto these when the SDK is
 * wired in): a plan `updated`, a `payment_failed` (dunning), a `canceled`
 * subscription, and a `trial_will_end` heads-up.
 */
export type WebhookEventType =
  | "updated"
  | "payment_failed"
  | "canceled"
  | "trial_will_end";

export interface WebhookEvent {
  readonly type: WebhookEventType;
  readonly providerSubscriptionId: string;
  /** New status carried by an `updated` event. */
  readonly status?: SubscriptionStatus;
  readonly currentPeriodEnd?: Date;
}

export class InvalidWebhookSignature extends Data.TaggedError(
  "InvalidWebhookSignature",
)<{}> {}

/**
 * Verifies and parses inbound provider webhooks. This is the trust boundary:
 * `verify` fails closed on any payload whose signature doesn't check out, so a
 * caller can only ever act on an authentic event. A signature is required.
 */
export interface WebhookVerifierService {
  readonly verify: (
    payload: string,
    signature: string | null,
  ) => Effect.Effect<WebhookEvent | null, InvalidWebhookSignature>;
}

export class WebhookVerifier extends Context.Tag("app/WebhookVerifier")<
  WebhookVerifier,
  WebhookVerifierService
>() {}

const webhookSecret = (): string =>
  process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_dev_insecure_change_me";

/**
 * The HMAC-SHA256 signature for a raw payload under the shared secret — the same
 * scheme Stripe uses. Exposed so the app (dev) and tests can produce a valid
 * signature; the real sender is Stripe.
 */
export const signWebhookPayload = (
  payload: string,
  secret: string = webhookSecret(),
): string => createHmac("sha256", secret).update(payload).digest("hex");

const signatureMatches = (payload: string, signature: string): boolean => {
  const expected = Buffer.from(signWebhookPayload(payload), "hex");
  const provided = Buffer.from(signature, "hex");
  return (
    expected.length === provided.length &&
    expected.length > 0 &&
    timingSafeEqual(expected, provided)
  );
};

const STATUSES: ReadonlySet<string> = new Set([
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;

/**
 * Parse an authenticated payload into a handled event, or null when it's an
 * event type we don't act on (still authentic — the caller acknowledges it).
 */
const parseEvent = (payload: string): WebhookEvent | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(payload);
  } catch {
    return null;
  }
  const record = asRecord(raw);
  if (!record) return null;

  const providerSubscriptionId = record.providerSubscriptionId;
  if (typeof providerSubscriptionId !== "string") return null;

  const currentPeriodEnd =
    typeof record.currentPeriodEnd === "number"
      ? new Date(record.currentPeriodEnd * 1000)
      : undefined;
  const status =
    typeof record.status === "string" && STATUSES.has(record.status)
      ? (record.status as SubscriptionStatus)
      : undefined;

  switch (record.type) {
    case "updated":
      return { type: "updated", providerSubscriptionId, status, currentPeriodEnd };
    case "payment_failed":
      return { type: "payment_failed", providerSubscriptionId };
    case "canceled":
      return { type: "canceled", providerSubscriptionId, currentPeriodEnd };
    case "trial_will_end":
      return { type: "trial_will_end", providerSubscriptionId };
    default:
      return null;
  }
};

/**
 * Placeholder verifier until the Stripe SDK is wired in. It authenticates a
 * payload by recomputing the HMAC-SHA256 signature (constant-time compare) and
 * then parses our event vocabulary. Same trust boundary as
 * `stripe.webhooks.constructEvent`, no SDK.
 */
export const WebhookVerifierLive = Layer.succeed(WebhookVerifier, {
  verify: (payload, signature) =>
    Effect.suspend(() =>
      signature && signatureMatches(payload, signature)
        ? Effect.succeed(parseEvent(payload))
        : Effect.fail(new InvalidWebhookSignature()),
    ),
});
