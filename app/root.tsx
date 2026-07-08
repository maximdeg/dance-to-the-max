import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from "react-router";
import { LanguageSwitcher } from "~/components/LanguageSwitcher";
import { defaultLocale } from "~/i18n/catalog";
import { LocaleProvider } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import { isPublicPath } from "~/public-nav";
import type { Route } from "./+types/root";
import "./app.css";

export async function loader({ request }: Route.LoaderArgs) {
  return { locale: await getLocale(request) };
}

export function Layout({ children }: { children: ReactNode }) {
  // Available on every render except the pre-hydration error shell, where we
  // fall back to the default so `lang` is still valid.
  const data = useRouteLoaderData<typeof loader>("root");
  const locale = data?.locale ?? defaultLocale;

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Narrow:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  const location = useLocation();
  // The public funnel carries its own toggle inside the shared header; render
  // the global one only elsewhere (authenticated app, auth flows) so a Visitor
  // never sees two.
  const showGlobalSwitcher = !isPublicPath(location.pathname);

  return (
    <LocaleProvider value={loaderData.locale}>
      {showGlobalSwitcher ? (
        <LanguageSwitcher current={loaderData.locale} />
      ) : null}
      <Outlet />
    </LocaleProvider>
  );
}
