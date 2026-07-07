import { Effect, Either } from "effect";
import { Link } from "react-router";
import { requireAccount } from "~/auth/auth.server";
import { pick } from "~/i18n/content";
import { useLocale, useTranslate } from "~/i18n/context";
import { runtime } from "~/runtime.server";
import { getPlayback } from "~/services/Playback";
import type { Route } from "./+types/catalog.$danceId.$videoId";

export function meta() {
  return [{ title: "Watch · Dance To the Max" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const account = await requireAccount(request);
  const result = await runtime.runPromise(
    getPlayback(account.id, params.videoId).pipe(Effect.either),
  );

  if (Either.isLeft(result)) {
    // A hidden/absent Video is a 404; a Tier that doesn't reach it is a soft
    // wall that lands the Subscriber on an upgrade prompt (no URL was issued).
    if (result.left.reason === "not_found") {
      throw new Response("Not Found", { status: 404 });
    }
    return { locked: true as const, danceId: params.danceId };
  }

  const { video, signedUrl } = result.right;
  return {
    locked: false as const,
    danceId: params.danceId,
    video: {
      titleEs: video.titleEs,
      titleEn: video.titleEn,
      descriptionEs: video.descriptionEs,
      descriptionEn: video.descriptionEn,
    },
    // The Signed URL is serialized to the client; `expiresAt` becomes an ISO
    // string over the wire, shown so the short-lived nature is visible.
    playback: {
      url: signedUrl.url,
      expiresAt: signedUrl.expiresAt.toISOString(),
    },
  };
}

export default function WatchVideo({ loaderData }: Route.ComponentProps) {
  const { danceId } = loaderData;
  const t = useTranslate();
  const locale = useLocale();

  return (
    <main>
      <p>
        <Link to={`/catalog/${danceId}`}>{t("watch.back")}</Link>
      </p>

      {loaderData.locked ? (
        <section>
          <p>🔒 {t("dance.locked")}</p>
          <p>
            <Link to="/pricing">{t("dance.seePlans")}</Link>
          </p>
        </section>
      ) : (
        <>
          <h1>
            {pick(locale, loaderData.video.titleEs, loaderData.video.titleEn)}
          </h1>
          <video controls src={loaderData.playback.url}>
            {t("watch.unsupported")}
          </video>
          {pick(
            locale,
            loaderData.video.descriptionEs,
            loaderData.video.descriptionEn,
          ) ? (
            <p>
              {pick(
                locale,
                loaderData.video.descriptionEs,
                loaderData.video.descriptionEn,
              )}
            </p>
          ) : null}
          <p>
            <small>
              {t("watch.linkExpires")}{" "}
              {new Date(loaderData.playback.expiresAt).toLocaleTimeString()}.
            </small>
          </p>
        </>
      )}
    </main>
  );
}
