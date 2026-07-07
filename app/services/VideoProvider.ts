import { randomBytes } from "node:crypto";
import { Context, Effect, Layer } from "effect";

/** A signed playback URL and the instant it stops working. Short-lived by design. */
export interface SignedPlayback {
  readonly url: string;
  readonly expiresAt: Date;
}

export interface SignPlaybackRequest {
  readonly providerAssetId: string;
  /** Seconds the URL stays valid; defaults to the provider's short TTL. */
  readonly ttlSeconds?: number;
}

/**
 * The hosted video provider, behind an interface so the real streaming service
 * can be swapped in later and tests can stub it. Its one job is to mint a
 * short-lived Signed URL for an asset the caller has *already* been authorized
 * to watch — authorization (the Entitlement check) lives above it, in Playback,
 * so this seam never sees an un-gated request.
 */
export interface VideoProviderService {
  readonly signPlaybackUrl: (
    request: SignPlaybackRequest,
  ) => Effect.Effect<SignedPlayback>;
}

export class VideoProvider extends Context.Tag("app/VideoProvider")<
  VideoProvider,
  VideoProviderService
>() {}

/** Default lifetime of a Signed URL — short, so links can't be shared for long. */
export const DEFAULT_TTL_SECONDS = 300;

/**
 * Placeholder provider until a hosted streaming service is wired in (#14). It
 * mints a URL that carries its own expiry (`exp`) and a fresh opaque token, so
 * links are demonstrably short-lived and non-guessable even before a real
 * signer exists. No network, no secrets — swapped out wholesale when the
 * provider lands.
 */
export const VideoProviderLive = Layer.succeed(VideoProvider, {
  signPlaybackUrl: ({ providerAssetId, ttlSeconds = DEFAULT_TTL_SECONDS }) =>
    Effect.sync(() => {
      const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
      const exp = Math.floor(expiresAt.getTime() / 1000);
      const token = randomBytes(16).toString("hex");
      const url =
        `https://stream.dancetothemax.example/${encodeURIComponent(providerAssetId)}/index.m3u8` +
        `?exp=${exp}&token=${token}`;
      return { url, expiresAt };
    }),
});
