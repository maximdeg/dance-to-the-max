import { Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { pick, levelLabel } from "~/i18n/content";
import { useLocale, useTranslate } from "~/i18n/context";
import { runtime } from "~/runtime.server";
import { getPublishedDanceWithVideos } from "~/services/Catalog";
import { isEntitledTo } from "~/services/Entitlement";
import { getEntitlement } from "~/services/Subscriptions";
import type { Route } from "./+types/catalog.$danceId";

export function meta() {
  return [{ title: "Dance · Catalog · Dance To the Max" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const catalog = await runtime.runPromise(
    getPublishedDanceWithVideos(params.danceId),
  );
  // Hidden from the Catalog (unpublished, or no published Videos) → 404.
  if (!catalog) throw new Response("Not Found", { status: 404 });

  const entitlement = await runtime.runPromise(getEntitlement(account.id));
  const locked = !isEntitledTo(entitlement, catalog.dance);
  return { catalog, locked };
}

export default function CatalogDance({ loaderData }: Route.ComponentProps) {
  const { catalog, locked } = loaderData;
  const { dance, groups } = catalog;
  const t = useTranslate();
  const locale = useLocale();

  return (
    <main>
      <p>
        <Link to="/catalog">{t("catalog.back")}</Link>
      </p>
      <h1>{pick(locale, dance.nameEs, dance.nameEn)}</h1>

      {locked ? (
        <section>
          <p>
            🔒 {t("dance.locked")}
            {dance.minTierRank > 1 ? ` (T${dance.minTierRank})` : ""}
          </p>
          <p>
            <Link to="/pricing">{t("dance.seePlans")}</Link>
          </p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.level}>
            <h2>{levelLabel(locale, group.level)}</h2>
            <ul>
              {group.videos.map((video) => {
                const description = pick(
                  locale,
                  video.descriptionEs,
                  video.descriptionEn,
                );
                return (
                  <li key={video.id}>
                    <Link to={`/catalog/${dance.id}/${video.id}`}>
                      <strong>
                        {pick(locale, video.titleEs, video.titleEn)}
                      </strong>
                    </Link>
                    {description ? <p>{description}</p> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
