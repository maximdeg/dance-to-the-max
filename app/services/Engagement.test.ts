import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { createDance, createVideo } from "./Content";
import type { Database } from "./Database";
import { getResumePoint, saveResumePoint } from "./Engagement";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const run = <A, E>(layer: TestLayer, effect: Effect.Effect<A, E, Database>) =>
  Effect.runPromise(effect.pipe(Effect.provide(layer)));

/** An entitlement-agnostic fixture: one published Video and one Subscriber. */
const setup = async (layer: TestLayer) => {
  const dance = await run(
    layer,
    createDance({ nameEs: "Vals", nameEn: "Waltz", minTierRank: 1, published: true }),
  );
  const video = await run(
    layer,
    createVideo({
      danceId: dance.id,
      level: "principiante",
      titleEs: "Básico",
      titleEn: "Basic",
      descriptionEs: "",
      descriptionEn: "",
      providerAssetId: "asset-1",
      published: true,
      tagIds: [],
    }),
  );
  const subscriber = await run(layer, signup("sub@example.com", "password123"));
  return { video, subscriber };
};

describe("saveResumePoint / getResumePoint", () => {
  it("saves a position and reads it back as in-progress", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);

    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 42,
        durationSeconds: 600,
      }),
    );

    const rp = await run(layer, getResumePoint(subscriber.id, video.id));
    expect(rp?.positionSeconds).toBe(42);
    expect(rp?.watched).toBe(false);
  });

  it("upserts one row per (Subscriber, Video) — the latest save wins", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);

    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 30,
        durationSeconds: 600,
      }),
    );
    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 75,
        durationSeconds: 600,
      }),
    );

    const rp = await run(layer, getResumePoint(subscriber.id, video.id));
    expect(rp?.positionSeconds).toBe(75);
  });

  it("auto-marks watched at >= 90% of duration, stays in-progress below", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);

    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 300, // 50%
        durationSeconds: 600,
      }),
    );
    expect(
      (await run(layer, getResumePoint(subscriber.id, video.id)))?.watched,
    ).toBe(false);

    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 550, // ~92%
        durationSeconds: 600,
      }),
    );
    expect(
      (await run(layer, getResumePoint(subscriber.id, video.id)))?.watched,
    ).toBe(true);
  });

  it("keeps watched sticky once reached, even if a later save dips below", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);

    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 590,
        durationSeconds: 600,
      }),
    );
    await run(
      layer,
      saveResumePoint({
        accountId: subscriber.id,
        videoId: video.id,
        positionSeconds: 10,
        durationSeconds: 600,
      }),
    );

    const rp = await run(layer, getResumePoint(subscriber.id, video.id));
    expect(rp?.positionSeconds).toBe(10);
    expect(rp?.watched).toBe(true);
  });

  it("returns null when the Subscriber has no Resume Point for the Video", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);
    expect(await run(layer, getResumePoint(subscriber.id, video.id))).toBeNull();
  });
});
