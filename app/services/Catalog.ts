import { and, asc, eq, exists, sql } from "drizzle-orm";
import { Effect } from "effect";
import { dances, tags, videos, videoTags } from "~/db/schema";
import { LEVELS, type Dance, type Level, type Video } from "./Content";
import { Database } from "./Database";

/**
 * The Subscriber-facing Catalog: a read model over the same tables the Super
 * Admin authors, with the two-level publish rule baked into every query — a
 * Video is visible only when both it AND its parent Dance are published.
 * (Entitlement — which Dances a Tier unlocks — is layered on in #8.)
 */

export interface LevelGroup {
  readonly level: Level;
  readonly videos: Video[];
}

export interface CatalogDance {
  readonly dance: Dance;
  readonly groups: LevelGroup[];
}

export type CatalogVideo = Video & {
  readonly danceNameEs: string;
  readonly danceNameEn: string;
};

export interface CatalogFilters {
  readonly level?: Level;
  readonly tagId?: string;
}

/**
 * Published Dances that have at least one published Video. A published Dance
 * whose Videos are all drafts is hidden from the Catalog (it still shows to the
 * Super Admin through the admin surfaces).
 */
export const listPublishedDances = (): Effect.Effect<
  Dance[],
  never,
  Database
> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db
        .select()
        .from(dances)
        .where(
          and(
            eq(dances.published, true),
            exists(
              db
                .select({ one: sql`1` })
                .from(videos)
                .where(
                  and(
                    eq(videos.danceId, dances.id),
                    eq(videos.published, true),
                  ),
                ),
            ),
          ),
        )
        .orderBy(asc(dances.nameEs)),
    );
  });

/**
 * A published Dance with its published Videos grouped by Level (Primeras veces
 * → Max, empty groups omitted). Returns null when the Dance is unpublished or
 * has no published Videos — i.e. when it is hidden from the Catalog.
 */
export const getPublishedDanceWithVideos = (
  danceId: string,
): Effect.Effect<CatalogDance | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select()
        .from(dances)
        .where(and(eq(dances.id, danceId), eq(dances.published, true)))
        .limit(1),
    );
    const dance = rows[0];
    if (!dance) return null;

    const published = yield* Effect.promise(() =>
      db
        .select()
        .from(videos)
        .where(and(eq(videos.danceId, danceId), eq(videos.published, true)))
        .orderBy(asc(videos.level), asc(videos.titleEs)),
    );
    if (published.length === 0) return null;

    const groups = LEVELS.map((level) => ({
      level,
      videos: published.filter((video) => video.level === level),
    })).filter((group) => group.videos.length > 0);

    return { dance, groups };
  });

/**
 * Published Videos (both Video and Dance published), optionally filtered by
 * Level and/or Tag, ordered by Level then title. Each row carries its Dance's
 * name for display.
 */
export const searchPublishedVideos = (
  filters: CatalogFilters = {},
): Effect.Effect<CatalogVideo[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select({
          video: videos,
          danceNameEs: dances.nameEs,
          danceNameEn: dances.nameEn,
        })
        .from(videos)
        .innerJoin(dances, eq(videos.danceId, dances.id))
        .where(
          and(
            eq(videos.published, true),
            eq(dances.published, true),
            filters.level ? eq(videos.level, filters.level) : undefined,
            filters.tagId
              ? exists(
                  db
                    .select({ one: sql`1` })
                    .from(videoTags)
                    .where(
                      and(
                        eq(videoTags.videoId, videos.id),
                        eq(videoTags.tagId, filters.tagId),
                      ),
                    ),
                )
              : undefined,
          ),
        )
        .orderBy(asc(videos.level), asc(videos.titleEs)),
    );

    return rows.map((row) => ({
      ...row.video,
      danceNameEs: row.danceNameEs,
      danceNameEn: row.danceNameEn,
    }));
  });

/** Tags that are attached to at least one visible (published) Video. */
export const listCatalogTags = (): Effect.Effect<
  (typeof tags.$inferSelect)[],
  never,
  Database
> =>
  Effect.gen(function* () {
    const db = yield* Database;
    return yield* Effect.promise(() =>
      db
        .select()
        .from(tags)
        .where(
          exists(
            db
              .select({ one: sql`1` })
              .from(videoTags)
              .innerJoin(videos, eq(videoTags.videoId, videos.id))
              .innerJoin(dances, eq(videos.danceId, dances.id))
              .where(
                and(
                  eq(videoTags.tagId, tags.id),
                  eq(videos.published, true),
                  eq(dances.published, true),
                ),
              ),
          ),
        )
        .orderBy(asc(tags.labelEs)),
    );
  });
