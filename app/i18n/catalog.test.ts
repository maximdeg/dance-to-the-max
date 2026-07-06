import { describe, expect, it } from "vitest";
import { isLocale, translate } from "./catalog";

describe("translate", () => {
  it("resolves the same key differently per locale", () => {
    expect(translate("es", "home.tagline")).toBe("Aprendé a bailar con Max");
    expect(translate("en", "home.tagline")).toBe("Learn to dance with Max");
  });

  it("keeps brand strings stable across locales", () => {
    expect(translate("es", "app.name")).toBe("Dance To the Max");
    expect(translate("en", "app.name")).toBe("Dance To the Max");
  });
});

describe("isLocale", () => {
  it("accepts supported locales and rejects others", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});
