import type { ReactNode } from "react";
import {
  Form,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  useRouteLoaderData,
} from "react-router";
import { defaultLocale, type Locale } from "~/i18n/catalog";
import { LocaleProvider, useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
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

function LanguageSwitcher({ current }: { current: Locale }) {
  const t = useTranslate();
  const location = useLocation();
  const redirectTo = location.pathname + location.search;

  return (
    <nav aria-label={t("nav.language")}>
      <Form method="post" action="/locale">
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <button
          type="submit"
          name="locale"
          value="es"
          aria-pressed={current === "es"}
          disabled={current === "es"}
        >
          ES
        </button>
        <button
          type="submit"
          name="locale"
          value="en"
          aria-pressed={current === "en"}
          disabled={current === "en"}
        >
          EN
        </button>
      </Form>
    </nav>
  );
}

export default function App({ loaderData }: Route.ComponentProps) {
  return (
    <LocaleProvider value={loaderData.locale}>
      <LanguageSwitcher current={loaderData.locale} />
      <Outlet />
    </LocaleProvider>
  );
}
