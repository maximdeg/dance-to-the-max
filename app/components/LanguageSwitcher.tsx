import { Form, useLocation } from "react-router";
import type { Locale } from "~/i18n/catalog";
import { useTranslate } from "~/i18n/context";

/**
 * ES/EN toggle. Posts the chosen Locale to the `/locale` resource route, which
 * persists it in a cookie and bounces back to the current page. Rendered both
 * globally (in `root`, for the authenticated app) and inside the public header.
 */
export function LanguageSwitcher({ current }: { current: Locale }) {
  const t = useTranslate();
  const location = useLocation();
  const redirectTo = location.pathname + location.search;

  return (
    <Form method="post" action="/locale" aria-label={t("nav.language")}>
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
  );
}
