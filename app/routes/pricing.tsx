import { Effect, Either } from "effect";
import { Form, Link, redirect } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { startCheckout } from "~/services/Checkout";
import { getSubscriptionForAccount } from "~/services/Subscriptions";
import { listTiers } from "~/services/Tiers";
import type { Route } from "./+types/pricing";

const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export function meta() {
  return [{ title: "Plans · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const [tiers, current] = await Promise.all([
    runtime.runPromise(listTiers()),
    runtime.runPromise(getSubscriptionForAccount(account.id)),
  ]);
  return {
    tiers,
    currentTierId: current?.tier.id ?? null,
    currentStatus: current?.subscription.status ?? null,
    // The free Trial is offered to Accounts that have never subscribed.
    offerTrial: current === null,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const account = await requireAccount(request);
  const form = await request.formData();
  const tierId = String(form.get("tierId") ?? "");
  const billingPeriod =
    form.get("billingPeriod") === "annual" ? "annual" : "monthly";
  const trial = form.get("trial") === "1";
  const origin = new URL(request.url).origin;

  const result = await runtime.runPromise(
    startCheckout({
      accountId: account.id,
      tierId,
      billingPeriod,
      trial,
      origin,
    }).pipe(Effect.either),
  );
  if (Either.isLeft(result)) {
    return { error: "That plan isn't available. Please try again." };
  }
  return redirect(result.right.url);
}

export default function Pricing({ loaderData, actionData }: Route.ComponentProps) {
  const { tiers, currentTierId, currentStatus, offerTrial } = loaderData;

  return (
    <main>
      <p>
        <Link to="/catalog">← Catalog</Link>
      </p>
      <h1>Plans</h1>
      {currentStatus ? (
        <p>
          Your subscription is <strong>{currentStatus}</strong>.
        </p>
      ) : (
        <p>You don't have a subscription yet.</p>
      )}
      {offerTrial ? <p>Every plan starts with a free trial.</p> : null}
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}

      <ul>
        {tiers.map((tier) => (
          <li key={tier.id}>
            <h2>
              {tier.nameEs} / {tier.nameEn}
              {tier.id === currentTierId ? " — current plan" : ""}
            </h2>
            <p>
              {formatPrice(tier.monthlyPriceCents)}/month ·{" "}
              {formatPrice(tier.annualPriceCents)}/year
            </p>
            <Form method="post">
              <input type="hidden" name="tierId" value={tier.id} />
              <input type="hidden" name="trial" value={offerTrial ? "1" : ""} />
              <button type="submit" name="billingPeriod" value="monthly">
                {offerTrial ? "Start free trial — monthly" : "Choose monthly"}
              </button>{" "}
              <button type="submit" name="billingPeriod" value="annual">
                {offerTrial ? "Start free trial — annual" : "Choose annual"}
              </button>
            </Form>
          </li>
        ))}
      </ul>
    </main>
  );
}
