import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { requireSuperAdmin } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import {
  getVideo,
  LEVELS,
  listDances,
  listTags,
  updateVideo,
  type Level,
} from "~/services/Content";
import type { Route } from "./+types/admin.videos.$videoId";

const LEVEL_LABELS: Record<Level, string> = {
  primeras_veces: "Primeras veces",
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  max: "Max",
};

export function meta() {
  return [{ title: "Edit video · Admin · Dance To the Max" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const video = await runtime.runPromise(getVideo(params.videoId));
  if (!video) throw new Response("Not Found", { status: 404 });
  const [dances, tags] = await Promise.all([
    runtime.runPromise(listDances()),
    runtime.runPromise(listTags()),
  ]);
  return { video, dances, tags, levels: LEVELS };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireSuperAdmin(request);
  const form = await request.formData();

  const danceId = String(form.get("danceId") ?? "");
  const videoLevel = String(form.get("level") ?? "") as Level;
  const titleEs = String(form.get("titleEs") ?? "").trim();
  const titleEn = String(form.get("titleEn") ?? "").trim();
  if (!danceId) return { error: "Choose a dance." };
  if (!LEVELS.includes(videoLevel)) return { error: "Choose a level." };
  if (!titleEs || !titleEn) return { error: "Both titles are required." };

  const result = await runtime.runPromise(
    updateVideo(params.videoId, {
      danceId,
      level: videoLevel,
      titleEs,
      titleEn,
      descriptionEs: String(form.get("descriptionEs") ?? ""),
      descriptionEn: String(form.get("descriptionEn") ?? ""),
      providerAssetId: String(form.get("providerAssetId") ?? "").trim(),
      published: form.get("published") === "on",
      tagIds: form.getAll("tagIds").map(String),
    }).pipe(Effect.either),
  );
  return Either.isLeft(result)
    ? { error: "Could not update the video." }
    : { ok: true };
}

export default function AdminVideoEdit({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { video, dances, tags, levels } = loaderData;
  const selectedTagIds = new Set(video.tags.map((tag) => tag.id));

  return (
    <main>
      <p>
        <Link to={`/admin/dances/${video.danceId}`}>← Back to dance</Link>
      </p>
      <h1>
        Edit video: {video.titleEs} / {video.titleEn}
      </h1>
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
      {actionData?.ok ? <p role="status">Saved.</p> : null}

      <Form method="post">
        <label>
          Dance
          <select name="danceId" defaultValue={video.danceId}>
            {dances.map((dance) => (
              <option key={dance.id} value={dance.id}>
                {dance.nameEs} / {dance.nameEn}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select name="level" defaultValue={video.level}>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_LABELS[lvl]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title (Spanish)
          <input type="text" name="titleEs" defaultValue={video.titleEs} required />
        </label>
        <label>
          Title (English)
          <input type="text" name="titleEn" defaultValue={video.titleEn} required />
        </label>
        <label>
          Description (Spanish)
          <textarea name="descriptionEs" defaultValue={video.descriptionEs} />
        </label>
        <label>
          Description (English)
          <textarea name="descriptionEn" defaultValue={video.descriptionEn} />
        </label>
        <label>
          Provider asset id
          <input
            type="text"
            name="providerAssetId"
            defaultValue={video.providerAssetId}
          />
        </label>
        <fieldset>
          <legend>Tags</legend>
          {tags.length === 0 ? (
            <p>
              No tags yet — <Link to="/admin/tags">create some</Link>.
            </p>
          ) : (
            tags.map((tag) => (
              <label key={tag.id}>
                <input
                  type="checkbox"
                  name="tagIds"
                  value={tag.id}
                  defaultChecked={selectedTagIds.has(tag.id)}
                />{" "}
                {tag.labelEs} / {tag.labelEn}
              </label>
            ))
          )}
        </fieldset>
        <label>
          <input
            type="checkbox"
            name="published"
            defaultChecked={video.published}
          />{" "}
          Published
        </label>
        <button type="submit">Save video</button>
      </Form>
    </main>
  );
}
