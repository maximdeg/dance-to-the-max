import { Effect, Either } from "effect";
import { Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { fulfillCheckout } from "~/services/Checkout";
import type { Route } from "./+types/checkout.success";

export function meta() {
  return [{ title: "Subscription · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const sessionId = new URL(request.url).searchParams.get("session_id") ?? "";

  const result = await runtime.runPromise(
    fulfillCheckout(account.id, sessionId).pipe(Effect.either),
  );
  if (Either.isLeft(result)) {
    return { ok: false as const };
  }
  return { ok: true as const, status: result.right.status };
}

export default function CheckoutSuccess({ loaderData }: Route.ComponentProps) {
  if (!loaderData.ok) {
    return (
      <main>
        <h1>We couldn't confirm your subscription</h1>
        <p>Your checkout didn't complete, so no plan was started.</p>
        <p>
          <Link to="/pricing">Back to plans</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>You're all set 🎉</h1>
      <p>
        Your subscription is{" "}
        <strong>
          {loaderData.status === "trialing" ? "on a free trial" : "active"}
        </strong>
        .
      </p>
      <p>
        <Link to="/catalog">Start watching</Link>
      </p>
    </main>
  );
}
