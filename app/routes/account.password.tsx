import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import {
  getCurrentSessionId,
  requireAccount,
} from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { changePassword } from "~/services/Accounts";
import type { Route } from "./+types/account.password";

export function meta() {
  return [{ title: "Change password · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireAccount(request);
  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const account = await requireAccount(request);
  const sessionId = await getCurrentSessionId(request);
  if (!sessionId) {
    // The cookie was present enough to authenticate, so this shouldn't happen.
    return { error: "Your session has expired. Please log in again." };
  }

  const form = await request.formData();
  const currentPassword = String(form.get("currentPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmPassword = String(form.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword) {
    return { error: "All fields are required." };
  }
  if (newPassword.length < 8) {
    return { error: "New password must be at least 8 characters." };
  }
  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const result = await runtime.runPromise(
    changePassword(account.id, currentPassword, newPassword, sessionId).pipe(
      Effect.either,
    ),
  );
  if (Either.isLeft(result)) {
    return { error: "Your current password is incorrect." };
  }

  return { ok: "Password changed. You've been signed out on other devices." };
}

export default function ChangePassword({ actionData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Change password</h1>
      <Form method="post">
        <label>
          Current password
          <input
            type="password"
            name="currentPassword"
            required
            autoComplete="current-password"
          />
        </label>
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
        {actionData?.ok ? <p role="status">{actionData.ok}</p> : null}
        <button type="submit">Change password</button>
      </Form>
      <p>
        <Link to="/">Back home</Link>
      </p>
    </main>
  );
}
