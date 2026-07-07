import { Data, Effect } from "effect";
import { getPlayableVideo } from "./Catalog";
import type { Video } from "./Content";
import { Database } from "./Database";
import { isEntitledTo } from "./Entitlement";
import { getEntitlement } from "./Subscriptions";
import { VideoProvider, type SignedPlayback } from "./VideoProvider";

/**
 * Why a Video can't be played: it isn't in the Catalog (draft/hidden or absent),
 * or the Subscriber's Tier doesn't reach it. In either case no Signed URL is
 * issued — the denial is decided before the provider is ever asked.
 */
export type PlaybackDenial = "not_found" | "not_entitled";

export class VideoNotPlayable extends Data.TaggedError("VideoNotPlayable")<{
  readonly reason: PlaybackDenial;
}> {}

export interface Playback {
  readonly video: Video;
  readonly signedUrl: SignedPlayback;
}

/**
 * Gated playback. Resolve the Video through the publish rule, run the pure
 * Entitlement check against its parent Dance, and only then ask the provider to
 * sign a URL. The provider is never reached for a denied request, so a
 * non-entitled Subscriber gets no URL — issuance is strictly downstream of the
 * gate.
 */
export const getPlayback = (
  accountId: string,
  videoId: string,
): Effect.Effect<Playback, VideoNotPlayable, Database | VideoProvider> =>
  Effect.gen(function* () {
    const playable = yield* getPlayableVideo(videoId);
    if (!playable) return yield* new VideoNotPlayable({ reason: "not_found" });

    const entitlement = yield* getEntitlement(accountId);
    if (!isEntitledTo(entitlement, playable.dance)) {
      return yield* new VideoNotPlayable({ reason: "not_entitled" });
    }

    const provider = yield* VideoProvider;
    const signedUrl = yield* provider.signPlaybackUrl({
      providerAssetId: playable.video.providerAssetId,
    });
    return { video: playable.video, signedUrl };
  });
