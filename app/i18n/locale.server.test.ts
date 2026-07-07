import { describe, expect, it } from "vitest";
import { getLocale, localeCookie, serializeLocale } from "./locale.server";

const requestWithCookie = (cookie: string | null): Request =>
  new Request("https://app.test/", cookie ? { headers: { Cookie: cookie } } : {});

/** Turn a `Set-Cookie` value into the `name=value` a request Cookie header wants. */
const asRequestCookie = (setCookie: string): string =>
  setCookie.split(";")[0] ?? "";

describe("getLocale", () => {
  it("defaults to Spanish when no cookie is present", async () => {
    expect(await getLocale(requestWithCookie(null))).toBe("es");
  });

  it("round-trips a chosen locale through the cookie", async () => {
    const cookie = asRequestCookie(await serializeLocale("en"));
    expect(await getLocale(requestWithCookie(cookie))).toBe("en");

    const back = asRequestCookie(await serializeLocale("es"));
    expect(await getLocale(requestWithCookie(back))).toBe("es");
  });

  it("falls back to the default for an unsupported locale value", async () => {
    // A well-formed cookie whose value isn't a supported Locale.
    const cookie = asRequestCookie(await localeCookie.serialize("fr"));
    expect(await getLocale(requestWithCookie(cookie))).toBe("es");
  });

  it("falls back to the default for a malformed cookie", async () => {
    expect(await getLocale(requestWithCookie("locale=%%bogus%%"))).toBe("es");
  });
});
