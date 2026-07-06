import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { sessions } from "~/db/schema";
import { Database } from "./Database";

export type Session = typeof sessions.$inferSelect;

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

export const destroySession = (
  id: string,
): Effect.Effect<void, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    yield* Effect.promise(() =>
      db.delete(sessions).where(eq(sessions.id, id)),
    );
  });
