import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { createDance, createVideo } from "./Content";
import { getPlayback } from "./Playback";
import { createSubscription } from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";
import {
  VideoProvider,
  type SignPlaybackRequest,
} from "./VideoProvider";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;
type Status = "trialing" | "active" | "past_due" | "canceled";

/**
 * A recording stub of the provider so tests can assert *whether* a URL was ever
 * requested — the crux of "no URL is issued" for a denied request. Records every
 * sign call and mints a trivial short-lived URL.
 */
const makeSpyProvider = () => {
  const calls: SignPlaybackRequest[] = [];
  const layer = Layer.succeed(VideoProvider, {
    // Playback never ingests; the stub only needs to record sign calls.
    ingest: () =>
      Effect.succeed({ providerAssetId: "unused", status: "ready" as const }),
    signPlaybackUrl: (request) =>
      Effect.sync(() => {
        calls.push(request);
        return {
          url: `stub://${request.providerAssetId}`,
          expiresAt: new Date(Date.now() + 60_000),
        };
      }),
  });
  return { calls, layer };
};

/** Seed the three Tiers and a published Dance (at `danceRank`) with one Video. */
const seedCatalog = async (
  layer: TestLayer,
  opts: {
    danceRank: number;
    videoPublished?: boolean;
    dancePublished?: boolean;
  },
) => {
  await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
  const dance = await Effect.runPromise(
    createDance({
      nameEs: "Tango",
      nameEn: "Tango",
      minTierRank: opts.danceRank,
      published: opts.dancePublished ?? true,
    }).pipe(Effect.provide(layer)),
  );
  const video = await Effect.runPromise(
    createVideo({
      danceId: dance.id,
      level: "principiante",
      titleEs: "Básico",
      titleEn: "Basic",
      descriptionEs: "",
      descriptionEn: "",
      providerAssetId: "asset-123",
      published: opts.videoPublished ?? true,
      tagIds: [],
    }).pipe(Effect.provide(layer)),
  );
  return { dance, video };
};

/** Sign up an Account and subscribe it to `rank` with `status`. */
const subscribe = async (
  layer: TestLayer,
  opts: { rank: number; status: Status },
) => {
  const tiers = await Effect.runPromise(
    listTiers().pipe(Effect.provide(layer)),
  );
  const tier = tiers.find((t) => t.rank === opts.rank)!;
  const account = await Effect.runPromise(
    signup(`u${opts.rank}-${opts.status}@example.com`, "password123").pipe(
      Effect.provide(layer),
    ),
  );
  await Effect.runPromise(
    createSubscription({
      accountId: account.id,
      tierId: tier.id,
      status: opts.status,
      billingPeriod: "monthly",
    }).pipe(Effect.provide(layer)),
  );
  return account;
};

const run = (
  layer: TestLayer,
  spy: ReturnType<typeof makeSpyProvider>,
  accountId: string,
  videoId: string,
) =>
  Effect.runPromise(
    getPlayback(accountId, videoId).pipe(
      Effect.either,
      Effect.provide(Layer.merge(layer, spy.layer)),
    ),
  );

describe("getPlayback", () => {
  it("issues a short-lived Signed URL to an entitled Subscriber", async () => {
    const layer = await makeTestDatabaseLayer();
    const spy = makeSpyProvider();
    const { video } = await seedCatalog(layer, { danceRank: 1 });
    // Rank-2 subscriber reaches a rank-1 Dance (cumulative ladder).
    const account = await subscribe(layer, { rank: 2, status: "active" });

    const result = await run(layer, spy, account.id, video.id);

    expect(Either.isRight(result)).toBe(true);
    if (Either.isRight(result)) {
      expect(result.right.signedUrl.url).toContain("asset-123");
      expect(result.right.signedUrl.expiresAt.getTime()).toBeGreaterThan(
        Date.now(),
      );
    }
    // The gate passed, so the provider was asked exactly once for this asset.
    expect(spy.calls).toEqual([{ providerAssetId: "asset-123" }]);
  });

  it("refuses and issues no URL when the Tier doesn't reach the Dance", async () => {
    const layer = await makeTestDatabaseLayer();
    const spy = makeSpyProvider();
    const { video } = await seedCatalog(layer, { danceRank: 3 });
    const account = await subscribe(layer, { rank: 1, status: "active" });

    const result = await run(layer, spy, account.id, video.id);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.reason).toBe("not_entitled");
    // The provider was never reached — no URL was minted.
    expect(spy.calls).toEqual([]);
  });

  it("refuses when the Subscription no longer grants access (canceled)", async () => {
    const layer = await makeTestDatabaseLayer();
    const spy = makeSpyProvider();
    const { video } = await seedCatalog(layer, { danceRank: 1 });
    const account = await subscribe(layer, { rank: 3, status: "canceled" });

    const result = await run(layer, spy, account.id, video.id);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.reason).toBe("not_entitled");
    expect(spy.calls).toEqual([]);
  });

  it("refuses a Subscriber with no Subscription at all", async () => {
    const layer = await makeTestDatabaseLayer();
    const spy = makeSpyProvider();
    const { video } = await seedCatalog(layer, { danceRank: 1 });
    const account = await Effect.runPromise(
      signup("nosub@example.com", "password123").pipe(Effect.provide(layer)),
    );

    const result = await run(layer, spy, account.id, video.id);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.reason).toBe("not_entitled");
    expect(spy.calls).toEqual([]);
  });

  it("treats an unpublished (hidden) Video as not found, issuing no URL", async () => {
    const layer = await makeTestDatabaseLayer();
    const spy = makeSpyProvider();
    // Draft Video under a published Dance — hidden by the publish rule.
    const { video } = await seedCatalog(layer, {
      danceRank: 1,
      videoPublished: false,
    });
    const account = await subscribe(layer, { rank: 3, status: "active" });

    const result = await run(layer, spy, account.id, video.id);

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left.reason).toBe("not_found");
    expect(spy.calls).toEqual([]);
  });
});
