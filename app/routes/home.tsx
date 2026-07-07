import { Effect } from "effect";
import { Form, Link } from "react-router";
import { getAuthenticatedAccount } from "~/auth/auth.server";
import { HomeFunnel } from "~/components/HomeFunnel";
import { useTranslate } from "~/i18n/context";
import { runtime } from "~/runtime.server";
import { listPublishedDances } from "~/services/Catalog";
import type { Dance } from "~/services/Content";
import { listTiers, type Tier } from "~/services/Tiers";
import type { Route } from "./+types/home";

export function meta() {
  return [{ title: "Dance To the Max" }];
}

/**
 * The public Home funnel data: the published Dance sampler + the Tier
 * comparison, both public reads (no Entitlement filter — there is no Subscriber
 * pre-login). The landing must never hard-fail on a transient DB hiccup, so a
 * failed read degrades to empty rows the funnel renders around — the same
 * posture as the health check — rather than 500-ing the marketing page.
 */
async function loadFunnel(): Promise<{ dances: Dance[]; tiers: Tier[] }> {
  try {
    return await runtime.runPromise(
      Effect.all({ dances: listPublishedDances(), tiers: listTiers() }),
    );
  } catch {
    return { dances: [], tiers: [] };
  }
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await getAuthenticatedAccount(request);
  if (account) {
    return {
      account: { email: account.email, role: account.role },
      funnel: null,
    };
  }
  return { account: null, funnel: await loadFunnel() };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const t = useTranslate();
  const { account } = loaderData;

  if (account) {
    return (
      <main>
        <h1>{t("app.name")}</h1>
        <p>{t("home.tagline")}</p>
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
      </main>
    );
  }

  return (
    <main>
      {loaderData.funnel ? (
        <HomeFunnel
          dances={loaderData.funnel.dances}
          tiers={loaderData.funnel.tiers}
        />
      ) : null}
    </main>
  );
}
