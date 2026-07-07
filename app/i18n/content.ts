import type { Level } from "~/services/Content";
import type { Locale } from "./catalog";

/**
 * Choose the field for the active Locale from a per-Locale pair. Content
 * metadata (Dance names, Video titles/descriptions, Tag labels) is stored in
 * both languages (ADR-0005); this is how a component renders just the chosen
 * one. Type-only import of `Level`, so no schema/ORM reaches the client bundle.
 */
export const pick = (locale: Locale, es: string, en: string): string =>
  locale === "en" ? en : es;

/**
 * Display labels for the fixed Levels. The underlying Level *values* stay
 * canonical (`primeras_veces` … `max`); only their labels are translated.
 */
export const LEVEL_LABELS: Record<Locale, Record<Level, string>> = {
  es: {
    primeras_veces: "Primeras veces",
    principiante: "Principiante",
    intermedio: "Intermedio",
    avanzado: "Avanzado",
    max: "Max",
  },
  en: {
    primeras_veces: "First Times",
    principiante: "Beginner",
    intermedio: "Intermediate",
    avanzado: "Advanced",
    max: "Max",
  },
};

export const levelLabel = (locale: Locale, level: Level): string =>
  LEVEL_LABELS[locale][level];
