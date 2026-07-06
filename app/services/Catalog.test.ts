import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import {
  getPublishedDanceWithVideos,
  listPublishedDances,
  searchPublishedVideos,
} from "./Catalog";
import {
  createDance,
  createTag,
  createVideo,
  type DanceInput,
  type Level,
  type VideoInput,
} from "./Content";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const run = <A, E>(effect: Effect.Effect<A, E, never>): Promise<A> =>
  Effect.runPromise(effect);

const mkDance = (layer: TestLayer, over: Partial<DanceInput> = {}) =>
  run(
    createDance({
      nameEs: "Danza",
      nameEn: "Dance",
      minTierRank: 1,
      published: true,
      ...over,
    }).pipe(Effect.provide(layer)),
  );

const mkVideo = (
  layer: TestLayer,
  danceId: string,
  over: Partial<VideoInput> = {},
) =>
  run(
    createVideo({
      danceId,
      level: "principiante",
      titleEs: "titulo",
      titleEn: "title",
      descriptionEs: "",
      descriptionEn: "",
      providerAssetId: "asset",
      published: true,
      tagIds: [],
      ...over,
    }).pipe(Effect.provide(layer)),
  );

const mkTag = (layer: TestLayer, labelEs: string) =>
  run(
    createTag({ labelEs, labelEn: labelEs }).pipe(Effect.provide(layer)),
  );

describe("listPublishedDances", () => {
  it("shows only published Dances that have at least one published Video", async () => {
    const layer = await makeTestDatabaseLayer();

    const shown = await mkDance(layer, { nameEs: "A visible" });
    await mkVideo(layer, shown.id, { published: true });

    const draftVideos = await mkDance(layer, { nameEs: "B only drafts" });
    await mkVideo(layer, draftVideos.id, { published: false });

    const noVideos = await mkDance(layer, { nameEs: "C no videos" });

    const unpublishedDance = await mkDance(layer, {
      nameEs: "D unpublished",
      published: false,
    });
    await mkVideo(layer, unpublishedDance.id, { published: true });

    const list = await run(
      listPublishedDances().pipe(Effect.provide(layer)),
    );
    expect(list.map((dance) => dance.id)).toEqual([shown.id]);
  });
});

describe("getPublishedDanceWithVideos", () => {
  it("groups a published Dance's published Videos by Level in order", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await mkDance(layer);
    // Insert out of Level order; a draft must be excluded.
    await mkVideo(layer, dance.id, { level: "max", titleEs: "z" });
    await mkVideo(layer, dance.id, { level: "primeras_veces", titleEs: "a" });
    await mkVideo(layer, dance.id, {
      level: "avanzado",
      titleEs: "d draft",
      published: false,
    });

    const result = await run(
      getPublishedDanceWithVideos(dance.id).pipe(Effect.provide(layer)),
    );
    expect(result?.groups.map((group) => group.level)).toEqual([
      "primeras_veces",
      "max",
    ]);
    expect(
      result?.groups.flatMap((group) => group.videos).map((v) => v.titleEs),
    ).toEqual(["a", "z"]);
  });

  it("hides an unpublished Dance", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await mkDance(layer, { published: false });
    await mkVideo(layer, dance.id, { published: true });

    const result = await run(
      getPublishedDanceWithVideos(dance.id).pipe(Effect.provide(layer)),
    );
    expect(result).toBeNull();
  });

  it("hides a published Dance whose Videos are all drafts", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await mkDance(layer);
    await mkVideo(layer, dance.id, { published: false });

    const result = await run(
      getPublishedDanceWithVideos(dance.id).pipe(Effect.provide(layer)),
    );
    expect(result).toBeNull();
  });
});

describe("searchPublishedVideos", () => {
  it("applies the two-level publish rule (Video AND Dance published)", async () => {
    const layer = await makeTestDatabaseLayer();

    const pubDance = await mkDance(layer, { nameEs: "pub" });
    const visible = await mkVideo(layer, pubDance.id, {
      titleEs: "visible",
      published: true,
    });
    await mkVideo(layer, pubDance.id, { titleEs: "draft", published: false });

    const draftDance = await mkDance(layer, {
      nameEs: "draft dance",
      published: false,
    });
    await mkVideo(layer, draftDance.id, {
      titleEs: "under draft dance",
      published: true,
    });

    const results = await run(
      searchPublishedVideos().pipe(Effect.provide(layer)),
    );
    expect(results.map((v) => v.id)).toEqual([visible.id]);
    expect(results[0]?.danceNameEs).toBe("pub");
  });

  it("filters by Level", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await mkDance(layer);
    const inter = await mkVideo(layer, dance.id, {
      level: "intermedio",
      titleEs: "i",
    });
    await mkVideo(layer, dance.id, { level: "avanzado", titleEs: "a" });

    const results = await run(
      searchPublishedVideos({ level: "intermedio" as Level }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(results.map((v) => v.id)).toEqual([inter.id]);
  });

  it("filters by Tag", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await mkDance(layer);
    const tag = await mkTag(layer, "giros");
    const tagged = await mkVideo(layer, dance.id, {
      titleEs: "tagged",
      tagIds: [tag.id],
    });
    await mkVideo(layer, dance.id, { titleEs: "untagged", tagIds: [] });

    const results = await run(
      searchPublishedVideos({ tagId: tag.id }).pipe(Effect.provide(layer)),
    );
    expect(results.map((v) => v.id)).toEqual([tagged.id]);
  });

  it("combines Level and Tag filters", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await mkDance(layer);
    const tag = await mkTag(layer, "postura");
    const match = await mkVideo(layer, dance.id, {
      level: "avanzado",
      titleEs: "match",
      tagIds: [tag.id],
    });
    // Same tag, wrong level.
    await mkVideo(layer, dance.id, {
      level: "principiante",
      titleEs: "wrong level",
      tagIds: [tag.id],
    });
    // Right level, no tag.
    await mkVideo(layer, dance.id, {
      level: "avanzado",
      titleEs: "no tag",
      tagIds: [],
    });

    const results = await run(
      searchPublishedVideos({ level: "avanzado" as Level, tagId: tag.id }).pipe(
        Effect.provide(layer),
      ),
    );
    expect(results.map((v) => v.id)).toEqual([match.id]);
  });
});
