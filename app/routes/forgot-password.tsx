import { Form, Link } from "react-router";
import { runtime } from "~/runtime.server";
import { requestPasswordReset } from "~/services/PasswordReset";
import type { Route } from "./+types/forgot-password";

export function meta() {
  return [{ title: "Reset your password · Dance To the Max" }];
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "").trim();

  // Always run the request (a no-op for unknown emails) and always return the
  // same neutral response, so the form can't reveal which emails have accounts.
  if (email) {
    await runtime.runPromise(requestPasswordReset(email));
  }

  return {
    sent: "If an account exists for that email, a reset link is on its way.",
  };
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  return (
    <main>
      <h1>Reset your password</h1>
      {actionData?.sent ? (
        <p role="status">{actionData.sent}</p>
      ) : (
        <Form method="post">
          <label>
            Email
            <input type="email" name="email" required autoComplete="email" />
          </label>
          <button type="submit">Send reset link</button>
        </Form>
      )}
      <p>
        <Link to="/login">Back to log in</Link>
      </p>
    </main>
  );
}
