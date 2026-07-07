import { Effect, Either } from "effect";
import { runtime } from "~/runtime.server";
import { applyWebhookEvent } from "~/services/SubscriptionLifecycle";
import { WebhookVerifier } from "~/services/StripeWebhooks";
import type { Route } from "./+types/webhooks.stripe";

/**
 * Resource route (no UI): the payment provider's webhook endpoint. It verifies
 * the signature first — an unsigned or tampered payload is rejected with 400
 * before any Subscription is touched — then advances the Subscription
 * lifecycle. Authentic events (even ones we ignore) get a 200 so the provider
 * stops retrying.
 */
export async function action({ request }: Route.ActionArgs) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  const result = await runtime.runPromise(
    Effect.gen(function* () {
      const verifier = yield* WebhookVerifier;
      const event = yield* verifier.verify(payload, signature);
      if (event) yield* applyWebhookEvent(event);
    }).pipe(Effect.either),
  );

  return Either.isLeft(result)
    ? new Response("Invalid signature", { status: 400 })
    : new Response(null, { status: 200 });
}
