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
  // Public marketing site (pre-login).
  readonly "nav.ballroom": string;
  readonly "nav.about": string;
  readonly "nav.comentarios": string;
  readonly "nav.contacto": string;
  readonly "nav.ingresar": string;
  readonly "nav.menu": string;
  readonly "nav.primary": string;
  readonly "cta.startFree": string;
  readonly "cta.seePlans": string;
  readonly "cta.prompt": string;
  readonly "landing.lead": string;
  readonly "landing.forWho": string;
  readonly "landing.explore": string;
  readonly "ballroom.heading": string;
  readonly "ballroom.p1": string;
  readonly "ballroom.p2": string;
  readonly "ballroom.p3": string;
  readonly "ballroom.dancesTitle": string;
  readonly "about.heading": string;
  readonly "about.p1": string;
  readonly "about.p2": string;
  readonly "comentarios.heading": string;
  readonly "comentarios.lead": string;
  readonly "contacto.heading": string;
  readonly "contacto.lead": string;
  // Home funnel (pre-login).
  readonly "home.hero.title": string;
  readonly "home.valueProp.title": string;
  readonly "home.sampler.title": string;
  readonly "home.sampler.unlockWith": string;
  readonly "home.plans.title": string;
  readonly "home.plans.subtitle": string;
  readonly "home.plans.monthly": string;
  readonly "home.plans.annual": string;
  readonly "home.plans.perMonth": string;
  readonly "home.plans.perYear": string;
  readonly "home.plans.save": string;
  readonly "home.plans.includes": string;
  readonly "home.testimonials.title": string;
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
  // Comments.
  readonly "comments.title": string;
  readonly "comments.placeholder": string;
  readonly "comments.post": string;
  readonly "comments.empty": string;
  readonly "comments.reply": string;
  readonly "comments.replyPlaceholder": string;
  readonly "comments.delete": string;
  readonly "comments.studio": string;
  readonly "comments.you": string;
  readonly "comments.someone": string;
  readonly "comments.error": string;
  readonly "comments.hide": string;
  readonly "comments.unhide": string;
  readonly "comments.remove": string;
  readonly "comments.report": string;
  readonly "comments.hidden": string;
  readonly "comments.reported": string;
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
    "nav.ballroom": "Qué es el ballroom",
    "nav.about": "Nosotros",
    "nav.comentarios": "Comentarios",
    "nav.contacto": "Contacto",
    "nav.ingresar": "Ingresar",
    "nav.menu": "Menú",
    "nav.primary": "Navegación principal",
    "cta.startFree": "Empezá gratis",
    "cta.seePlans": "Ver planes",
    "cta.prompt": "¿Listo para dar el primer paso?",
    "landing.lead":
      "Clases de baile de salón en video, guiadas por Max: a tu ritmo y desde donde estés.",
    "landing.forWho":
      "Desde tus primeras veces hasta el nivel Max, seguí cada danza paso a paso y desbloqueá más a medida que avanzás.",
    "landing.explore": "Conocé más",
    "ballroom.heading": "Qué es el ballroom",
    "ballroom.p1":
      "El baile de salón —ballroom— es un conjunto de danzas en pareja que se bailan en pista, con roles de guía y seguimiento y una conexión que se siente en cada paso.",
    "ballroom.p2":
      "Nació en los salones europeos de los siglos XVIII y XIX y se fue nutriendo de ritmos de todo el mundo, del vals vienés al tango rioplatense, hasta volverse el repertorio elegante y variado que conocemos hoy.",
    "ballroom.p3":
      "En Dance To the Max lo aprendés por danza y por nivel, con videos que podés repetir las veces que quieras.",
    "ballroom.dancesTitle": "Las danzas del ballroom",
    "about.heading": "Hola, soy Max",
    "about.p1":
      "Bailo y enseño baile de salón desde hace más de veinte años, en pistas, escenarios y salones de práctica de todo el país.",
    "about.p2":
      "Creé Dance To the Max para que cualquiera pueda aprender a bailar con buena técnica y a su propio ritmo, viva donde viva. Cada video es la clase que me hubiese gustado tener cuando empecé.",
    "comentarios.heading": "Comentarios",
    "comentarios.lead": "Lo que dicen quienes ya bailan con Max.",
    "contacto.heading": "Contacto",
    "contacto.lead": "¿Tenés una duda? Ponete en contacto con el estudio.",
    "home.hero.title": "Aprendé a bailar de salón con Max",
    "home.valueProp.title": "¿Por qué Dance To the Max?",
    "home.sampler.title": "Las danzas que vas a aprender",
    "home.sampler.unlockWith": "Desbloqueás con",
    "home.plans.title": "Elegí tu plan",
    "home.plans.subtitle": "Todos los planes arrancan con una prueba gratis.",
    "home.plans.monthly": "Mensual",
    "home.plans.annual": "Anual",
    "home.plans.perMonth": "/mes",
    "home.plans.perYear": "/año",
    "home.plans.save": "Ahorrás",
    "home.plans.includes": "Incluye",
    "home.testimonials.title": "Lo que dicen quienes bailan con Max",
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
    "comments.title": "Comentarios",
    "comments.placeholder": "Escribí un comentario…",
    "comments.post": "Comentar",
    "comments.empty": "Todavía no hay comentarios. ¡Sé el primero!",
    "comments.reply": "Responder",
    "comments.replyPlaceholder": "Responder como el estudio…",
    "comments.delete": "Eliminar",
    "comments.studio": "Estudio",
    "comments.you": "Vos",
    "comments.someone": "Suscriptor",
    "comments.error": "No se pudo completar la acción.",
    "comments.hide": "Ocultar",
    "comments.unhide": "Mostrar",
    "comments.remove": "Eliminar",
    "comments.report": "Reportar",
    "comments.hidden": "(oculto)",
    "comments.reported": "reportes",
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
    "nav.ballroom": "What is ballroom",
    "nav.about": "About Max",
    "nav.comentarios": "Testimonials",
    "nav.contacto": "Contact",
    "nav.ingresar": "Log in",
    "nav.menu": "Menu",
    "nav.primary": "Main navigation",
    "cta.startFree": "Start free",
    "cta.seePlans": "See plans",
    "cta.prompt": "Ready to take the first step?",
    "landing.lead":
      "Ballroom dance classes on video, guided by Max — at your pace, from anywhere.",
    "landing.forWho":
      "From your first steps to the Max level, follow each dance step by step and unlock more as you progress.",
    "landing.explore": "Learn more",
    "ballroom.heading": "What is ballroom",
    "ballroom.p1":
      "Ballroom is a family of partner dances performed on the floor, with a lead and a follow and a connection you feel in every step.",
    "ballroom.p2":
      "It grew out of the European ballrooms of the 18th and 19th centuries and drew in rhythms from around the world — from the Viennese waltz to the Río de la Plata tango — becoming the elegant, varied repertoire we know today.",
    "ballroom.p3":
      "At Dance To the Max you learn it dance by dance and level by level, with videos you can replay as many times as you like.",
    "ballroom.dancesTitle": "The dances of ballroom",
    "about.heading": "Hi, I'm Max",
    "about.p1":
      "I've danced and taught ballroom for over twenty years — on competition floors, on stage, and in practice halls across the country.",
    "about.p2":
      "I built Dance To the Max so anyone can learn to dance with solid technique at their own pace, wherever they live. Every video is the class I wish I'd had when I started.",
    "comentarios.heading": "Testimonials",
    "comentarios.lead": "What dancers who already train with Max are saying.",
    "contacto.heading": "Contact",
    "contacto.lead": "Have a question? Get in touch with the studio.",
    "home.hero.title": "Learn ballroom dancing with Max",
    "home.valueProp.title": "Why Dance To the Max?",
    "home.sampler.title": "The dances you'll learn",
    "home.sampler.unlockWith": "Unlock with",
    "home.plans.title": "Choose your plan",
    "home.plans.subtitle": "Every plan starts with a free trial.",
    "home.plans.monthly": "Monthly",
    "home.plans.annual": "Annual",
    "home.plans.perMonth": "/mo",
    "home.plans.perYear": "/yr",
    "home.plans.save": "Save",
    "home.plans.includes": "Includes",
    "home.testimonials.title": "What dancers who train with Max say",
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
    "comments.title": "Comments",
    "comments.placeholder": "Write a comment…",
    "comments.post": "Post comment",
    "comments.empty": "No comments yet. Be the first!",
    "comments.reply": "Reply",
    "comments.replyPlaceholder": "Reply as the studio…",
    "comments.delete": "Delete",
    "comments.studio": "Studio",
    "comments.you": "You",
    "comments.someone": "Subscriber",
    "comments.error": "Couldn't complete that action.",
    "comments.hide": "Hide",
    "comments.unhide": "Unhide",
    "comments.remove": "Remove",
    "comments.report": "Report",
    "comments.hidden": "(hidden)",
    "comments.reported": "reports",
  },
};

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export function translate(locale: Locale, key: MessageKey): string {
  return catalog[locale][key] ?? catalog[defaultLocale][key];
}
