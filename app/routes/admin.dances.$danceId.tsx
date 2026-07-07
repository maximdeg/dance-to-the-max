import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { requireSuperAdmin } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import {
  getDance,
  LEVELS,
  listTags,
  listVideosByDance,
  setVideoPublished,
  updateDance,
  type Level,
} from "~/services/Content";
import { createUploadedVideo } from "~/services/VideoIngest";
import type { Route } from "./+types/admin.dances.$danceId";

const LEVEL_LABELS: Record<Level, string> = {
  primeras_veces: "Primeras veces",
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
  max: "Max",
};

export function meta() {
  return [{ title: "Edit dance · Admin · Dance To the Max" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const dance = await runtime.runPromise(getDance(params.danceId));
  if (!dance) throw new Response("Not Found", { status: 404 });
  const [videos, tags] = await Promise.all([
    runtime.runPromise(listVideosByDance(dance.id)),
    runtime.runPromise(listTags()),
  ]);
  return { dance, videos, tags, levels: LEVELS };
}

export async function action({ request, params }: Route.ActionArgs) {
  await requireSuperAdmin(request);
  const danceId = params.danceId;
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "update-dance") {
    const nameEs = String(form.get("nameEs") ?? "").trim();
    const nameEn = String(form.get("nameEn") ?? "").trim();
    const historyEs = String(form.get("historyEs") ?? "").trim();
    const historyEn = String(form.get("historyEn") ?? "").trim();
    const minTierRank = Number(form.get("minTierRank") ?? 1);
    const published = form.get("published") === "on";
    if (!nameEs || !nameEn) {
      return { error: "Both names are required." };
    }
    const result = await runtime.runPromise(
      updateDance(danceId, {
        nameEs,
        nameEn,
        historyEs,
        historyEn,
        minTierRank,
        published,
      }).pipe(Effect.either),
    );
    return Either.isLeft(result)
      ? { error: "Could not update the dance." }
      : { ok: true };
  }

  if (intent === "toggle-video-publish") {
    const videoId = String(form.get("videoId") ?? "");
    const publish = form.get("publish") === "true";
    await runtime.runPromise(
      setVideoPublished(videoId, publish).pipe(Effect.either),
    );
    return { ok: true };
  }

  // intent === "create-video"
  const titleEs = String(form.get("titleEs") ?? "").trim();
  const titleEn = String(form.get("titleEn") ?? "").trim();
  const videoLevel = String(form.get("level") ?? "") as Level;
  if (!titleEs || !titleEn) {
    return { error: "Both titles are required." };
  }
  if (!LEVELS.includes(videoLevel)) {
    return { error: "Choose a level." };
  }

  const file = form.get("videoFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a video file to upload." };
  }
  const bytes = new Uint8Array(await file.arrayBuffer());

  const result = await runtime.runPromise(
    createUploadedVideo(
      {
        danceId,
        level: videoLevel,
        titleEs,
        titleEn,
        descriptionEs: String(form.get("descriptionEs") ?? ""),
        descriptionEn: String(form.get("descriptionEn") ?? ""),
        published: form.get("published") === "on",
        tagIds: form.getAll("tagIds").map(String),
      },
      { filename: file.name, contentType: file.type, bytes },
    ).pipe(Effect.either),
  );
  if (Either.isLeft(result)) {
    return {
      error:
        result.left._tag === "VideoIngestError"
          ? `Upload failed: ${result.left.reason}`
          : "Could not create the video.",
    };
  }
  return { ok: true };
}

export default function AdminDanceDetail({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { dance, videos, tags, levels } = loaderData;

  return (
    <main>
      <p>
        <Link to="/admin/dances">← All dances</Link>
      </p>
      <h1>
        {dance.nameEs} / {dance.nameEn}
      </h1>
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}

      <h2>Edit dance</h2>
      <Form method="post">
        <input type="hidden" name="intent" value="update-dance" />
        <label>
          Name (Spanish)
          <input type="text" name="nameEs" defaultValue={dance.nameEs} required />
        </label>
        <label>
          Name (English)
          <input type="text" name="nameEn" defaultValue={dance.nameEn} required />
        </label>
        <label>
          History (Spanish)
          <textarea name="historyEs" rows={3} defaultValue={dance.historyEs} />
        </label>
        <label>
          History (English)
          <textarea name="historyEn" rows={3} defaultValue={dance.historyEn} />
        </label>
        <label>
          Minimum tier
          <input
            type="number"
            name="minTierRank"
            min={1}
            max={3}
            defaultValue={dance.minTierRank}
            required
          />
        </label>
        <label>
          <input
            type="checkbox"
            name="published"
            defaultChecked={dance.published}
          />{" "}
          Published
        </label>
        <button type="submit">Save dance</button>
      </Form>

      <h2>Videos</h2>
      <table>
        <thead>
          <tr>
            <th>Level</th>
            <th>Title (es / en)</th>
            <th>Published</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {videos.map((video) => (
            <tr key={video.id}>
              <td>{LEVEL_LABELS[video.level]}</td>
              <td>
                <Link to={`/admin/videos/${video.id}`}>
                  {video.titleEs} / {video.titleEn}
                </Link>
              </td>
              <td>{video.published ? "Yes" : "Draft"}</td>
              <td>
                <Form method="post">
                  <input
                    type="hidden"
                    name="intent"
                    value="toggle-video-publish"
                  />
                  <input type="hidden" name="videoId" value={video.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={video.published ? "false" : "true"}
                  />
                  <button type="submit">
                    {video.published ? "Unpublish" : "Publish"}
                  </button>
                </Form>
              </td>
            </tr>
          ))}
          {videos.length === 0 ? (
            <tr>
              <td colSpan={4}>No videos yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h2>New video</h2>
      <Form method="post" encType="multipart/form-data">
        <input type="hidden" name="intent" value="create-video" />
        <label>
          Level
          <select name="level" defaultValue="">
            <option value="" disabled>
              Choose a level
            </option>
            {levels.map((lvl) => (
              <option key={lvl} value={lvl}>
                {LEVEL_LABELS[lvl]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Title (Spanish)
          <input type="text" name="titleEs" required />
        </label>
        <label>
          Title (English)
          <input type="text" name="titleEn" required />
        </label>
        <label>
          Description (Spanish)
          <textarea name="descriptionEs" />
        </label>
        <label>
          Description (English)
          <textarea name="descriptionEn" />
        </label>
        <label>
          Video file
          <input type="file" name="videoFile" accept="video/*" required />
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
                <input type="checkbox" name="tagIds" value={tag.id} />{" "}
                {tag.labelEs} / {tag.labelEn}
              </label>
            ))
          )}
        </fieldset>
        <label>
          <input type="checkbox" name="published" /> Published
        </label>
        <button type="submit">Create video</button>
      </Form>
    </main>
  );
}
