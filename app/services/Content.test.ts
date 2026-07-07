import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import {
  createDance,
  createTag,
  createVideo,
  DanceNotFound,
  getDance,
  getVideo,
  listTags,
  listVideosByDance,
  setDancePublished,
  setVideoPublished,
  updateDance,
  updateVideo,
  VideoNotFound,
  type DanceInput,
  type VideoInput,
} from "./Content";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const run = <A, E>(
  effect: Effect.Effect<A, E, never>,
): Promise<A> => Effect.runPromise(effect);

const danceInput = (over: Partial<DanceInput> = {}): DanceInput => ({
  nameEs: "Vals",
  nameEn: "Waltz",
  minTierRank: 1,
  published: false,
  ...over,
});

const videoInput = (
  danceId: string,
  over: Partial<VideoInput> = {},
): VideoInput => ({
  danceId,
  level: "principiante",
  titleEs: "Caminata básica",
  titleEn: "Basic walk",
  descriptionEs: "",
  descriptionEn: "",
  providerAssetId: "asset-1",
  published: false,
  tagIds: [],
  ...over,
});

describe("dances", () => {
  it("creates a Dance with bilingual name, tier gate, and publish flag", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(
      createDance(danceInput({ minTierRank: 2 })).pipe(Effect.provide(layer)),
    );

    expect(dance.nameEs).toBe("Vals");
    expect(dance.nameEn).toBe("Waltz");
    expect(dance.minTierRank).toBe(2);
    expect(dance.published).toBe(false);

    const fetched = await run(getDance(dance.id).pipe(Effect.provide(layer)));
    expect(fetched?.id).toBe(dance.id);
  });

  it("persists a bilingual history, defaulting it to empty, and edits it", async () => {
    const layer = await makeTestDatabaseLayer();

    const authored = await run(
      createDance(
        danceInput({ historyEs: "Nació en Viena.", historyEn: "Born in Vienna." }),
      ).pipe(Effect.provide(layer)),
    );
    expect(authored.historyEs).toBe("Nació en Viena.");
    expect(authored.historyEn).toBe("Born in Vienna.");

    // A Dance authored without a history blurb gets empty strings, not null.
    const bare = await run(createDance(danceInput()).pipe(Effect.provide(layer)));
    expect(bare.historyEs).toBe("");
    expect(bare.historyEn).toBe("");

    const edited = await run(
      updateDance(
        authored.id,
        danceInput({ historyEn: "Origins in the Viennese ballrooms." }),
      ).pipe(Effect.provide(layer)),
    );
    expect(edited.historyEn).toBe("Origins in the Viennese ballrooms.");
  });

  it("edits an existing Dance and rejects an unknown id", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));

    const updated = await run(
      updateDance(
        dance.id,
        danceInput({ nameEn: "Viennese Waltz", minTierRank: 3 }),
      ).pipe(Effect.provide(layer)),
    );
    expect(updated.nameEn).toBe("Viennese Waltz");
    expect(updated.minTierRank).toBe(3);

    const missing = await Effect.runPromise(
      updateDance("00000000-0000-0000-0000-000000000000", danceInput()).pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(missing)).toBe(true);
    if (Either.isLeft(missing)) {
      expect(missing.left).toBeInstanceOf(DanceNotFound);
    }
  });

  it("toggles the publish flag", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));

    const published = await run(
      setDancePublished(dance.id, true).pipe(Effect.provide(layer)),
    );
    expect(published.published).toBe(true);
  });
});

