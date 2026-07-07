import { redirect } from "react-router";
import { isLocale } from "~/i18n/catalog";
import { serializeLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/locale";

/** Only same-origin, non-protocol-relative paths are safe redirect targets. */
const safePath = (value: string): string =>
  value.startsWith("/") && !value.startsWith("//") ? value : "/";

/**
 * Resource route: the language switcher posts here to persist a Locale, then
 * bounces back to the page it came from. A bare GET just goes home.
 */
export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const locale = String(form.get("locale") ?? "");
  const redirectTo = safePath(String(form.get("redirectTo") ?? "/"));

  const headers: HeadersInit = isLocale(locale)
    ? { "Set-Cookie": await serializeLocale(locale) }
    : {};
  return redirect(redirectTo, { headers });
}

export function loader() {
  return redirect("/");
}
