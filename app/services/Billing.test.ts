import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  Billing,
  BillingLive,
  type CheckoutRequest,
} from "./Billing";

const create = (request: CheckoutRequest) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const billing = yield* Billing;
      return yield* billing.createCheckoutSession(request);
    }).pipe(Effect.provide(BillingLive)),
  );

const retrieve = (sessionId: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const billing = yield* Billing;
      return yield* billing.retrieveCheckoutSession(sessionId);
    }).pipe(Effect.provide(BillingLive)),
  );

const request: CheckoutRequest = {
  accountId: "acc-1",
  tierId: "tier-2",
  billingPeriod: "annual",
  trial: true,
  successUrl: "https://app.example/checkout/success?session_id={CHECKOUT_SESSION_ID}",
  cancelUrl: "https://app.example/pricing",
};

describe("BillingLive", () => {
  it("returns a success URL with the session id substituted in", async () => {
    const session = await create(request);
    expect(session.url).toBe(
      `https://app.example/checkout/success?session_id=${session.id}`,
    );
  });

  it("round-trips the chosen plan as a completed session", async () => {
    const session = await create(request);
    const result = await retrieve(session.id);
    expect(result).toEqual({
      status: "complete",
      accountId: "acc-1",
      tierId: "tier-2",
      billingPeriod: "annual",
      trial: true,
      providerSubscriptionId: "sub_stub_acc-1",
    });
  });

  it("returns null for an unknown or malformed session id", async () => {
    expect(await retrieve("not-a-session")).toBeNull();
    expect(await retrieve("cs_stub_%%%not-base64%%%")).toBeNull();
  });
});
