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
            {t("home.signedInAs")} {account.email} ({account.role})
          </p>
          <p>
            <Link to="/catalog">{t("home.browseCatalog")}</Link>
            {" · "}
            <Link to="/pricing">{t("nav.plans")}</Link>
          </p>
          {account.role === "super_admin" ? (
            <p>
              <Link to="/admin/dances">{t("nav.manageContent")}</Link>
            </p>
          ) : null}
          <p>
            <Link to="/account/password">{t("nav.changePassword")}</Link>
          </p>
          <Form method="post" action="/logout">
            <button type="submit">{t("nav.logout")}</button>
          </Form>
        </>
      ) : (
        <>
          <p>{t("landing.lead")}</p>
          <p>{t("landing.forWho")}</p>
          <p>
            <Link to="/signup">{t("cta.startFree")}</Link>
            {" · "}
            <Link to="/pricing">{t("cta.seePlans")}</Link>
          </p>
        </>
      )}
    </main>
  );
}
