import { Link } from "react-router";
import { useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/contacto";

export function meta() {
  return [{ title: "Contacto · Dance To the Max" }];
}

/**
 * Public marketing page — reachable without auth. A minimal placeholder for the
 * static contact-info page (email, socials, location/hours land in a later
 * slice). Nav/toggle come from the shared public header.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return { locale: await getLocale(request) };
}

export default function Contacto() {
  const t = useTranslate();

  return (
    <main>
      <h1>{t("contacto.heading")}</h1>
      <p>{t("contacto.lead")}</p>

      <p>
        <Link to="/signup">{t("cta.startFree")}</Link>
        {" · "}
        <Link to="/pricing">{t("cta.seePlans")}</Link>
      </p>
    </main>
  );
}
