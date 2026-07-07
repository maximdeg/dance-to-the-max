import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import {
  cancelSubscription,
  changePlan,
} from "~/services/SubscriptionManagement";
import { getSubscriptionForAccount } from "~/services/Subscriptions";
import { listTiers } from "~/services/Tiers";
import type { Route } from "./+types/account.subscription";

const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

export function meta() {
  return [{ title: "Your subscription · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const [current, tiers] = await Promise.all([
    runtime.runPromise(getSubscriptionForAccount(account.id)),
    runtime.runPromise(listTiers()),
  ]);

  if (!current) {
    return { hasSubscription: false as const, tiers };
  }

  const pending = current.subscription.pendingTierId
    ? (tiers.find((t) => t.id === current.subscription.pendingTierId) ?? null)
    : null;

  return {
    hasSubscription: true as const,
    tiers,
    current: {
      tierId: current.tier.id,
      tierRank: current.tier.rank,
      tierName: `${current.tier.nameEs} / ${current.tier.nameEn}`,
      status: current.subscription.status,
      billingPeriod: current.subscription.billingPeriod,
      periodEnd: current.subscription.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: current.subscription.cancelAtPeriodEnd,
      pendingTierName: pending ? `${pending.nameEs} / ${pending.nameEn}` : null,
    },
  };
}

export async function action({ request }: Route.ActionArgs) {
  const account = await requireAccount(request);
  const form = await request.formData();
  const intent = form.get("intent");

  if (intent === "cancel") {
    const result = await runtime.runPromise(
      cancelSubscription(account.id).pipe(Effect.either),
    );
    return Either.isLeft(result)
      ? { error: "You don't have an active subscription to cancel." }
      : { ok: "Your subscription will end when the current period does." };
  }

  if (intent === "change") {
    const tierId = String(form.get("tierId") ?? "");
    const result = await runtime.runPromise(
      changePlan(account.id, tierId).pipe(Effect.either),
    );
    if (Either.isLeft(result)) {
      return { error: "That plan change isn't available." };
    }
    const messages: Record<string, string> = {
      upgrade: "Upgraded — the new dances are unlocked now.",
      downgrade: "Downgrade scheduled for your next renewal.",
      unchanged: "You're already on that plan.",
    };
    return { ok: messages[result.right.kind] };
  }

  return { error: "Unknown action." };
}

export default function AccountSubscription({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { tiers } = loaderData;

  return (
    <main>
      <p>
        <Link to="/catalog">← Catalog</Link>
      </p>
      <h1>Your subscription</h1>

      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
      {actionData?.ok ? <p role="status">{actionData.ok}</p> : null}

      {!loaderData.hasSubscription ? (
        <section>
          <p>You don't have a subscription yet.</p>
          <p>
            <Link to="/pricing">See plans</Link>
          </p>
        </section>
      ) : (
        <>
          <section>
            <h2>Current plan</h2>
            <p>
              <strong>{loaderData.current.tierName}</strong> —{" "}
              {loaderData.current.billingPeriod}, {loaderData.current.status}
            </p>
            {loaderData.current.periodEnd ? (
              <p>
                {loaderData.current.cancelAtPeriodEnd ? "Access ends" : "Renews"}{" "}
                on{" "}
                {new Date(loaderData.current.periodEnd).toLocaleDateString()}
              </p>
            ) : null}
            {loaderData.current.pendingTierName ? (
              <p>
                Scheduled to switch to{" "}
                <strong>{loaderData.current.pendingTierName}</strong> at renewal.
              </p>
            ) : null}
            {!loaderData.current.cancelAtPeriodEnd ? (
              <Form method="post">
                <button type="submit" name="intent" value="cancel">
                  Cancel subscription
                </button>
              </Form>
            ) : null}
          </section>

          <section>
            <h2>Change plan</h2>
            <ul>
              {tiers.map((tier) => {
                const isCurrent = tier.id === loaderData.current.tierId;
                const label =
                  tier.rank > loaderData.current.tierRank
                    ? "Upgrade (now)"
                    : tier.rank < loaderData.current.tierRank
                      ? "Downgrade (at renewal)"
                      : "Current plan";
                return (
                  <li key={tier.id}>
                    {tier.nameEs} / {tier.nameEn} —{" "}
                    {formatPrice(tier.monthlyPriceCents)}/mo ·{" "}
                    {formatPrice(tier.annualPriceCents)}/yr{" "}
                    {isCurrent ? (
                      <em>({label})</em>
                    ) : (
                      <Form method="post" style={{ display: "inline" }}>
                        <input type="hidden" name="intent" value="change" />
                        <input type="hidden" name="tierId" value={tier.id} />
                        <button type="submit">{label}</button>
                      </Form>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </main>
  );
}
