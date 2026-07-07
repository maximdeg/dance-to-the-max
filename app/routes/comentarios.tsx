import { Link } from "react-router";
import { useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/comentarios";

export function meta() {
  return [{ title: "Comentarios · Dance To the Max" }];
}

/**
 * Public marketing page — reachable without auth. A minimal placeholder for the
 * curated Testimonials social-proof page; the testimonials themselves land in a
 * later slice. Nav/toggle come from the shared public header.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return { locale: await getLocale(request) };
}

export default function Comentarios() {
  const t = useTranslate();

  return (
    <main>
      <h1>{t("comentarios.heading")}</h1>
      <p>{t("comentarios.lead")}</p>

      <p>
        <Link to="/signup">{t("cta.startFree")}</Link>
        {" · "}
        <Link to="/pricing">{t("cta.seePlans")}</Link>
      </p>
    </main>
  );
}
