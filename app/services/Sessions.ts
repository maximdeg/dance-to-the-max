import { and, asc, eq, inArray, lt } from "drizzle-orm";
import { Effect } from "effect";
import { sessions } from "~/db/schema";
import { Database } from "./Database";

export type Session = typeof sessions.$inferSelect;

/** Maximum number of concurrent (non-expired) Sessions per Account (ADR-0004). */
export const MAX_CONCURRENT_SESSIONS = 3;

/** A Session inactive for longer than this is treated as expired (~30 days). */
export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * On an authenticated request `lastSeenAt` is only bumped once it is at least
 * this stale, so a busy Session doesn't incur a write on every request.
 */
const TOUCH_THROTTLE_MS = 5 * 60 * 1000;

const expiryCutoff = (now: Date): Date =>
  new Date(now.getTime() - SESSION_TTL_MS);

/** Low-level insert of a Session row (no cap enforcement). */
export const createSession = (
  accountId: string,
): Effect.Effect<Session, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const inserted = yield* Effect.promise(() =>
      db.insert(sessions).values({ accountId }).returning(),
    );
    const session = inserted[0];
    if (!session) {
      return yield* Effect.dieMessage("session insert returned no row");
    }
    return session;
  });

/**
 * Create a login Session while enforcing the 3-concurrent-Session cap.
 *
 * Expired Sessions for the Account are purged first — they free a slot without
 * evicting a live one. If the Account is still at the cap, the least-recently-
 * active Session is ended so the new login always succeeds (ADR-0004: the cap
 * counts logins, not simultaneous streams).
 */
export const establishSession = (
  accountId: string,
): Effect.Effect<Session, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const now = new Date();

    // Purge this Account's expired Sessions so they don't count toward the cap.
    yield* Effect.promise(() =>
      db
        .delete(sessions)
        .where(
          and(
            eq(sessions.accountId, accountId),
            lt(sessions.lastSeenAt, expiryCutoff(now)),
          ),
        ),
    );

    // Evict the oldest live Sessions until there is room for one more.
    const active = yield* Effect.promise(() =>
      db
        .select({ id: sessions.id })
        .from(sessions)
        .where(eq(sessions.accountId, accountId))
        .orderBy(asc(sessions.lastSeenAt)),
    );
    const excess = active.length - (MAX_CONCURRENT_SESSIONS - 1);
    if (excess > 0) {
      const evict = active.slice(0, excess).map((row) => row.id);
      yield* Effect.promise(() =>
        db.delete(sessions).where(inArray(sessions.id, evict)),
      );
    }

    return yield* createSession(accountId);
  });

export const findSessionById = (
  id: string,
): Effect.Effect<Session | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(sessions).where(eq(sessions.id, id)).limit(1),
    );
    return rows[0] ?? null;
  });

/**
 * Resolve a Session for an authenticated request. Returns `null` (and deletes
 * the row) when it is missing or expired; otherwise refreshes `lastSeenAt`
 * (throttled) so active use keeps the Session alive and off the eviction block.
 */
export const resolveSession = (
  id: string,
): Effect.Effect<Session | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(sessions).where(eq(sessions.id, id)).limit(1),
    );
    const session = rows[0] ?? null;
    if (!session) return null;

    const now = new Date();
    if (session.lastSeenAt < expiryCutoff(now)) {
      yield* Effect.promise(() =>
        db.delete(sessions).where(eq(sessions.id, id)),
      );
      return null;
    }

    if (now.getTime() - session.lastSeenAt.getTime() > TOUCH_THROTTLE_MS) {
      yield* Effect.promise(() =>
        db.update(sessions).set({ lastSeenAt: now }).where(eq(sessions.id, id)),
      );
      return { ...session, lastSeenAt: now };
    }

    return session;
  });

export const destroySession = (
  id: string,
): Effect.Effect<void, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    yield* Effect.promise(() =>
      db.delete(sessions).where(eq(sessions.id, id)),
    );
  });
