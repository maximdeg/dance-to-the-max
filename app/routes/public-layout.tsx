import { Outlet } from "react-router";
import { getAuthenticatedAccount } from "~/auth/auth.server";
import { PublicHeader } from "~/components/PublicHeader";
import { getLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/public-layout";

/**
 * Shared layout for the pre-login funnel (`/`, `/ballroom`, `/nosotros`,
 * `/comentarios`, `/contacto`). Renders the persistent public header once above
 * every page and leaves the page body to the matched child route. No
 * `requireAccount`, so a Visitor reaches all of these without logging in.
 *
 * `/` is also reachable while signed in, so we tell the header whether an
 * Account is present — it then hides the pre-login-only Ingresar/CTA.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [locale, account] = await Promise.all([
    getLocale(request),
    getAuthenticatedAccount(request),
  ]);
  return { locale, authenticated: account !== null };
}

export default function PublicLayout({ loaderData }: Route.ComponentProps) {
  return (
    <>
      <PublicHeader
        current={loaderData.locale}
        authenticated={loaderData.authenticated}
      />
      <Outlet />
    </>
  );
}
