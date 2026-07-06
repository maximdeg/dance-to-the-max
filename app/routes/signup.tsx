import { Effect, Either } from "effect";
import { Form, Link, redirect } from "react-router";
import { getAuthenticatedAccount, startSession } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { signup } from "~/services/Accounts";
import type { Route } from "./+types/signup";

export function meta() {
  return [{ title: "Sign up · Dance To the Max" }];
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
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const result = await runtime.runPromise(
    signup(email, password).pipe(Effect.either),
  );
  if (Either.isLeft(result)) {
    return { error: "That email is already registered." };
  }

  const cookie = await startSession(result.right.id);
  return redirect("/", { headers: { "Set-Cookie": cookie } });
}

export default function SignUp({ actionData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Create your account</h1>
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
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">Sign up</button>
      </Form>
      <p>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </main>
  );
}
