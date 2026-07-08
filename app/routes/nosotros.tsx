import { Link } from "react-router";
import { useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/nosotros";

export function meta() {
  return [{ title: "Nosotros · Dance To the Max" }];
}

/** Public marketing page — Max's bio. Reachable without authentication. */
export async function loader({ request }: Route.LoaderArgs) {
  return { locale: await getLocale(request) };
}

export default function Nosotros() {
  const t = useTranslate();

  return (
    <main>
      <h1>{t("about.heading")}</h1>
      <p>{t("about.p1")}</p>
      <p>{t("about.p2")}</p>

      <h2>{t("about.studioTitle")}</h2>
      <p>{t("about.studioP1")}</p>

      <p>{t("cta.prompt")}</p>
      <p className="cta-row">
        <Link to="/signup" className="button button--primary">
          {t("cta.startFree")}
        </Link>
        <Link to="/pricing" className="button">
          {t("cta.seePlans")}
        </Link>
      </p>
    </main>
  );
}
