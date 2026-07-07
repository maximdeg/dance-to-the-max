import { describe, expect, it } from "vitest";
import { levelLabel, pick } from "./content";

describe("pick", () => {
  it("selects the field for the active locale", () => {
    expect(pick("es", "Hola", "Hello")).toBe("Hola");
    expect(pick("en", "Hola", "Hello")).toBe("Hello");
  });
});

describe("levelLabel", () => {
  it("translates the fixed Level labels while values stay canonical", () => {
    expect(levelLabel("es", "primeras_veces")).toBe("Primeras veces");
    expect(levelLabel("en", "primeras_veces")).toBe("First Times");
    expect(levelLabel("es", "principiante")).toBe("Principiante");
    expect(levelLabel("en", "principiante")).toBe("Beginner");
    // "Max" is a brand term — the same in both locales.
    expect(levelLabel("es", "max")).toBe("Max");
    expect(levelLabel("en", "max")).toBe("Max");
  });
});
