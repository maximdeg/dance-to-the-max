import { describe, expect, it } from "vitest";
import { locales } from "~/i18n/catalog";
import { testimonials } from "~/i18n/testimonials";
import type { Dance } from "~/services/Content";
import type { Tier } from "~/services/Tiers";
import { annualDiscountPercent, buildTierPlans, minTierForDance } from "./funnel";

const tier = (
  rank: number,
  monthlyPriceCents = 1000,
  annualPriceCents = 10000,
): Tier => ({
  id: `tier-${rank}`,
  rank,
  nameEs: `T${rank}`,
  nameEn: `T${rank}`,
  monthlyPriceCents,
  annualPriceCents,
  createdAt: new Date(),
});

const dance = (minTierRank: number, nameEs = `d${minTierRank}`): Dance => ({
  id: `dance-${nameEs}`,
  nameEs,
  nameEn: nameEs,
  historyEs: "",
  historyEn: "",
  minTierRank,
  published: true,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("annualDiscountPercent", () => {
  it("rounds the saving vs. twelve monthly charges", () => {
    // 999*12 = 11988; 9990 paid → ~16.7% off → 17.
    expect(annualDiscountPercent(999, 9990)).toBe(17);
    expect(annualDiscountPercent(1000, 6000)).toBe(50);
  });

  it("never reports a negative discount and tolerates a zero price", () => {
    expect(annualDiscountPercent(1000, 12000)).toBe(0);
    expect(annualDiscountPercent(1000, 15000)).toBe(0);
    expect(annualDiscountPercent(0, 0)).toBe(0);
  });
});

describe("buildTierPlans", () => {
  it("unlocks Dances cumulatively — a Tier includes every lower Tier's Dances", () => {
    const tiers = [tier(1), tier(2), tier(3)];
    const dances = [dance(1, "a"), dance(2, "b"), dance(3, "c")];

    const plans = buildTierPlans(tiers, dances);

    expect(plans.map((p) => p.unlockedDances.map((d) => d.nameEs))).toEqual([
      ["a"],
      ["a", "b"],
      ["a", "b", "c"],
    ]);
  });

  it("carries each Tier's annual discount", () => {
    const plans = buildTierPlans([tier(1, 999, 9990)], [dance(1)]);
    expect(plans[0]?.annualDiscountPercent).toBe(17);
  });
});

describe("minTierForDance", () => {
  const tiers = [tier(1), tier(2), tier(3)];

  it("points at the lowest Tier whose rank reaches the Dance", () => {
    expect(minTierForDance(dance(2), tiers)?.rank).toBe(2);
    expect(minTierForDance(dance(1), tiers)?.rank).toBe(1);
  });

  it("is undefined when no Tier reaches the Dance", () => {
    expect(minTierForDance(dance(4), tiers)).toBeUndefined();
  });
});

describe("testimonials", () => {
  it("are curated with a quote in every Locale and an attribution", () => {
    expect(testimonials.length).toBeGreaterThan(0);
    for (const t of testimonials) {
      expect(t.attribution.trim()).not.toBe("");
      for (const locale of locales) {
        expect(t.quote[locale]?.trim()).not.toBe("");
      }
    }
  });
});
