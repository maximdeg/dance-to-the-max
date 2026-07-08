import { and, eq, sql } from "drizzle-orm";
import { Effect } from "effect";
import { resumePoints } from "~/db/schema";
import { Database } from "./Database";

/**
 * Engagement owns per-Subscriber engagement state. This module is the Resume
 * Point / Progress half; Favorites and Playlists (Phase-2 feature B) will extend
 * it. A **Resume Point** is a Subscriber's last playback position on one Video;
 * **Progress** (unstarted / in-progress / watched) is derived from it.
 */

export type ResumePoint = typeof resumePoints.$inferSelect;

/** Fraction of a Video's duration at which it auto-marks as watched. */
export const WATCHED_THRESHOLD = 0.9;

export interface SaveResumePointInput {
  readonly accountId: string;
  readonly videoId: string;
  readonly positionSeconds: number;
  /** Total Video length; when > 0 it drives the ≥90% auto-watched rule. */
  readonly durationSeconds: number;
}

/**
 * Upsert the Subscriber's Resume Point for a Video (last write wins on
 * position). `watched` latches on once ~90% is reached and stays set on later
 * saves — only `markUnwatched` (a later slice) clears it — so finishing a Video
 * keeps it out of Continue Watching even on a re-watch.
 */
export const saveResumePoint = (
  input: SaveResumePointInput,
): Effect.Effect<ResumePoint, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const position = Math.max(0, Math.floor(input.positionSeconds));
    const reachedEnd =
      input.durationSeconds > 0 &&
      position / input.durationSeconds >= WATCHED_THRESHOLD;

    const rows = yield* Effect.promise(() =>
      db
        .insert(resumePoints)
        .values({
          accountId: input.accountId,
          videoId: input.videoId,
          positionSeconds: position,
          watched: reachedEnd,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [resumePoints.accountId, resumePoints.videoId],
          set: {
            positionSeconds: position,
            watched: sql`${resumePoints.watched} or ${reachedEnd}`,
            updatedAt: new Date(),
          },
        })
        .returning(),
    );

    const row = rows[0];
    if (!row) {
      return yield* Effect.dieMessage("resume point upsert returned no row");
    }
    return row;
  });

/** The Subscriber's Resume Point for one Video, or null if they've not started it. */
export const getResumePoint = (
  accountId: string,
  videoId: string,
): Effect.Effect<ResumePoint | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select()
        .from(resumePoints)
        .where(
          and(
            eq(resumePoints.accountId, accountId),
            eq(resumePoints.videoId, videoId),
          ),
        )
        .limit(1),
    );
    return rows[0] ?? null;
  });
