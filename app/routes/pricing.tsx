import { Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
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
  };
}

export default function Pricing({ loaderData }: Route.ComponentProps) {
  const { tiers, currentTierId, currentStatus } = loaderData;

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
          </li>
        ))}
      </ul>
    </main>
  );
}
