import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { createDance, getVideo, listVideosByDance } from "./Content";
import { getPlayback } from "./Playback";
import { createUploadedVideo, updateUploadedVideo } from "./VideoIngest";
import {
  VideoProvider,
  VideoProviderLive,
  VideoIngestError,
  type IngestRequest,
} from "./VideoProvider";
import { createSubscription } from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const file: IngestRequest = {
  filename: "clip.mp4",
  contentType: "video/mp4",
  bytes: new Uint8Array([1, 2, 3]),
};

/**
 * A provider stub with a fixed ingest asset id (or a forced failure), plus a
 * trivial signer so playback can be exercised end-to-end.
 */
const stubProvider = (opts: { assetId?: string; fail?: string }) =>
  Layer.succeed(VideoProvider, {
    ingest: () =>
      opts.fail
        ? Effect.fail(new VideoIngestError({ reason: opts.fail }))
        : Effect.succeed({
            providerAssetId: opts.assetId ?? "asset_stub",
            status: "ready" as const,
          }),
    signPlaybackUrl: ({ providerAssetId }) =>
      Effect.succeed({
        url: `stub://${providerAssetId}`,
        expiresAt: new Date(Date.now() + 60_000),
      }),
  });

const newDance = (layer: TestLayer, published = true) =>
  Effect.runPromise(
    createDance({
      nameEs: "Tango",
      nameEn: "Tango",
      minTierRank: 1,
      published,
    }).pipe(Effect.provide(layer)),
  );

const baseInput = (danceId: string, published = true) => ({
  danceId,
  level: "principiante" as const,
  titleEs: "Básico",
  titleEn: "Basic",
  descriptionEs: "",
  descriptionEn: "",
  published,
  tagIds: [],
});

describe("createUploadedVideo", () => {
  it("stores the provider's returned asset id on the created Video", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await newDance(layer);

    const video = await Effect.runPromise(
      createUploadedVideo(baseInput(dance.id), file).pipe(
        Effect.provide(Layer.merge(layer, stubProvider({ assetId: "asset_xyz" }))),
      ),
    );

    expect(video.providerAssetId).toBe("asset_xyz");
    const persisted = await Effect.runPromise(
      getVideo(video.id).pipe(Effect.provide(layer)),
    );
    expect(persisted?.providerAssetId).toBe("asset_xyz");
  });

  it("makes the uploaded Video playable through the Signed-URL flow", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
    const dance = await newDance(layer);

    // Upload + persist with the real placeholder provider (random asset id).
    const video = await Effect.runPromise(
      createUploadedVideo(baseInput(dance.id), file).pipe(
        Effect.provide(Layer.merge(layer, VideoProviderLive)),
      ),
    );

    // An entitled Subscriber can play it — the signed URL carries the asset id.
    const tiers = await Effect.runPromise(listTiers().pipe(Effect.provide(layer)));
    const account = await Effect.runPromise(
      signup("watcher@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await Effect.runPromise(
      createSubscription({
        accountId: account.id,
        tierId: tiers.find((t) => t.rank === 1)!.id,
        status: "active",
        billingPeriod: "monthly",
      }).pipe(Effect.provide(layer)),
    );

    const playback = await Effect.runPromise(
      getPlayback(account.id, video.id).pipe(
        Effect.provide(Layer.merge(layer, VideoProviderLive)),
      ),
    );
    expect(playback.signedUrl.url).toContain(video.providerAssetId);
  });

  it("surfaces an ingest failure and writes no Video", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await newDance(layer);

    const result = await Effect.runPromise(
      createUploadedVideo(baseInput(dance.id), file).pipe(
        Effect.either,
        Effect.provide(Layer.merge(layer, stubProvider({ fail: "provider down" }))),
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("VideoIngestError");
    }
    // Ingest runs before the insert, so nothing was persisted.
    const videos = await Effect.runPromise(
      listVideosByDance(dance.id).pipe(Effect.provide(layer)),
    );
    expect(videos).toHaveLength(0);
  });
});

describe("updateUploadedVideo", () => {
  it("replaces the asset id when a new file is uploaded, keeps it otherwise", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await newDance(layer);
    const video = await Effect.runPromise(
      createUploadedVideo(baseInput(dance.id), file).pipe(
        Effect.provide(Layer.merge(layer, stubProvider({ assetId: "asset_old" }))),
      ),
    );

    // Edit with a new file → new asset id.
    const replaced = await Effect.runPromise(
      updateUploadedVideo(video.id, baseInput(dance.id), file).pipe(
        Effect.provide(Layer.merge(layer, stubProvider({ assetId: "asset_new" }))),
      ),
    );
    expect(replaced.providerAssetId).toBe("asset_new");

    // Edit without a file → asset id unchanged (provider not consulted).
    const metadataOnly = await Effect.runPromise(
      updateUploadedVideo(
        video.id,
        { ...baseInput(dance.id), titleEn: "Basic (v2)" },
        null,
      ).pipe(Effect.provide(Layer.merge(layer, stubProvider({ fail: "should not run" })))),
    );
    expect(metadataOnly.providerAssetId).toBe("asset_new");
    expect(metadataOnly.titleEn).toBe("Basic (v2)");
  });
});