describe("videos", () => {
  it("requires an existing parent Dance", async () => {
    const layer = await makeTestDatabaseLayer();
    const result = await Effect.runPromise(
      createVideo(videoInput("00000000-0000-0000-0000-000000000000")).pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(DanceNotFound);
    }
  });

  it("belongs to one Dance and one Level and carries its Tags", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));
    const t1 = await run(
      createTag({ labelEs: "giros", labelEn: "turns" }).pipe(
        Effect.provide(layer),
      ),
    );
    const t2 = await run(
      createTag({ labelEs: "postura", labelEn: "posture" }).pipe(
        Effect.provide(layer),
      ),
    );

    const video = await run(
      createVideo(
        videoInput(dance.id, {
          level: "intermedio",
          tagIds: [t1.id, t2.id],
        }),
      ).pipe(Effect.provide(layer)),
    );
    expect(video.danceId).toBe(dance.id);
    expect(video.level).toBe("intermedio");

    const fetched = await run(getVideo(video.id).pipe(Effect.provide(layer)));
    expect(fetched?.tags.map((t) => t.labelEn).sort()).toEqual([
      "posture",
      "turns",
    ]);
  });

  it("resyncs the Tag set on edit (2 → 1 → 0)", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));
    const t1 = await run(
      createTag({ labelEs: "a", labelEn: "a" }).pipe(Effect.provide(layer)),
    );
    const t2 = await run(
      createTag({ labelEs: "b", labelEn: "b" }).pipe(Effect.provide(layer)),
    );
    const video = await run(
      createVideo(
        videoInput(dance.id, { tagIds: [t1.id, t2.id] }),
      ).pipe(Effect.provide(layer)),
    );

    await run(
      updateVideo(video.id, videoInput(dance.id, { tagIds: [t1.id] })).pipe(
        Effect.provide(layer),
      ),
    );
    let fetched = await run(getVideo(video.id).pipe(Effect.provide(layer)));
    expect(fetched?.tags).toHaveLength(1);

    await run(
      updateVideo(video.id, videoInput(dance.id, { tagIds: [] })).pipe(
        Effect.provide(layer),
      ),
    );
    fetched = await run(getVideo(video.id).pipe(Effect.provide(layer)));
    expect(fetched?.tags).toHaveLength(0);
  });

  it("rejects editing an unknown Video", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));
    const result = await Effect.runPromise(
      updateVideo(
        "00000000-0000-0000-0000-000000000000",
        videoInput(dance.id),
      ).pipe(Effect.provide(layer), Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(VideoNotFound);
    }
  });

  it("lists a Dance's Videos ordered by Level (Primeras veces → Max)", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));

    // Insert out of Level order.
    await run(
      createVideo(videoInput(dance.id, { level: "max", titleEs: "z" })).pipe(
        Effect.provide(layer),
      ),
    );
    await run(
      createVideo(
        videoInput(dance.id, { level: "primeras_veces", titleEs: "a" }),
      ).pipe(Effect.provide(layer)),
    );
    await run(
      createVideo(
        videoInput(dance.id, { level: "avanzado", titleEs: "m" }),
      ).pipe(Effect.provide(layer)),
    );

    const list = await run(
      listVideosByDance(dance.id).pipe(Effect.provide(layer)),
    );
    expect(list.map((v) => v.level)).toEqual([
      "primeras_veces",
      "avanzado",
      "max",
    ]);
  });

  it("toggles a Video's publish flag", async () => {
    const layer = await makeTestDatabaseLayer();
    const dance = await run(createDance(danceInput()).pipe(Effect.provide(layer)));
    const video = await run(
      createVideo(videoInput(dance.id)).pipe(Effect.provide(layer)),
    );
    const published = await run(
      setVideoPublished(video.id, true).pipe(Effect.provide(layer)),
    );
    expect(published.published).toBe(true);
  });
});

describe("tags", () => {
  it("creates Tags and lists them alphabetically by Spanish label", async () => {
    const layer = await makeTestDatabaseLayer();
    await run(
      createTag({ labelEs: "zamba", labelEn: "zamba" }).pipe(
        Effect.provide(layer),
      ),
    );
    await run(
      createTag({ labelEs: "abrazo", labelEn: "embrace" }).pipe(
        Effect.provide(layer),
      ),
    );

    const list = await run(listTags().pipe(Effect.provide(layer)));
    expect(list.map((t) => t.labelEs)).toEqual(["abrazo", "zamba"]);
  });
});
