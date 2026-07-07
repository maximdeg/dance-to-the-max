import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { isStaff } from "~/auth/roles";
import { pick } from "~/i18n/content";
import { useLocale, useTranslate } from "~/i18n/context";
import { runtime } from "~/runtime.server";
import {
  deleteComment,
  listThread,
  postComment,
  replyToComment,
} from "~/services/Comments";
import { getPlayback } from "~/services/Playback";
import type { Route } from "./+types/catalog.$danceId.$videoId";

export function meta() {
  return [{ title: "Watch · Dance To the Max" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const playbackResult = await runtime.runPromise(
    getPlayback(account.id, params.videoId).pipe(Effect.either),
  );

  // A hidden/absent Video is a 404. A Tier that doesn't reach it is a soft wall;
  // the thread may still be readable (staff), so it's loaded independently.
  if (
    Either.isLeft(playbackResult) &&
    playbackResult.left.reason === "not_found"
  ) {
    throw new Response("Not Found", { status: 404 });
  }
  const entitled = Either.isRight(playbackResult);

  const threadResult = await runtime.runPromise(
    listThread(account.id, params.videoId).pipe(Effect.either),
  );
  const thread = Either.isRight(threadResult)
    ? threadResult.right.map((comment) => ({
        id: comment.id,
        authorId: comment.authorId,
        body: comment.body,
        createdAt: comment.createdAt.toISOString(),
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          body: reply.body,
          createdAt: reply.createdAt.toISOString(),
        })),
      }))
    : null;

  return {
    danceId: params.danceId,
    locked: !entitled,
    video: entitled
      ? {
          titleEs: playbackResult.right.video.titleEs,
          titleEn: playbackResult.right.video.titleEn,
          descriptionEs: playbackResult.right.video.descriptionEs,
          descriptionEn: playbackResult.right.video.descriptionEn,
        }
      : null,
    playback: entitled
      ? {
          url: playbackResult.right.signedUrl.url,
          expiresAt: playbackResult.right.signedUrl.expiresAt.toISOString(),
        }
      : null,
    thread,
    canComment: entitled,
    isStaff: isStaff(account.role),
    currentAccountId: account.id,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const account = await requireAccount(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "comment") {
    const body = String(form.get("body") ?? "").trim();
    if (!body) return { error: true as const };
    const result = await runtime.runPromise(
      postComment(account.id, params.videoId, body).pipe(Effect.either),
    );
    return { error: Either.isLeft(result) };
  }

  if (intent === "reply") {
    const commentId = String(form.get("commentId") ?? "");
    const body = String(form.get("body") ?? "").trim();
    if (!body) return { error: true as const };
    const result = await runtime.runPromise(
      replyToComment(account.id, commentId, body).pipe(Effect.either),
    );
    return { error: Either.isLeft(result) };
  }

  if (intent === "delete") {
    const commentId = String(form.get("commentId") ?? "");
    const result = await runtime.runPromise(
      deleteComment(account.id, commentId).pipe(Effect.either),
    );
    return { error: Either.isLeft(result) };
  }

  return { error: true as const };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default function WatchVideo({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const {
    danceId,
    video,
    playback,
    thread,
    canComment,
    isStaff: viewerIsStaff,
    currentAccountId,
  } = loaderData;
  const t = useTranslate();
  const locale = useLocale();
  const description = video
    ? pick(locale, video.descriptionEs, video.descriptionEn)
    : "";

  return (
    <main>
      <p>
        <Link to={`/catalog/${danceId}`}>{t("watch.back")}</Link>
      </p>

      {video && playback ? (
        <>
          <h1>{pick(locale, video.titleEs, video.titleEn)}</h1>
          <video controls src={playback.url}>
            {t("watch.unsupported")}
          </video>
          {description ? <p>{description}</p> : null}
          <p>
            <small>
              {t("watch.linkExpires")}{" "}
              {new Date(playback.expiresAt).toLocaleTimeString()}.
            </small>
          </p>
        </>
      ) : (
        <section>
          <p>🔒 {t("dance.locked")}</p>
          <p>
            <Link to="/pricing">{t("dance.seePlans")}</Link>
          </p>
        </section>
      )}

      {thread !== null ? (
        <section aria-label={t("comments.title")}>
          <h2>{t("comments.title")}</h2>
          {actionData?.error ? <p role="alert">{t("comments.error")}</p> : null}

          {canComment ? (
            <Form method="post">
              <input type="hidden" name="intent" value="comment" />
              <label>
                <textarea
                  name="body"
                  required
                  placeholder={t("comments.placeholder")}
                />
              </label>
              <button type="submit">{t("comments.post")}</button>
            </Form>
          ) : null}

          {thread.length === 0 ? (
            <p>{t("comments.empty")}</p>
          ) : (
            <ul>
              {thread.map((comment) => (
                <li key={comment.id}>
                  <p>
                    <strong>
                      {comment.authorId === currentAccountId
                        ? t("comments.you")
                        : t("comments.someone")}
                    </strong>{" "}
                    <small>{formatTime(comment.createdAt)}</small>
                  </p>
                  <p>{comment.body}</p>
                  {comment.authorId === currentAccountId ? (
                    <Form method="post">
                      <input type="hidden" name="intent" value="delete" />
                      <input type="hidden" name="commentId" value={comment.id} />
                      <button type="submit">{t("comments.delete")}</button>
                    </Form>
                  ) : null}

                  {comment.replies.length > 0 ? (
                    <ul>
                      {comment.replies.map((reply) => (
                        <li key={reply.id}>
                          <p>
                            <strong>🎓 {t("comments.studio")}</strong>{" "}
                            <small>{formatTime(reply.createdAt)}</small>
                          </p>
                          <p>{reply.body}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {viewerIsStaff ? (
                    <Form method="post">
                      <input type="hidden" name="intent" value="reply" />
                      <input type="hidden" name="commentId" value={comment.id} />
                      <label>
                        <textarea
                          name="body"
                          required
                          placeholder={t("comments.replyPlaceholder")}
                        />
                      </label>
                      <button type="submit">{t("comments.reply")}</button>
                    </Form>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
