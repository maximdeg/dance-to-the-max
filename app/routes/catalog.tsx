import { Form, Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { pick, levelLabel } from "~/i18n/content";
import { useLocale, useTranslate } from "~/i18n/context";
import { runtime } from "~/runtime.server";
import {
  listCatalogTags,
  listPublishedDances,
  searchPublishedVideos,
} from "~/services/Catalog";
import { LEVELS, type Level } from "~/services/Content";
import { isEntitledTo } from "~/services/Entitlement";
import { getEntitlement } from "~/services/Subscriptions";
import type { Route } from "./+types/catalog";

const asLevel = (value: string | null): Level | undefined =>
  LEVELS.includes(value as Level) ? (value as Level) : undefined;

export function meta() {
  return [{ title: "Catalog · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const url = new URL(request.url);
  const level = asLevel(url.searchParams.get("level"));
  const tagId = url.searchParams.get("tag") || undefined;
  const filtering = Boolean(level || tagId);

  const [published, tags, results, entitlement] = await Promise.all([
    runtime.runPromise(listPublishedDances()),
    runtime.runPromise(listCatalogTags()),
    filtering
      ? runtime.runPromise(searchPublishedVideos({ level, tagId }))
      : Promise.resolve(null),
    runtime.runPromise(getEntitlement(account.id)),
  ]);

  // Mark each Dance locked when the Subscriber's Tier doesn't reach it. The
  // publish rule already decided visibility; entitlement decides watchability.
  const dances = published.map((dance) => ({
    id: dance.id,
    nameEs: dance.nameEs,
    nameEn: dance.nameEn,
    minTierRank: dance.minTierRank,
    locked: !isEntitledTo(entitlement, dance),
  }));

  // `levels` is passed through the loader (rather than importing the Drizzle-
  // derived LEVELS into the component) so the schema/ORM stays out of the
  // client bundle.
  return {
    dances,
    tags,
    results,
    level: level ?? "",
    tagId: tagId ?? "",
    levels: LEVELS,
  };
}

export default function Catalog({ loaderData }: Route.ComponentProps) {
  const { dances, tags, results, level, tagId, levels } = loaderData;
  const t = useTranslate();
  const locale = useLocale();

  return (
    <main>
      <h1>{t("catalog.title")}</h1>

      <Form method="get">
        <label>
          {t("catalog.level")}
          <select name="level" defaultValue={level}>
            <option value="">{t("catalog.allLevels")}</option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {levelLabel(locale, lvl)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("catalog.tag")}
          <select name="tag" defaultValue={tagId}>
            <option value="">{t("catalog.allTags")}</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {pick(locale, tag.labelEs, tag.labelEn)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{t("catalog.filter")}</button>
        {results !== null ? (
          <Link to="/catalog">{t("catalog.clear")}</Link>
        ) : null}
      </Form>

      {results !== null ? (
        <section>
          <h2>{t("catalog.results")}</h2>
          {results.length === 0 ? (
            <p>{t("catalog.noResults")}</p>
          ) : (
            <ul>
              {results.map((video) => (
                <li key={video.id}>
                  <Link to={`/catalog/${video.danceId}`}>
                    {pick(locale, video.titleEs, video.titleEn)}
                  </Link>{" "}
                  — {pick(locale, video.danceNameEs, video.danceNameEn)} ·{" "}
                  {levelLabel(locale, video.level)}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section>
          <h2>{t("catalog.dances")}</h2>
          {dances.length === 0 ? (
            <p>{t("catalog.noDances")}</p>
          ) : (
            <ul>
              {dances.map((dance) => (
                <li key={dance.id}>
                  <Link to={`/catalog/${dance.id}`}>
                    {pick(locale, dance.nameEs, dance.nameEn)}
                  </Link>
                  {dance.locked ? (
                    <>
                      {" "}
                      🔒 <Link to="/pricing">{t("catalog.upgrade")}</Link>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
