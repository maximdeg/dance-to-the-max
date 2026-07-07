/**
 * The three canonical Tiers as plain data — no imports — so both the Effect
 * service and the standalone `tsx` seed script (which doesn't resolve the `~`
 * path alias) can consume it via a relative import.
 *
 * Ranks form the cumulative ladder (T3 unlocks everything T1 and T2 do). Prices
 * are in integer cents; annual is discounted relative to twelve months.
 */
export const TIER_SEED = [
  {
    rank: 1,
    nameEs: "Esencial",
    nameEn: "Essential",
    monthlyPriceCents: 999,
    annualPriceCents: 9990,
  },
  {
    rank: 2,
    nameEs: "Completo",
    nameEn: "Complete",
    monthlyPriceCents: 1999,
    annualPriceCents: 19990,
  },
  {
    rank: 3,
    nameEs: "Máximo",
    nameEn: "Max",
    monthlyPriceCents: 2999,
    annualPriceCents: 29990,
  },
] as const;
