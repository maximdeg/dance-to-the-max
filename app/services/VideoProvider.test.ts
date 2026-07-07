import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import {
  DEFAULT_TTL_SECONDS,
  VideoProvider,
  VideoProviderLive,
  type SignPlaybackRequest,
} from "./VideoProvider";

const sign = (request: SignPlaybackRequest) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const provider = yield* VideoProvider;
      return yield* provider.signPlaybackUrl(request);
    }).pipe(Effect.provide(VideoProviderLive)),
  );

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
