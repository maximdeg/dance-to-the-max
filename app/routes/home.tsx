import { Form, Link } from "react-router";
import { getAuthenticatedAccount } from "~/auth/auth.server";
import { useTranslate } from "~/i18n/context";
import type { Route } from "./+types/home";

export function meta() {
  return [{ title: "Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await getAuthenticatedAccount(request);
  return {
    account: account ? { email: account.email, role: account.role } : null,
  };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const t = useTranslate();
  const { account } = loaderData;

  return (
    <main>
      <h1>{t("app.name")}</h1>
      <p>{t("home.tagline")}</p>

      {account ? (
        <>
          <p>
            Signed in as {account.email} ({account.role})
          </p>
          <Form method="post" action="/logout">
            <button type="submit">Log out</button>
          </Form>
        </>
      ) : (
        <p>
          <Link to="/login">Log in</Link> or <Link to="/signup">sign up</Link>
        </p>
      )}
    </main>
  );
}
