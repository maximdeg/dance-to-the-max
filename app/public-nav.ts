import type { MessageKey } from "~/i18n/catalog";

/** A link in the shared public (pre-login) header menu. */
export type PublicNavLink = { readonly to: string; readonly labelKey: MessageKey };

/** The four marketing links carried by the public header, in menu order. */
export const publicNavLinks: readonly PublicNavLink[] = [
  { to: "/ballroom", labelKey: "nav.ballroom" },
  { to: "/nosotros", labelKey: "nav.about" },
  { to: "/comentarios", labelKey: "nav.comentarios" },
  { to: "/contacto", labelKey: "nav.contacto" },
];

/**
 * Exact pathnames rendered inside the public funnel layout — which supplies its
 * own header and language toggle. `root` uses this to suppress its global
 * toggle on these paths so a Visitor never sees two toggles.
 */
const publicPaths: ReadonlySet<string> = new Set([
  "/",
  "/ballroom",
  "/nosotros",
  "/comentarios",
  "/contacto",
]);

export const isPublicPath = (pathname: string): boolean =>
  publicPaths.has(pathname);
