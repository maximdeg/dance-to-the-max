import { asc, count, eq, inArray } from "drizzle-orm";
import { Data, Effect } from "effect";
import { isStaff } from "~/auth/roles";
import { commentReports, comments } from "~/db/schema";
import { findAccountById } from "./Accounts";
import { getPlayableVideo } from "./Catalog";
import { Database } from "./Database";
import { isEntitledTo } from "./Entitlement";
import { getEntitlement } from "./Subscriptions";

export type Comment = typeof comments.$inferSelect;

/** The Subscriber isn't entitled to this Video's Dance (or it isn't visible). */
export class CommentNotAllowed extends Data.TaggedError(
  "CommentNotAllowed",
)<{}> {}

/** The acting Account isn't allowed to perform this action. */
export class NotAuthorized extends Data.TaggedError("NotAuthorized")<{}> {}

export class CommentNotFound extends Data.TaggedError("CommentNotFound")<{
  readonly id: string;
}> {}

export interface ThreadReply {
  readonly id: string;
  readonly body: string;
  readonly createdAt: Date;
  /** Hidden by moderation — only present in the thread for staff viewers. */
  readonly hidden: boolean;
  /** Times reported (only computed for staff; 0 for Subscribers). */
  readonly reportCount: number;
}

export interface ThreadComment {
  readonly id: string;
  readonly authorId: string;
  readonly body: string;
  readonly createdAt: Date;
  readonly hidden: boolean;
  readonly reportCount: number;
  readonly replies: ThreadReply[];
}

/**
 * The Video (with its Dance) only when `accountId` is *entitled* to it — the
 * same gate as Playback. Null when the Video is hidden/absent or the Tier
 * doesn't reach it. This is the gate for posting a Comment.
 */
const loadEntitledVideo = (accountId: string, videoId: string) =>
  Effect.gen(function* () {
    const playable = yield* getPlayableVideo(videoId);
    if (!playable) return null;
    const entitlement = yield* getEntitlement(accountId);
    return isEntitledTo(entitlement, playable.dance) ? playable : null;
  });

/**
 * Whether `accountId` may read the thread on `videoId`: staff always may (to
 * moderate and reply), and an entitled Subscriber may. Absent/hidden Video → no.
 */
const canReadThread = (accountId: string, videoId: string) =>
  Effect.gen(function* () {
    const playable = yield* getPlayableVideo(videoId);
    if (!playable) return false;
    const account = yield* findAccountById(accountId);
    if (!account) return false;
    if (isStaff(account.role)) return true;
    const entitlement = yield* getEntitlement(accountId);
    return isEntitledTo(entitlement, playable.dance);
  });

const getCommentById = (
  id: string,
): Effect.Effect<Comment | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(comments).where(eq(comments.id, id)).limit(1),
    );
    return rows[0] ?? null;
  });

/**
 * Post a top-level Comment on a Video. Entitlement-gated: only a Subscriber
 * whose Tier unlocks the Video's Dance may post.
 */
export const postComment = (
  accountId: string,
  videoId: string,
  body: string,
): Effect.Effect<Comment, CommentNotAllowed, Database> =>
  Effect.gen(function* () {
    const entitled = yield* loadEntitledVideo(accountId, videoId);
    if (!entitled) return yield* new CommentNotAllowed();

    const db = yield* Database;
    const inserted = yield* Effect.promise(() =>
      db.insert(comments).values({ videoId, accountId, body }).returning(),
    );
    const comment = inserted[0];
    if (!comment) {
      return yield* Effect.dieMessage("comment insert returned no row");
    }
    return comment;
  });

/**
 * The Video's thread: top-level Comments newest-first, each with its Admin
 * replies in chronological order. A Subscriber without access sees nothing.
 * Moderation-aware: hidden Comments/replies are dropped for a Subscriber but
 * kept (flagged, with report counts) for staff so they can moderate.
 */
