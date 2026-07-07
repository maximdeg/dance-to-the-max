import { describe, expect, it } from "vitest";
import {
  grantsAccess,
  isEntitledTo,
  type Entitlement,
  type SubscriptionStatus,
} from "./Entitlement";

describe("grantsAccess", () => {
  const cases: ReadonlyArray<[SubscriptionStatus, boolean]> = [
    ["trialing", true],
    ["active", true],
    ["past_due", true],
    ["canceled", false],
  ];
  it.each(cases)("%s → %s", (status, expected) => {
    expect(grantsAccess(status)).toBe(expected);
  });
});

describe("isEntitledTo", () => {
  // [label, entitlement, dance.minTierRank, expected]
  const cases: ReadonlyArray<
    [string, Entitlement | null, number, boolean]
  > = [
    ["no subscription is never entitled", null, 1, false],
    ["exact rank, active", { status: "active", tierRank: 1 }, 1, true],
    // Cumulative ladder: a higher Tier unlocks a lower-ranked Dance.
    ["higher tier unlocks lower dance", { status: "active", tierRank: 2 }, 1, true],
    ["top tier unlocks everything", { status: "active", tierRank: 3 }, 1, true],
    // ...but a lower Tier cannot reach a higher-ranked Dance.
    ["lower tier cannot reach higher dance", { status: "active", tierRank: 1 }, 2, false],
    ["rank one below the gate", { status: "active", tierRank: 2 }, 3, false],
    // Status edges: all three access-granting statuses unlock within rank.
    ["trialing grants within rank", { status: "trialing", tierRank: 2 }, 2, true],
    ["past_due grants within rank", { status: "past_due", tierRank: 2 }, 2, true],
    // Canceled denies regardless of how high the Tier rank is.
    ["canceled denies within rank", { status: "canceled", tierRank: 3 }, 1, false],
    ["canceled denies at exact rank", { status: "canceled", tierRank: 2 }, 2, false],
  ];

  it.each(cases)("%s", (_label, entitlement, minTierRank, expected) => {
    expect(isEntitledTo(entitlement, { minTierRank })).toBe(expected);
  });
});
