import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  signWebhookPayload,
  WebhookVerifier,
  WebhookVerifierLive,
} from "./StripeWebhooks";

const verify = (payload: string, signature: string | null) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const verifier = yield* WebhookVerifier;
      return yield* verifier.verify(payload, signature);
    }).pipe(Effect.either, Effect.provide(WebhookVerifierLive)),
  );

describe("WebhookVerifierLive", () => {
  it("parses an authentic, correctly-signed event", async () => {
    const periodEnd = 1_800_000_000; // epoch seconds
    const payload = JSON.stringify({
      type: "updated",
      providerSubscriptionId: "sub_1",
      status: "active",
      currentPeriodEnd: periodEnd,
    });
    const result = await verify(payload, signWebhookPayload(payload));

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right).toEqual({
        type: "updated",
        providerSubscriptionId: "sub_1",
        status: "active",
        currentPeriodEnd: new Date(periodEnd * 1000),
      });
    }
  });

  it("rejects a missing signature", async () => {
    const payload = JSON.stringify({ type: "canceled", providerSubscriptionId: "sub_1" });
    const result = await verify(payload, null);
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("InvalidWebhookSignature");
    }
  });

  it("rejects a tampered payload (signature no longer matches)", async () => {
    const signed = JSON.stringify({ type: "canceled", providerSubscriptionId: "sub_1" });
    const signature = signWebhookPayload(signed);
    const tampered = JSON.stringify({ type: "canceled", providerSubscriptionId: "sub_2" });

    const result = await verify(tampered, signature);
    expect(Either.isLeft(result)).toBe(true);
  });

  it("rejects a wrong signature outright", async () => {
    const payload = JSON.stringify({ type: "payment_failed", providerSubscriptionId: "sub_1" });
    const result = await verify(payload, "deadbeef");
    expect(Either.isLeft(result)).toBe(true);
  });

  it("acknowledges a signed but unhandled event type as null", async () => {
    const payload = JSON.stringify({
      type: "invoice.created",
      providerSubscriptionId: "sub_1",
    });
    const result = await verify(payload, signWebhookPayload(payload));
    expect(result).toStrictEqual(Either.right(null));
  });
});
