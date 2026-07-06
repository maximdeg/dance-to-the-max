import type { ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { defaultLocale } from "~/i18n/catalog";
import { LocaleProvider } from "~/i18n/context";
import "./app.css";

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang={defaultLocale}>
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

export default function App() {
  // Locale is fixed to the default for now; the switcher slice will make this
  // dynamic (cookie / Accept-Language) via the same provider.
  return (
    <LocaleProvider value={defaultLocale}>
      <Outlet />
    </LocaleProvider>
  );
}
