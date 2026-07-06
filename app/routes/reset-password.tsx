import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { runtime } from "~/runtime.server";
import { resetPassword } from "~/services/PasswordReset";
import type { Route } from "./+types/reset-password";

export function meta() {
  return [{ title: "Choose a new password · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  return { token };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const token = String(form.get("token") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");

  if (!token) {
    return { error: "This reset link is invalid or has expired." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const result = await runtime.runPromise(
    resetPassword(token, newPassword).pipe(Effect.either),
  );
  if (Either.isLeft(result)) {
    return { error: "This reset link is invalid or has expired." };
  }

  return { ok: true as const };
}

export default function ResetPassword({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  if (actionData?.ok) {
    return (
      <main>
        <h1>Password updated</h1>
        <p role="status">
          Your password has been reset and all devices signed out.
        </p>
        <p>
          <Link to="/login">Log in</Link>
        </p>
      </main>
    );
  }

  return (
    <main>
      <h1>Choose a new password</h1>
      <Form method="post">
        <input type="hidden" name="token" value={loaderData.token} />
        <label>
          New password
          <input
            type="password"
            name="newPassword"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm new password
          <input
            type="password"
            name="confirmPassword"
            required
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
        <button type="submit">Set new password</button>
      </Form>
    </main>
  );
}
