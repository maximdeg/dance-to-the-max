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
  // Global navigation / language switcher.
  readonly "nav.catalog": string;
  readonly "nav.plans": string;
  readonly "nav.login": string;
  readonly "nav.signup": string;
  readonly "nav.logout": string;
  readonly "nav.changePassword": string;
  readonly "nav.manageContent": string;
  readonly "nav.language": string;
  // Home.
  readonly "home.signedInAs": string;
  readonly "home.browseCatalog": string;
  // Catalog.
  readonly "catalog.title": string;
  readonly "catalog.level": string;
  readonly "catalog.tag": string;
  readonly "catalog.allLevels": string;
  readonly "catalog.allTags": string;
  readonly "catalog.filter": string;
  readonly "catalog.clear": string;
  readonly "catalog.results": string;
  readonly "catalog.noResults": string;
  readonly "catalog.dances": string;
  readonly "catalog.noDances": string;
  readonly "catalog.upgrade": string;
  readonly "catalog.back": string;
  // Dance detail.
  readonly "dance.locked": string;
  readonly "dance.seePlans": string;
  // Watch.
  readonly "watch.back": string;
  readonly "watch.linkExpires": string;
  readonly "watch.unsupported": string;
};

export type MessageKey = keyof Messages;

export const catalog: Record<Locale, Messages> = {
  es: {
    "app.name": "Dance To the Max",
    "home.tagline": "Aprendé a bailar con Max",
    "healthz.ok": "Todo en orden",
    "nav.catalog": "Catálogo",
    "nav.plans": "Planes",
    "nav.login": "Iniciá sesión",
    "nav.signup": "Registrate",
    "nav.logout": "Cerrar sesión",
    "nav.changePassword": "Cambiar contraseña",
    "nav.manageContent": "Gestionar contenido",
    "nav.language": "Idioma",
    "home.signedInAs": "Sesión iniciada como",
    "home.browseCatalog": "Explorá el catálogo",
    "catalog.title": "Catálogo",
    "catalog.level": "Nivel",
    "catalog.tag": "Etiqueta",
    "catalog.allLevels": "Todos los niveles",
    "catalog.allTags": "Todas las etiquetas",
    "catalog.filter": "Filtrar",
    "catalog.clear": "Limpiar",
    "catalog.results": "Resultados",
    "catalog.noResults": "No hay videos que coincidan con esos filtros.",
    "catalog.dances": "Danzas",
    "catalog.noDances": "Todavía no hay danzas disponibles.",
    "catalog.upgrade": "Mejorá tu plan para desbloquear",
    "catalog.back": "← Catálogo",
    "dance.locked": "Esta danza no está incluida en tu plan actual.",
    "dance.seePlans": "Ver planes para desbloquearla",
    "watch.back": "← Volver a la danza",
    "watch.linkExpires": "El enlace de reproducción vence a las",
    "watch.unsupported": "Tu navegador no admite el elemento de video.",
  },
  en: {
    "app.name": "Dance To the Max",
    "home.tagline": "Learn to dance with Max",
    "healthz.ok": "All systems go",
    "nav.catalog": "Catalog",
    "nav.plans": "Plans",
    "nav.login": "Log in",
    "nav.signup": "Sign up",
    "nav.logout": "Log out",
    "nav.changePassword": "Change password",
    "nav.manageContent": "Manage content",
    "nav.language": "Language",
    "home.signedInAs": "Signed in as",
    "home.browseCatalog": "Browse the catalog",
    "catalog.title": "Catalog",
    "catalog.level": "Level",
    "catalog.tag": "Tag",
    "catalog.allLevels": "All levels",
    "catalog.allTags": "All tags",
    "catalog.filter": "Filter",
    "catalog.clear": "Clear",
    "catalog.results": "Results",
    "catalog.noResults": "No videos match those filters.",
    "catalog.dances": "Dances",
    "catalog.noDances": "No dances are available yet.",
    "catalog.upgrade": "Upgrade to unlock",
    "catalog.back": "← Catalog",
    "dance.locked": "This dance isn't included in your current plan.",
    "dance.seePlans": "See plans to unlock it",
    "watch.back": "← Back to dance",
    "watch.linkExpires": "Playback link expires at",
    "watch.unsupported": "Your browser doesn't support the video element.",
  },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function translate(locale: Locale, key: MessageKey): string {
  return catalog[locale][key] ?? catalog[defaultLocale][key];
}
