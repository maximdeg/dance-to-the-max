import { Effect } from "effect";
import {
  createVideo,
  getVideo,
  updateVideo,
  DanceNotFound,
  VideoNotFound,
  type Video,
  type VideoInput,
} from "./Content";
import { Database } from "./Database";
import {
  VideoProvider,
  VideoIngestError,
  type IngestRequest,
} from "./VideoProvider";

/**
 * The Video fields the Super Admin supplies. `providerAssetId` is intentionally
 * absent — it comes from ingesting the uploaded file, never typed by hand.
 */
export type UploadedVideoInput = Omit<VideoInput, "providerAssetId">;

/**
 * Create a Video from an uploaded file: send the file to the provider, then
 * persist the Video with the returned asset id so it plays through the existing
 * Signed-URL flow. Ingest runs first, so a provider failure aborts before any
 * Video row is written.
 */
export const createUploadedVideo = (
  input: UploadedVideoInput,
  file: IngestRequest,
): Effect.Effect<
  Video,
  VideoIngestError | DanceNotFound,
  Database | VideoProvider
> =>
  Effect.gen(function* () {
    const provider = yield* VideoProvider;
    const asset = yield* provider.ingest(file);
    return yield* createVideo({
      ...input,
      providerAssetId: asset.providerAssetId,
    });
  });

/**
 * Update a Video, optionally replacing its media: when a `file` is given it is
 * re-ingested and the new asset id is stored; when it is null the existing
 * asset id is kept (an edit that only touches metadata doesn't force a
 * re-upload).
 */
export const updateUploadedVideo = (
  videoId: string,
  input: UploadedVideoInput,
  file: IngestRequest | null,
): Effect.Effect<
  Video,
  VideoIngestError | DanceNotFound | VideoNotFound,
  Database | VideoProvider
> =>
  Effect.gen(function* () {
    let providerAssetId: string;
    if (file) {
      const provider = yield* VideoProvider;
      const asset = yield* provider.ingest(file);
      providerAssetId = asset.providerAssetId;
    } else {
      const existing = yield* getVideo(videoId);
      if (!existing) return yield* new VideoNotFound({ id: videoId });
      providerAssetId = existing.providerAssetId;
    }
    return yield* updateVideo(videoId, { ...input, providerAssetId });
  });
