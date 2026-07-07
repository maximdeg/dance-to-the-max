import { randomBytes } from "node:crypto";
import { Context, Data, Effect, Layer } from "effect";

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

/** An uploaded file handed to the provider for ingest/transcode. */
export interface IngestRequest {
  readonly filename: string;
  readonly contentType: string;
  readonly bytes: Uint8Array;
}

/** Transcode state of an ingested asset (a real provider transcodes async). */
export type IngestStatus = "processing" | "ready";

export interface IngestedAsset {
  readonly providerAssetId: string;
  readonly status: IngestStatus;
}

/** Ingest failed — a bad file, or the provider rejecting/erroring. Surfaced to
 * the Super Admin rather than swallowed. */
export class VideoIngestError extends Data.TaggedError("VideoIngestError")<{
  readonly reason: string;
}> {}

/**
 * The hosted video provider, behind an interface so the real streaming service
 * can be swapped in later and tests can stub it. It does two things: `ingest` a
 * newly uploaded file and return the asset id to store on the Video, and
 * `signPlaybackUrl` for an asset the caller has *already* been authorized to
 * watch — authorization (the Entitlement check) lives above it, in Playback,
 * so this seam never sees an un-gated playback request.
 */
export interface VideoProviderService {
  readonly ingest: (
    request: IngestRequest,
  ) => Effect.Effect<IngestedAsset, VideoIngestError>;
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
  ingest: ({ contentType, bytes }) =>
    Effect.gen(function* () {
      if (bytes.length === 0) {
        return yield* new VideoIngestError({ reason: "The file is empty." });
      }
      if (!contentType.startsWith("video/")) {
        return yield* new VideoIngestError({
          reason: "Only video files can be uploaded.",
        });
      }
      // A real provider returns its own id and transcodes asynchronously; the
      // placeholder mints an opaque id and reports it ready immediately.
      const providerAssetId = `asset_${randomBytes(12).toString("hex")}`;
      return { providerAssetId, status: "ready" as const };
    }),
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
