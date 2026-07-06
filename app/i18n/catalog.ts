export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];

// Spanish is the studio's primary language (Argentinian Spanish); English is the
// secondary locale. The full switcher + content localization lands in its own slice.
export const defaultLocale: Locale = "es";

/**
 * The message shape. Every locale must define every key, so a missing
 * translation is a type error rather than a runtime blank.
 */
export type Messages = {
  readonly "app.name": string;
  readonly "home.tagline": string;
  readonly "healthz.ok": string;
};

export type MessageKey = keyof Messages;

export const catalog: Record<Locale, Messages> = {
  es: {
    "app.name": "Dance To the Max",
    "home.tagline": "Aprendé a bailar con Max",
    "healthz.ok": "Todo en orden",
  },
  en: {
    "app.name": "Dance To the Max",
    "home.tagline": "Learn to dance with Max",
    "healthz.ok": "All systems go",
  },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function translate(locale: Locale, key: MessageKey): string {
  return catalog[locale][key] ?? catalog[defaultLocale][key];
}
