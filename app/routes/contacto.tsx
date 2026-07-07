import { Link } from "react-router";
import { useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import type { Route } from "./+types/contacto";

export function meta() {
  return [{ title: "Contacto · Dance To the Max" }];
}

/**
 * PLACEHOLDER contact details — swap in the studio's real email, social
 * handles, and address before launch. These are locale-neutral, so they live
 * here rather than in the string catalog (only the labels/hours are localized).
 */
const CONTACT = {
  email: "hola@dancetothemax.com",
  instagram: {
    handle: "@dancetothemax",
    url: "https://instagram.com/dancetothemax",
  },
  youtube: { handle: "Dance To the Max", url: "https://youtube.com/@dancetothemax" },
  address: "Av. Corrientes 1234, Buenos Aires, Argentina",
};

/**
 * Public marketing page — reachable without auth. Static contact info only: no
 * form and no message-handling backend in this phase. Nav/toggle come from the
 * shared public header.
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

      <dl className="contact-info">
        <dt>{t("contacto.emailLabel")}</dt>
        <dd>
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
        </dd>

        <dt>{t("contacto.socialLabel")}</dt>
        <dd>
          <a href={CONTACT.instagram.url} rel="noreferrer">
            Instagram ({CONTACT.instagram.handle})
          </a>
          {" · "}
          <a href={CONTACT.youtube.url} rel="noreferrer">
            YouTube ({CONTACT.youtube.handle})
          </a>
        </dd>

        <dt>{t("contacto.locationLabel")}</dt>
        <dd>{CONTACT.address}</dd>

        <dt>{t("contacto.hoursLabel")}</dt>
        <dd>{t("contacto.hours")}</dd>
      </dl>

      <p>
        <Link to="/signup">{t("cta.startFree")}</Link>
        {" · "}
        <Link to="/pricing">{t("cta.seePlans")}</Link>
      </p>
    </main>
  );
}
