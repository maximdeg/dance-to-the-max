import { Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { getPublishedDanceWithVideos } from "~/services/Catalog";
import type { Level } from "~/services/Content";
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
  await requireAccount(request);
  const catalog = await runtime.runPromise(
    getPublishedDanceWithVideos(params.danceId),
  );
  // Hidden from the Catalog (unpublished, or no published Videos) → 404.
  if (!catalog) throw new Response("Not Found", { status: 404 });
  return { catalog };
}

export default function CatalogDance({ loaderData }: Route.ComponentProps) {
  const { dance, groups } = loaderData.catalog;

  return (
    <main>
      <p>
        <Link to="/catalog">← Catalog</Link>
      </p>
      <h1>
        {dance.nameEs} / {dance.nameEn}
      </h1>

      {groups.map((group) => (
        <section key={group.level}>
          <h2>{LEVEL_LABELS[group.level]}</h2>
          <ul>
            {group.videos.map((video) => (
              <li key={video.id}>
                <strong>
                  {video.titleEs} / {video.titleEn}
                </strong>
                {video.descriptionEs ? <p>{video.descriptionEs}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
