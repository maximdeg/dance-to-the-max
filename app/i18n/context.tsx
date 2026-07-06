import { createContext, useContext } from "react";
import {
  defaultLocale,
  translate,
  type Locale,
  type MessageKey,
} from "./catalog";

const LocaleContext = createContext<Locale>(defaultLocale);

export const LocaleProvider = LocaleContext.Provider;

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** Returns a `t(key)` function bound to the active locale. */
export function useTranslate(): (key: MessageKey) => string {
  const locale = useLocale();
  return (key) => translate(locale, key);
}
