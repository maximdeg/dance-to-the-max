import type { Dance } from "~/services/Content";
import type { Tier } from "~/services/Tiers";

/**
 * Pure view-model helpers for the public Home funnel. They compose the two
 * existing public reads — published Dances (the sampler) and Tiers (the plan
 * comparison) — into what the page renders, with no DB or React dependency so
 * the domain logic (the cumulative unlock ladder and the annual discount) is
 * unit-testable on plain data.
 */

/** Percent saved by paying annually vs. twelve monthly charges (rounded, ≥ 0). */
export const annualDiscountPercent = (
  monthlyPriceCents: number,
  annualPriceCents: number,
): number => {
  const fullYear = monthlyPriceCents * 12;
  if (fullYear <= 0) return 0;
  return Math.max(0, Math.round((1 - annualPriceCents / fullYear) * 100));
};

/** A Tier paired with the published Dances it unlocks and its annual saving. */
export interface TierPlan {
  readonly tier: Tier;
  readonly unlockedDances: Dance[];
  readonly annualDiscountPercent: number;
}

/**
 * The Tier comparison rows: each Tier with every published Dance it unlocks.
 * Cumulative — a Tier unlocks a Dance when the Dance's `minTierRank` is at or
 * below the Tier's `rank`, so a higher Tier includes everything a lower one does.
 */
export const buildTierPlans = (
  tiers: readonly Tier[],
  dances: readonly Dance[],
): TierPlan[] =>
  tiers.map((tier) => ({
    tier,
    unlockedDances: dances.filter((dance) => dance.minTierRank <= tier.rank),
    annualDiscountPercent: annualDiscountPercent(
      tier.monthlyPriceCents,
      tier.annualPriceCents,
    ),
  }));

/**
 * The lowest Tier that unlocks a Dance — the one a "Desbloqueás con Tn" badge
 * points at. Returns undefined only when no Tier's rank reaches the Dance.
 */
export const minTierForDance = (
  dance: Dance,
  tiers: readonly Tier[],
): Tier | undefined =>
  tiers
    .filter((tier) => tier.rank >= dance.minTierRank)
    .sort((a, b) => a.rank - b.rank)[0];
