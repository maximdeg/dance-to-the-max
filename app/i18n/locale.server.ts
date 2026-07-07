import { createCookie } from "react-router";
import { defaultLocale, isLocale, type Locale } from "./catalog";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * The Locale preference cookie. Long-lived so the choice persists across
 * visits; read server-side (loaders) to drive the whole render, so it's
 * httpOnly — the client never needs to read it.
 */
export const localeCookie = createCookie("locale", {
  path: "/",
  sameSite: "lax",
  httpOnly: true,
  maxAge: ONE_YEAR_SECONDS,
});

/** The request's chosen Locale, falling back to the default when unset/invalid. */
export async function getLocale(request: Request): Promise<Locale> {
  try {
    const value = await localeCookie.parse(request.headers.get("Cookie"));
    return typeof value === "string" && isLocale(value) ? value : defaultLocale;
  } catch {
    // A malformed/undecodable cookie must not break the page.
    return defaultLocale;
  }
}

/** A `Set-Cookie` value that persists `locale` as the preference. */
export function serializeLocale(locale: Locale): Promise<string> {
  return localeCookie.serialize(locale);
}
