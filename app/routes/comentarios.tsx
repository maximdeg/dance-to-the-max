import { Link } from "react-router";
import { useLocale, useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import { testimonials } from "~/i18n/testimonials";
import type { Route } from "./+types/comentarios";

export function meta() {
  return [{ title: "Comentarios · Dance To the Max" }];
}

/**
 * Public marketing page — reachable without auth. The curated Testimonials
 * social-proof surface: staff-authored quotes from the i18n catalog, not the
 * deferred Subscriber-posted Comment feature (no submission, no moderation).
 * Nav/toggle come from the shared public header.
 */
export async function loader({ request }: Route.LoaderArgs) {
  return { locale: await getLocale(request) };
}

export default function Comentarios() {
  const t = useTranslate();
  const locale = useLocale();

  return (
    <main>
      <h1>{t("comentarios.heading")}</h1>
      <p>{t("comentarios.lead")}</p>

      <ul className="testimonials__grid">
        {testimonials.map((item) => (
          <li key={item.id} className="testimonial">
            <blockquote>{item.quote[locale]}</blockquote>
            <cite>{item.attribution}</cite>
          </li>
        ))}
      </ul>

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
