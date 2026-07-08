import { Effect, Either } from "effect";
import { Form, Link, type ShouldRevalidateFunctionArgs } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { isStaff } from "~/auth/roles";
import { VideoPlayer } from "~/components/VideoPlayer";
import { pick } from "~/i18n/content";
import { useLocale, useTranslate } from "~/i18n/context";
import { runtime } from "~/runtime.server";
import {
  deleteComment,
  listThread,
  postComment,
  removeComment,
  replyToComment,
  reportComment,
  setCommentHidden,
} from "~/services/Comments";
import { saveResumePoint } from "~/services/Engagement";
import { getPlayback } from "~/services/Playback";
import type { Route } from "./+types/catalog.$danceId.$videoId";

export function meta() {
  return [{ title: "Watch · Dance To the Max" }];
}

/**
 * The Resume Point pings (`intent=resume`) fire every ~15s while watching; they
 * must not re-run the loader (which would re-sign the URL and reload the
 * thread). Every other submission revalidates as usual.
 */
export function shouldRevalidate({
  formData,
  defaultShouldRevalidate,
}: ShouldRevalidateFunctionArgs) {
  if (formData?.get("intent") === "resume") return false;
  return defaultShouldRevalidate;
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
        hidden: comment.hidden,
        reportCount: comment.reportCount,
        replies: comment.replies.map((reply) => ({
          id: reply.id,
          body: reply.body,
          createdAt: reply.createdAt.toISOString(),
          hidden: reply.hidden,
          reportCount: reply.reportCount,
        })),
      }))
    : null;

  return {
    danceId: params.danceId,
    videoId: params.videoId,
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

  if (intent === "resume") {
    const positionSeconds = Number(form.get("positionSeconds") ?? 0);
    const durationSeconds = Number(form.get("durationSeconds") ?? 0);
    await runtime.runPromise(
      saveResumePoint({
        accountId: account.id,
        videoId: params.videoId,
        positionSeconds,
        durationSeconds,
      }).pipe(Effect.either),
    );
    return { error: false as const };
  }

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

  if (intent === "hide" || intent === "unhide") {
    const commentId = String(form.get("commentId") ?? "");
    const result = await runtime.runPromise(
      setCommentHidden(account.id, commentId, intent === "hide").pipe(
        Effect.either,
      ),
    );
    return { error: Either.isLeft(result) };
  }

  if (intent === "remove") {
    const commentId = String(form.get("commentId") ?? "");
    const result = await runtime.runPromise(
      removeComment(account.id, commentId).pipe(Effect.either),
    );
    return { error: Either.isLeft(result) };
  }

  if (intent === "report") {
    const commentId = String(form.get("commentId") ?? "");
    const result = await runtime.runPromise(
      reportComment(account.id, commentId).pipe(Effect.either),
    );
    return { error: Either.isLeft(result) };
  }

  return { error: true as const };
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

/** Staff-only moderation controls for a Comment or reply. */
function StaffModeration({
  id,
  hidden,
  reportCount,
}: {
  id: string;
  hidden: boolean;
  reportCount: number;
}) {
  const t = useTranslate();
  return (
    <p>
      {hidden ? <em>{t("comments.hidden")} </em> : null}
      {reportCount > 0 ? (
        <span>
          ⚑ {reportCount} {t("comments.reported")}{" "}
        </span>
      ) : null}
      <Form method="post" style={{ display: "inline" }}>
        <input type="hidden" name="intent" value={hidden ? "unhide" : "hide"} />
        <input type="hidden" name="commentId" value={id} />
        <button type="submit">
          {hidden ? t("comments.unhide") : t("comments.hide")}
        </button>
      </Form>{" "}
      <Form method="post" style={{ display: "inline" }}>
        <input type="hidden" name="intent" value="remove" />
        <input type="hidden" name="commentId" value={id} />
        <button type="submit">{t("comments.remove")}</button>
      </Form>
    </p>
  );
}

/** Subscriber "report" control for someone else's Comment. */
function ReportButton({ id }: { id: string }) {
  const t = useTranslate();
  return (
    <Form method="post" style={{ display: "inline" }}>
      <input type="hidden" name="intent" value="report" />
      <input type="hidden" name="commentId" value={id} />
      <button type="submit">{t("comments.report")}</button>
    </Form>
  );
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
          <VideoPlayer
            videoId={loaderData.videoId}
            src={playback.url}
            unsupportedLabel={t("watch.unsupported")}
          />
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
              {thread.map((comment) => {
                const own = comment.authorId === currentAccountId;
                return (
                  <li key={comment.id}>
                    <p>
                      <strong>
                        {own ? t("comments.you") : t("comments.someone")}
                      </strong>{" "}
                      <small>{formatTime(comment.createdAt)}</small>
                    </p>
                    <p>{comment.body}</p>
                    {own ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="delete" />
                        <input
                          type="hidden"
                          name="commentId"
                          value={comment.id}
                        />
                        <button type="submit">{t("comments.delete")}</button>
                      </Form>
                    ) : null}
                    {!viewerIsStaff && !own ? (
                      <ReportButton id={comment.id} />
                    ) : null}
                    {viewerIsStaff ? (
                      <StaffModeration
                        id={comment.id}
                        hidden={comment.hidden}
                        reportCount={comment.reportCount}
                      />
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
                            {viewerIsStaff ? (
                              <StaffModeration
                                id={reply.id}
                                hidden={reply.hidden}
                                reportCount={reply.reportCount}
                              />
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {viewerIsStaff ? (
                      <Form method="post">
                        <input type="hidden" name="intent" value="reply" />
                        <input
                          type="hidden"
                          name="commentId"
                          value={comment.id}
                        />
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
                );
              })}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}
