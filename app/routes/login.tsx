import { Effect, Either } from "effect";
import { Form, Link, redirect } from "react-router";
import { getAuthenticatedAccount, startSession } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { verifyCredentials } from "~/services/Accounts";
import type { Route } from "./+types/login";

export function meta() {
  return [{ title: "Log in · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  if (await getAuthenticatedAccount(request)) throw redirect("/");
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const result = await runtime.runPromise(
    verifyCredentials(email, password).pipe(Effect.either),
  );
  if (Either.isLeft(result)) {
    return { error: "Incorrect email or password." };
  }

  const cookie = await startSession(result.right.id);
  return redirect("/", { headers: { "Set-Cookie": cookie } });
}

export default function LogIn({ actionData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Log in</h1>
      <Form method="post">
        <label>
          Email
          <input type="email" name="email" required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            name="password"
            required
            autoComplete="current-password"
          />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">Log in</button>
      </Form>
      <p>
        No account yet? <Link to="/signup">Sign up</Link>
      </p>
    </main>
  );
}
