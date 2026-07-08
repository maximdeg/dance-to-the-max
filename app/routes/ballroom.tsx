import { Effect } from "effect";
import { Link } from "react-router";
import { minTierForDance } from "~/funnel";
import { useLocale, useTranslate } from "~/i18n/context";
import { getLocale } from "~/i18n/locale.server";
import { runtime } from "~/runtime.server";
import { listPublishedDances } from "~/services/Catalog";
import type { Dance } from "~/services/Content";
import { listTiers, type Tier } from "~/services/Tiers";
import type { Route } from "./+types/ballroom";

export function meta() {
  return [{ title: "Ballroom · Dance To the Max" }];
}

/**
 * Public marketing read: every published Dance (with its bilingual history) plus
 * the Tiers, for the per-Dance "Desbloqueás con Tn" badge. As marketing there is
 * **no Entitlement filter** — pre-login there is no Subscriber — so all published
 * Dances appear. A transient DB failure degrades to empty rows rather than
 * 500-ing the marketing page.
 */
async function loadDances(): Promise<{ dances: Dance[]; tiers: Tier[] }> {
  try {
    return await runtime.runPromise(
      Effect.all({ dances: listPublishedDances(), tiers: listTiers() }),
    );
  } catch {
    return { dances: [], tiers: [] };
  }
}

/**
 * Public marketing page — no `requireAccount`, so a Visitor reaches it without
 * logging in. Copy lives in the i18n catalog; the per-Dance histories come from
 * the Catalog read.
 */
export async function loader({ request }: Route.LoaderArgs) {
  const [locale, funnel] = await Promise.all([getLocale(request), loadDances()]);
  return { locale, dances: funnel.dances, tiers: funnel.tiers };
}

export default function Ballroom({ loaderData }: Route.ComponentProps) {
  const t = useTranslate();
  const locale = useLocale();
  const { dances, tiers } = loaderData;

  const danceName = (dance: Dance) =>
    locale === "es" ? dance.nameEs : dance.nameEn;
  const danceHistory = (dance: Dance) =>
    locale === "es" ? dance.historyEs : dance.historyEn;
  const tierName = (tier: Tier) => (locale === "es" ? tier.nameEs : tier.nameEn);

  return (
    <main>
      <h1>{t("ballroom.heading")}</h1>
      <p>{t("ballroom.p1")}</p>
      <p>{t("ballroom.p2")}</p>
      <p>{t("ballroom.p3")}</p>

      {dances.length > 0 ? (
        <section className="ballroom-dances">
          <h2>{t("ballroom.dancesTitle")}</h2>
          <ul className="sampler__grid">
            {dances.map((dance) => {
              const tier = minTierForDance(dance, tiers);
              const history = danceHistory(dance);
              return (
                <li key={dance.id}>
                  <Link to="/signup" className="dance-card">
                    <span className="dance-card__thumb" aria-hidden="true">
                      {danceName(dance).charAt(0)}
                    </span>
                    <span className="dance-card__name">{danceName(dance)}</span>
                    {history ? (
                      <span className="dance-card__history">{history}</span>
                    ) : null}
                    {tier ? (
                      <span className="badge">
                        {t("home.sampler.unlockWith")} {tierName(tier)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

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
