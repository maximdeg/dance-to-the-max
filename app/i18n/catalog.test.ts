import { describe, expect, it } from "vitest";
import { catalog, isLocale, locales, translate, type MessageKey } from "./catalog";

describe("translate", () => {
  it("resolves the same key differently per locale", () => {
    expect(translate("es", "home.tagline")).toBe("Aprendé a bailar con Max");
    expect(translate("en", "home.tagline")).toBe("Learn to dance with Max");
  });

  it("keeps brand strings stable across locales", () => {
    expect(translate("es", "app.name")).toBe("Dance To the Max");
    expect(translate("en", "app.name")).toBe("Dance To the Max");
  });

  it("translates the covered-flow chrome per locale", () => {
    expect(translate("es", "nav.catalog")).toBe("Catálogo");
    expect(translate("en", "nav.catalog")).toBe("Catalog");
    expect(translate("es", "catalog.noResults")).toBe(
      "No hay videos que coincidan con esos filtros.",
    );
    expect(translate("en", "catalog.noResults")).toBe(
      "No videos match those filters.",
    );
  });
});

describe("message catalog", () => {
  it("defines every key in every locale, none blank", () => {
    const keys = Object.keys(catalog.es) as MessageKey[];
    for (const locale of locales) {
      expect(Object.keys(catalog[locale]).sort()).toEqual([...keys].sort());
      for (const key of keys) {
        expect(catalog[locale][key]).toBeTruthy();
      }
    }
  });
});

describe("isLocale", () => {
  it("accepts supported locales and rejects others", () => {
    expect(isLocale("es")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
  });
});
