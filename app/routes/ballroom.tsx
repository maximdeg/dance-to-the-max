import { Link } from "react-router";
import { useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/ballroom";

export function meta() {
  return [{ title: "Ballroom · Dance To the Max" }];
}

/**
 * Public marketing page — no `requireAccount`, so a Visitor reaches it without
 * logging in. The loader returns the active Locale (the copy itself lives in the
 * i18n catalog and renders through `useTranslate`).
 */
export async function loader({ request }: Route.LoaderArgs) {
  return { locale: await getLocale(request) };
}

export default function Ballroom() {
  const t = useTranslate();

  return (
    <main>
      <h1>{t("ballroom.heading")}</h1>
      <p>{t("ballroom.p1")}</p>
      <p>{t("ballroom.p2")}</p>
      <p>{t("ballroom.p3")}</p>

      <p>
        <Link to="/signup">{t("cta.startFree")}</Link>
        {" · "}
        <Link to="/pricing">{t("cta.seePlans")}</Link>
      </p>
    </main>
  );
}
