import { asc, eq, inArray } from "drizzle-orm";
import { Data, Effect } from "effect";
import { dances, level, tags, videos, videoTags } from "~/db/schema";
import { Database } from "./Database";

export type Dance = typeof dances.$inferSelect;
export type Video = typeof videos.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Level = (typeof level.enumValues)[number];

/** The Levels in display/sort order (Primeras veces → Max). */
export const LEVELS: readonly Level[] = level.enumValues;

export class DanceNotFound extends Data.TaggedError("DanceNotFound")<{
  readonly id: string;
}> {}

export class VideoNotFound extends Data.TaggedError("VideoNotFound")<{
  readonly id: string;
}> {}

// ---------------------------------------------------------------------------
// Dances
// ---------------------------------------------------------------------------

export interface DanceInput {
  readonly nameEs: string;
  readonly nameEn: string;
  readonly minTierRank: number;
  readonly published: boolean;
}

export const createDance = (
  input: DanceInput,
): Effect.Effect<Dance, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const inserted = yield* Effect.promise(() =>
      db.insert(dances).values(input).returning(),
    );
    const dance = inserted[0];
    if (!dance) return yield* Effect.dieMessage("dance insert returned no row");
    return dance;
  });

export const updateDance = (
  id: string,
  input: DanceInput,
): Effect.Effect<Dance, DanceNotFound, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(dances)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(dances.id, id))
        .returning(),
    );
    const dance = updated[0];
    if (!dance) return yield* new DanceNotFound({ id });
    return dance;
  });

export const setDancePublished = (
  id: string,
  published: boolean,
): Effect.Effect<Dance, DanceNotFound, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(dances)
        .set({ published, updatedAt: new Date() })
        .where(eq(dances.id, id))
        .returning(),
    );
    const dance = updated[0];
    if (!dance) return yield* new DanceNotFound({ id });
    return dance;
  });

/** Every Dance, newest first — the Super Admin sees drafts too. */
export const listDances = (): Effect.Effect<Dance[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db.select().from(dances).orderBy(asc(dances.nameEs)),
    );
  });

export const getDance = (
  id: string,
): Effect.Effect<Dance | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(dances).where(eq(dances.id, id)).limit(1),
    );
    return rows[0] ?? null;
  });

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------

export interface VideoInput {
  readonly danceId: string;
  readonly level: Level;
  readonly titleEs: string;
  readonly titleEn: string;
  readonly descriptionEs: string;
  readonly descriptionEn: string;
  readonly providerAssetId: string;
  readonly published: boolean;
  readonly tagIds: readonly string[];
}

export type VideoWithTags = Video & { readonly tags: Tag[] };

/** Replace a Video's Tag set with exactly `tagIds`. */
const syncVideoTags = (
  videoId: string,
  tagIds: readonly string[],
): Effect.Effect<void, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    yield* Effect.promise(() =>
      db.delete(videoTags).where(eq(videoTags.videoId, videoId)),
    );
    if (tagIds.length > 0) {
      yield* Effect.promise(() =>
        db
          .insert(videoTags)
          .values(tagIds.map((tagId) => ({ videoId, tagId }))),
      );
    }
  });

export const createVideo = (
  input: VideoInput,
): Effect.Effect<Video, DanceNotFound, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;

    const dance = yield* getDance(input.danceId);
    if (!dance) return yield* new DanceNotFound({ id: input.danceId });

    const { tagIds, ...columns } = input;
    const inserted = yield* Effect.promise(() =>
      db.insert(videos).values(columns).returning(),
    );
    const video = inserted[0];
    if (!video) return yield* Effect.dieMessage("video insert returned no row");

    yield* syncVideoTags(video.id, tagIds);
    return video;
  });

export const updateVideo = (
  id: string,
  input: VideoInput,
): Effect.Effect<Video, DanceNotFound | VideoNotFound, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;

    const dance = yield* getDance(input.danceId);
    if (!dance) return yield* new DanceNotFound({ id: input.danceId });

    const { tagIds, ...columns } = input;
    const updated = yield* Effect.promise(() =>
      db
        .update(videos)
        .set({ ...columns, updatedAt: new Date() })
        .where(eq(videos.id, id))
        .returning(),
    );
    const video = updated[0];
    if (!video) return yield* new VideoNotFound({ id });

    yield* syncVideoTags(id, tagIds);
    return video;
  });

export const setVideoPublished = (
  id: string,
  published: boolean,
): Effect.Effect<Video, VideoNotFound, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(videos)
        .set({ published, updatedAt: new Date() })
        .where(eq(videos.id, id))
        .returning(),
    );
    const video = updated[0];
    if (!video) return yield* new VideoNotFound({ id });
    return video;
  });

/** A Dance's Videos, ordered by Level (Primeras veces → Max) then title. */
export const listVideosByDance = (
  danceId: string,
): Effect.Effect<Video[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db
        .select()
        .from(videos)
        .where(eq(videos.danceId, danceId))
        .orderBy(asc(videos.level), asc(videos.titleEs)),
    );
  });

export const getVideo = (
  id: string,
): Effect.Effect<VideoWithTags | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(videos).where(eq(videos.id, id)).limit(1),
    );
    const video = rows[0];
    if (!video) return null;
    return { ...video, tags: yield* getVideoTags(id) };
  });

const getVideoTags = (
  videoId: string,
): Effect.Effect<Tag[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select({ tag: tags })
        .from(videoTags)
        .innerJoin(tags, eq(videoTags.tagId, tags.id))
        .where(eq(videoTags.videoId, videoId))
        .orderBy(asc(tags.labelEs)),
    );
    return rows.map((row) => row.tag);
  });

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export interface TagInput {
  readonly labelEs: string;
  readonly labelEn: string;
}

export const createTag = (
  input: TagInput,
): Effect.Effect<Tag, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const inserted = yield* Effect.promise(() =>
      db.insert(tags).values(input).returning(),
    );
    const tag = inserted[0];
    if (!tag) return yield* Effect.dieMessage("tag insert returned no row");
    return tag;
  });

export const listTags = (): Effect.Effect<Tag[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db.select().from(tags).orderBy(asc(tags.labelEs)),
    );
  });

export const findTagsByIds = (
  ids: readonly string[],
): Effect.Effect<Tag[], never, Database> =>
  Effect.gen(function* () {
    if (ids.length === 0) return [];
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db.select().from(tags).where(inArray(tags.id, [...ids])),
    );
  });
