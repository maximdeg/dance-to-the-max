import { Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { getPublishedDanceWithVideos } from "~/services/Catalog";
import type { Level } from "~/services/Content";
import { isEntitledTo } from "~/services/Entitlement";
import { getEntitlement } from "~/services/Subscriptions";
import type { Route } from "./+types/catalog.$danceId";

const LEVEL_LABELS: Record<Level, string> = {
  primeras_veces: "Primeras veces",
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  max: "Max",
};

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

  return (
    <main>
      <p>
        <Link to="/catalog">← Catalog</Link>
      </p>
      <h1>
        {dance.nameEs} / {dance.nameEn}
      </h1>

      {locked ? (
        <section>
          <p>
            🔒 This dance isn't included in your current plan
            {dance.minTierRank > 1 ? ` (requires Tier ${dance.minTierRank})` : ""}
            .
          </p>
          <p>
            <Link to="/pricing">See plans to unlock it</Link>
          </p>
        </section>
      ) : (
        groups.map((group) => (
          <section key={group.level}>
            <h2>{LEVEL_LABELS[group.level]}</h2>
            <ul>
              {group.videos.map((video) => (
                <li key={video.id}>
                  <Link to={`/catalog/${dance.id}/${video.id}`}>
                    <strong>
                      {video.titleEs} / {video.titleEn}
                    </strong>
                  </Link>
                  {video.descriptionEs ? <p>{video.descriptionEs}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
