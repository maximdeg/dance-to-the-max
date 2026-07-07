import { useState } from "react";
import { Link } from "react-router";
import type { Locale } from "~/i18n/catalog";
import { useTranslate } from "~/i18n/context";
import { publicNavLinks } from "~/public-nav";
import { LanguageSwitcher } from "./LanguageSwitcher";

/**
 * The persistent pre-login header. Carries the four marketing links, the ES/EN
 * toggle, an Ingresar (login) link, and the primary "Empezá" CTA into signup.
 *
 * On wide screens the whole menu is visible; below the breakpoint it collapses
 * behind an accessible toggle button (`aria-expanded` / `aria-controls`). CSS
 * (`.public-header`) keeps the button hidden on desktop.
 */
export function PublicHeader({
  current,
  authenticated = false,
}: {
  current: Locale;
  authenticated?: boolean;
}) {
  const t = useTranslate();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="public-header">
      <Link to="/" className="public-header__brand" onClick={close}>
        {t("app.name")}
      </Link>

      <button
        type="button"
        className="public-header__toggle"
        aria-expanded={open}
        aria-controls="public-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {t("nav.menu")}
      </button>

      <div id="public-menu" className="public-header__menu" data-open={open}>
        <nav aria-label={t("nav.primary")} className="public-header__nav">
          {publicNavLinks.map((link) => (
            <Link key={link.to} to={link.to} onClick={close}>
              {t(link.labelKey)}
            </Link>
          ))}
        </nav>

        <div className="public-header__actions">
          <LanguageSwitcher current={current} />
          {authenticated ? null : (
            <>
              <Link
                to="/login"
                className="public-header__login"
                onClick={close}
              >
                {t("nav.ingresar")}
              </Link>
              <Link to="/signup" className="public-header__cta" onClick={close}>
                {t("cta.startFree")}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
