import { useState } from "react";
import { Link } from "react-router";
import { buildTierPlans, minTierForDance } from "~/funnel";
import { useLocale, useTranslate } from "~/i18n/context";
import { testimonials } from "~/i18n/testimonials";
import type { Dance } from "~/services/Content";
import type { Tier } from "~/services/Tiers";

const formatPrice = (cents: number): string => `$${(cents / 100).toFixed(2)}`;

/**
 * The pre-login Home funnel: hero, value prop, a Dance sampler, the interactive
 * Tier comparison (monthly/annual toggle showing the annual discount), a
 * testimonials strip, and a closing CTA. Fed by the public reads (published
 * Dances + Tiers); the unlock/discount logic lives in `~/funnel`. Thumbnails are
 * name monograms until per-Dance art exists.
 */
export function HomeFunnel({
  dances,
  tiers,
}: {
  dances: Dance[];
  tiers: Tier[];
}) {
  const t = useTranslate();
  const locale = useLocale();
  const [period, setPeriod] = useState<"monthly" | "annual">("monthly");

  const danceName = (dance: Dance) =>
    locale === "es" ? dance.nameEs : dance.nameEn;
  const tierName = (tier: Tier) => (locale === "es" ? tier.nameEs : tier.nameEn);

  const plans = buildTierPlans(tiers, dances);
  const sampler = dances.slice(0, 6);

  return (
    <>
      <section className="hero">
        <div className="hero__copy">
          <h1>{t("home.hero.title")}</h1>
          <p className="hero__lead">{t("landing.lead")}</p>
          <p className="hero__actions">
            <Link to="/signup" className="button button--primary">
              {t("cta.startFree")}
            </Link>
            <a href="#planes" className="button">
              {t("cta.seePlans")}
            </a>
          </p>
        </div>
        <div className="hero__media" aria-hidden="true" />
      </section>

      <section className="valueprop">
        <h2>{t("home.valueProp.title")}</h2>
        <p>{t("landing.forWho")}</p>
      </section>

      {sampler.length > 0 ? (
        <section className="sampler">
          <h2>{t("home.sampler.title")}</h2>
          <ul className="sampler__grid">
            {sampler.map((dance) => {
              const tier = minTierForDance(dance, tiers);
              return (
                <li key={dance.id}>
                  <Link to="/signup" className="dance-card">
                    <span className="dance-card__thumb" aria-hidden="true">
                      {danceName(dance).charAt(0)}
                    </span>
                    <span className="dance-card__name">{danceName(dance)}</span>
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

      {plans.length > 0 ? (
        <section id="planes" className="plans">
          <h2>{t("home.plans.title")}</h2>
          <p>{t("home.plans.subtitle")}</p>

          <div
            className="plans__toggle"
            role="group"
            aria-label={t("home.plans.title")}
          >
            <button
              type="button"
              aria-pressed={period === "monthly"}
              onClick={() => setPeriod("monthly")}
            >
              {t("home.plans.monthly")}
            </button>
            <button
              type="button"
              aria-pressed={period === "annual"}
              onClick={() => setPeriod("annual")}
            >
              {t("home.plans.annual")}
            </button>
          </div>

          <ul className="plans__grid">
            {plans.map(({ tier, unlockedDances, annualDiscountPercent }) => (
              <li key={tier.id} className="plan-card">
                <h3>{tierName(tier)}</h3>
                <p className="plan-card__price">
                  {period === "monthly"
                    ? formatPrice(tier.monthlyPriceCents)
                    : formatPrice(tier.annualPriceCents)}
                  <span className="plan-card__cadence">
                    {period === "monthly"
                      ? t("home.plans.perMonth")
                      : t("home.plans.perYear")}
                  </span>
                </p>
                {period === "annual" && annualDiscountPercent > 0 ? (
                  <p className="badge badge--save">
                    {t("home.plans.save")} {annualDiscountPercent}%
                  </p>
                ) : null}
                <p className="plan-card__includes">{t("home.plans.includes")}</p>
                <ul className="plan-card__dances">
                  {unlockedDances.map((dance) => (
                    <li key={dance.id}>
                      <span className="dance-chip__thumb" aria-hidden="true">
                        {danceName(dance).charAt(0)}
                      </span>
                      {danceName(dance)}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="button button--primary">
                  {t("cta.startFree")}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="testimonials">
        <h2>{t("home.testimonials.title")}</h2>
        <ul className="testimonials__grid">
          {testimonials.map((item) => (
            <li key={item.id} className="testimonial">
              <blockquote>{item.quote[locale]}</blockquote>
              <cite>{item.attribution}</cite>
            </li>
          ))}
        </ul>
      </section>

      <section className="closing-cta">
        <p>{t("cta.prompt")}</p>
        <Link to="/signup" className="button button--primary">
          {t("cta.startFree")}
        </Link>
      </section>
    </>
  );
}
