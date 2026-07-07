import { describe, expect, it } from "vitest";
import { serializeLocale } from "~/i18n/locale.server";
import { loader as ballroomLoader } from "./ballroom";
import { loader as comentariosLoader } from "./comentarios";
import { loader as contactoLoader } from "./contacto";
import { loader as homeLoader } from "./home";
import { loader as nosotrosLoader } from "./nosotros";
import { loader as publicLayoutLoader } from "./public-layout";

/** The public marketing loaders, narrowed to what these tests call. */
type LocaleLoader = (args: { request: Request }) => Promise<{ locale: string }>;

const marketingLoaders: ReadonlyArray<[string, LocaleLoader]> = [
  ["public layout", publicLayoutLoader as unknown as LocaleLoader],
  ["/ballroom", ballroomLoader as unknown as LocaleLoader],
  ["/nosotros", nosotrosLoader as unknown as LocaleLoader],
  ["/comentarios", comentariosLoader as unknown as LocaleLoader],
  ["/contacto", contactoLoader as unknown as LocaleLoader],
];

const request = (cookie?: string): Request =>
  new Request("https://app.test/", cookie ? { headers: { Cookie: cookie } } : {});

const asRequestCookie = (setCookie: string): string =>
  setCookie.split(";")[0] ?? "";

describe("public marketing pages", () => {
  // "Reachable without auth" is proven by the loader resolving (no redirect
  // thrown) for an unauthenticated request; "renders per Locale" by it
  // returning the cookie's Locale, which drives every t() on the page.
  it.each(marketingLoaders)(
    "%s is reachable without auth and follows the selected locale",
    async (_path, loader) => {
      const es = await loader({ request: request() });
      expect(es.locale).toBe("es");

      const enCookie = asRequestCookie(await serializeLocale("en"));
      const en = await loader({ request: request(enCookie) });
      expect(en.locale).toBe("en");
    },
  );

  it("the landing (/) is reachable without auth — a Visitor has no account", async () => {
    const result = await (
      homeLoader as unknown as (args: {
        request: Request;
      }) => Promise<{ account: unknown }>
    )({ request: request() });
    expect(result.account).toBeNull();
  });
});