export const listThread = (
  accountId: string,
  videoId: string,
): Effect.Effect<ThreadComment[], CommentNotAllowed, Database> =>
  Effect.gen(function* () {
    const playable = yield* getPlayableVideo(videoId);
    if (!playable) return yield* new CommentNotAllowed();
    const account = yield* findAccountById(accountId);
    if (!account) return yield* new CommentNotAllowed();

    const viewerIsStaff = isStaff(account.role);
    if (!viewerIsStaff) {
      const entitlement = yield* getEntitlement(accountId);
      if (!isEntitledTo(entitlement, playable.dance)) {
        return yield* new CommentNotAllowed();
      }
    }

    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db
        .select()
        .from(comments)
        .where(eq(comments.videoId, videoId))
        .orderBy(asc(comments.createdAt)),
    );

    // Report counts are staff-only (a moderation signal); Subscribers see 0.
    const reportCounts = new Map<string, number>();
    if (viewerIsStaff && rows.length > 0) {
      const counts = yield* Effect.promise(() =>
        db
          .select({ commentId: commentReports.commentId, n: count() })
          .from(commentReports)
          .where(
            inArray(
              commentReports.commentId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(commentReports.commentId),
      );
      for (const row of counts) reportCounts.set(row.commentId, Number(row.n));
    }

    const visible = (row: Comment) => viewerIsStaff || !row.hidden;

    const repliesByParent = new Map<string, ThreadReply[]>();
    const tops: Comment[] = [];
    for (const row of rows) {
      if (row.parentCommentId) {
        if (!visible(row)) continue;
        const list = repliesByParent.get(row.parentCommentId) ?? [];
        list.push({
          id: row.id,
          body: row.body,
          createdAt: row.createdAt,
          hidden: row.hidden,
          reportCount: reportCounts.get(row.id) ?? 0,
        });
        repliesByParent.set(row.parentCommentId, list);
      } else {
        tops.push(row);
      }
    }

    // Newest-first top-level (hidden ones dropped for Subscribers, taking their
    // replies with them); replies stay chronological.
    return tops
      .filter(visible)
      .reverse()
      .map((comment) => ({
        id: comment.id,
        authorId: comment.accountId,
        body: comment.body,
        createdAt: comment.createdAt,
        hidden: comment.hidden,
        reportCount: reportCounts.get(comment.id) ?? 0,
        replies: repliesByParent.get(comment.id) ?? [],
      }));
  });

/**
 * Reply to a Comment as the studio. Authorized for staff only (Admin or Super
 * Admin), and only to a top-level Comment — one reply level, no replies to
 * replies.
 */
export const replyToComment = (
  accountId: string,
  commentId: string,
  body: string,
): Effect.Effect<Comment, NotAuthorized | CommentNotFound, Database> =>
  Effect.gen(function* () {
    const account = yield* findAccountById(accountId);
    if (!account || !isStaff(account.role)) {
      return yield* new NotAuthorized();
    }

    const parent = yield* getCommentById(commentId);
    if (!parent || parent.parentCommentId !== null) {
      return yield* new CommentNotFound({ id: commentId });
    }

    const db = yield* Database;
    const inserted = yield* Effect.promise(() =>
      db
        .insert(comments)
        .values({
          videoId: parent.videoId,
          accountId,
          parentCommentId: commentId,
          body,
        })
        .returning(),
    );
    const reply = inserted[0];
    if (!reply) return yield* Effect.dieMessage("reply insert returned no row");
    return reply;
  });

/**
 * Delete a Comment (or reply). Authorized only for its author — a Subscriber can
 * retract their own, never someone else's. Deleting a top-level Comment cascades
 * to its replies. (Admin removal of others' Comments is moderation, #18.)
 */
export const deleteComment = (
  accountId: string,
  commentId: string,
): Effect.Effect<void, NotAuthorized | CommentNotFound, Database> =>
  Effect.gen(function* () {
    const comment = yield* getCommentById(commentId);
    if (!comment) return yield* new CommentNotFound({ id: commentId });
    if (comment.accountId !== accountId) return yield* new NotAuthorized();

    const db = yield* Database;
    yield* Effect.promise(() =>
      db.delete(comments).where(eq(comments.id, commentId)),
    );
  });

/**
 * Moderation: hide or unhide any Comment or reply. Staff only. A hidden row
 * stays in the table but drops out of the Subscriber-facing thread.
 */
export const setCommentHidden = (
  actorId: string,
  commentId: string,
  hidden: boolean,
): Effect.Effect<Comment, NotAuthorized | CommentNotFound, Database> =>
  Effect.gen(function* () {
    const actor = yield* findAccountById(actorId);
    if (!actor || !isStaff(actor.role)) return yield* new NotAuthorized();

    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(comments)
        .set({ hidden })
        .where(eq(comments.id, commentId))
        .returning(),
    );
    const comment = updated[0];
    if (!comment) return yield* new CommentNotFound({ id: commentId });
    return comment;
  });

/**
 * Moderation: permanently remove any Comment or reply, regardless of author.
 * Staff only. Removing a top-level Comment cascades to its replies.
 */
export const removeComment = (
  actorId: string,
  commentId: string,
): Effect.Effect<void, NotAuthorized | CommentNotFound, Database> =>
  Effect.gen(function* () {
    const actor = yield* findAccountById(actorId);
    if (!actor || !isStaff(actor.role)) return yield* new NotAuthorized();

    const existing = yield* getCommentById(commentId);
    if (!existing) return yield* new CommentNotFound({ id: commentId });

    const db = yield* Database;
    yield* Effect.promise(() =>
      db.delete(comments).where(eq(comments.id, commentId)),
    );
  });

/**
 * Report a Comment for Admin review. Allowed for anyone who can read the thread
 * (an entitled Subscriber or staff). Idempotent per reporter — a second report
 * of the same Comment by the same Account is a no-op, so counts can't be gamed.
 */
export const reportComment = (
  reporterId: string,
  commentId: string,
): Effect.Effect<void, CommentNotAllowed | CommentNotFound, Database> =>
  Effect.gen(function* () {
    const comment = yield* getCommentById(commentId);
    if (!comment) return yield* new CommentNotFound({ id: commentId });

    const allowed = yield* canReadThread(reporterId, comment.videoId);
    if (!allowed) return yield* new CommentNotAllowed();

    const db = yield* Database;
    yield* Effect.promise(() =>
      db
        .insert(commentReports)
        .values({ commentId, reporterId })
        .onConflictDoNothing({
          target: [commentReports.commentId, commentReports.reporterId],
        }),
    );
  });
