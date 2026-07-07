import type { Locale } from "./catalog";

/**
 * A curated, Visitor-facing quote of praise shown on the public site (the Home
 * funnel strip and the Comentarios page). Marketing content authored by staff —
 * not a Subscriber-posted Comment. Lives here alongside the string catalog so it
 * stays bilingual (voseo ES / EN); `attribution` is a locale-neutral name.
 */
export interface Testimonial {
  readonly id: string;
  readonly quote: Record<Locale, string>;
  readonly attribution: string;
}

export const testimonials: readonly Testimonial[] = [
  {
    id: "sofia",
    quote: {
      es: "Nunca había bailado y en unas semanas ya me animé a salir a la pista. Las clases van al detalle y las repetís las veces que quieras.",
      en: "I'd never danced, and within weeks I felt ready to step onto the floor. The lessons go into detail and you can replay them as many times as you like.",
    },
    attribution: "Sofía, Córdoba",
  },
  {
    id: "marcelo",
    quote: {
      es: "Con mi pareja practicábamos para el casamiento y Max nos salvó. Aprender desde casa, a nuestro ritmo, cambió todo.",
      en: "My partner and I were practicing for our wedding and Max saved us. Learning from home, at our own pace, changed everything.",
    },
    attribution: "Marcelo y Ana, Rosario",
  },
  {
    id: "lucia",
    quote: {
      es: "Bailo hace años y aun así encontré un montón para pulir. La progresión por nivel está muy bien pensada.",
      en: "I've danced for years and still found plenty to polish. The level-by-level progression is really well thought out.",
    },
    attribution: "Lucía, Buenos Aires",
  },
];
