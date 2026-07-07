import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TTL_SECONDS,
  VideoProvider,
  VideoProviderLive,
  type IngestRequest,
  type SignPlaybackRequest,
} from "./VideoProvider";

const sign = (request: SignPlaybackRequest) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const provider = yield* VideoProvider;
      return yield* provider.signPlaybackUrl(request);
    }).pipe(Effect.provide(VideoProviderLive)),
  );

const ingest = (request: IngestRequest) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const provider = yield* VideoProvider;
      return yield* provider.ingest(request);
    }).pipe(Effect.either, Effect.provide(VideoProviderLive)),
  );

const videoFile = (overrides: Partial<IngestRequest> = {}): IngestRequest => ({
  filename: "clip.mp4",
  contentType: "video/mp4",
  bytes: new Uint8Array([0, 1, 2, 3]),
  ...overrides,
});

describe("VideoProviderLive ingest", () => {
  it("returns a ready asset id for a valid video file", async () => {
    const result = await ingest(videoFile());
    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.providerAssetId).toMatch(/^asset_/);
      expect(result.right.status).toBe("ready");
    }
  });

  it("rejects an empty file", async () => {
    const result = await ingest(videoFile({ bytes: new Uint8Array() }));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("VideoIngestError");
    }
  });

  it("rejects a non-video content type", async () => {
    const result = await ingest(videoFile({ contentType: "image/png" }));
    expect(Either.isLeft(result)).toBe(true);
  });
});

describe("VideoProviderLive", () => {
  it("mints a URL that carries the asset, an expiry, and a token", async () => {
    const before = Date.now();
    const signed = await sign({ providerAssetId: "asset-xyz" });

    expect(signed.url).toContain("asset-xyz");
    expect(signed.url).toContain("exp=");
    expect(signed.url).toContain("token=");
    const ttlMs = signed.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(DEFAULT_TTL_SECONDS * 1000 + 1000);
  });

  it("honors a custom, shorter TTL", async () => {
    const before = Date.now();
    const signed = await sign({ providerAssetId: "a", ttlSeconds: 30 });

    const ttlMs = signed.expiresAt.getTime() - before;
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(30_000 + 1000);
  });

  it("mints a fresh (non-guessable) token on every call", async () => {
    const a = await sign({ providerAssetId: "same" });
    const b = await sign({ providerAssetId: "same" });
    expect(a.url).not.toBe(b.url);
  });
});
