import { eq } from "drizzle-orm";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { sessions } from "../db/schema";
import { signup } from "./Accounts";
import { Database } from "./Database";
import {
  createSession,
  destroySession,
  establishSession,
  findSessionById,
  resolveSession,
} from "./Sessions";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const daysAgo = (n: number): Date =>
  new Date(Date.now() - n * 24 * 60 * 60 * 1000);

const establish = (layer: TestLayer, accountId: string) =>
  Effect.runPromise(establishSession(accountId).pipe(Effect.provide(layer)));

/** Backdate a Session's activity clock to simulate idle time. */
const setLastSeen = (layer: TestLayer, id: string, at: Date) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* Database;
      yield* Effect.promise(() =>
        db.update(sessions).set({ lastSeenAt: at }).where(eq(sessions.id, id)),
      );
    }).pipe(Effect.provide(layer)),
  );

const sessionIds = (layer: TestLayer, accountId: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* Database;
      const rows = yield* Effect.promise(() =>
        db
          .select({ id: sessions.id })
          .from(sessions)
          .where(eq(sessions.accountId, accountId)),
      );
      return rows.map((row) => row.id);
    }).pipe(Effect.provide(layer)),
  );

const newAccount = async (layer: TestLayer, email: string) =>
  Effect.runPromise(signup(email, "password123").pipe(Effect.provide(layer)));

describe("sessions", () => {
  it("creates a session, finds it, and destroys it on logout", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await newAccount(layer, "session@example.com");

    const session = await Effect.runPromise(
      createSession(account.id).pipe(Effect.provide(layer)),
    );
    expect(session.accountId).toBe(account.id);

    const found = await Effect.runPromise(
      findSessionById(session.id).pipe(Effect.provide(layer)),
    );
    expect(found?.id).toBe(session.id);

    await Effect.runPromise(
      destroySession(session.id).pipe(Effect.provide(layer)),
    );

    const afterLogout = await Effect.runPromise(
      findSessionById(session.id).pipe(Effect.provide(layer)),
    );
    expect(afterLogout).toBeNull();
  });
});

describe("establishSession (3-concurrent-login cap)", () => {
  it("caps an account at 3 sessions, evicting the least-recently-active on the 4th login", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await newAccount(layer, "cap@example.com");

    const s1 = await establish(layer, account.id);
    const s2 = await establish(layer, account.id);
    const s3 = await establish(layer, account.id);
    // Distinct, still-active activity times so eviction order is deterministic.
    await setLastSeen(layer, s1.id, daysAgo(3));
    await setLastSeen(layer, s2.id, daysAgo(2));
    await setLastSeen(layer, s3.id, daysAgo(1));

    const s4 = await establish(layer, account.id);

    const ids = await sessionIds(layer, account.id);
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain(s1.id); // least-recently-active evicted
    expect(ids).toEqual(expect.arrayContaining([s2.id, s3.id, s4.id]));
  });

  it("expires sessions idle ~30 days, freeing a slot without evicting a live session", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await newAccount(layer, "expiry@example.com");

    const s1 = await establish(layer, account.id);
    const s2 = await establish(layer, account.id);
    const s3 = await establish(layer, account.id);
    await setLastSeen(layer, s1.id, daysAgo(40)); // expired
    await setLastSeen(layer, s2.id, daysAgo(2));
    await setLastSeen(layer, s3.id, daysAgo(1));

    const s4 = await establish(layer, account.id);

    const ids = await sessionIds(layer, account.id);
    expect(ids).toHaveLength(3);
    expect(ids).not.toContain(s1.id); // expired one purged…
    expect(ids).toEqual(expect.arrayContaining([s2.id, s3.id, s4.id])); // …no live session evicted
  });

  it("keeps each account's cap independent", async () => {
    const layer = await makeTestDatabaseLayer();
    const a = await newAccount(layer, "a@example.com");
    const b = await newAccount(layer, "b@example.com");

    for (let i = 0; i < 4; i++) await establish(layer, a.id);
    for (let i = 0; i < 2; i++) await establish(layer, b.id);

    expect(await sessionIds(layer, a.id)).toHaveLength(3);
    expect(await sessionIds(layer, b.id)).toHaveLength(2);
  });
});

describe("resolveSession (expiry + activity refresh)", () => {
  it("returns null and deletes a session idle past the TTL", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await newAccount(layer, "stale@example.com");
    const session = await establish(layer, account.id);
    await setLastSeen(layer, session.id, daysAgo(31));

    const resolved = await Effect.runPromise(
      resolveSession(session.id).pipe(Effect.provide(layer)),
    );
    expect(resolved).toBeNull();

    const found = await Effect.runPromise(
      findSessionById(session.id).pipe(Effect.provide(layer)),
    );
    expect(found).toBeNull(); // purged, not just hidden
  });

  it("refreshes lastSeenAt for an active session", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await newAccount(layer, "active@example.com");
    const session = await establish(layer, account.id);
    const stale = daysAgo(1);
    await setLastSeen(layer, session.id, stale);

    const resolved = await Effect.runPromise(
      resolveSession(session.id).pipe(Effect.provide(layer)),
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.lastSeenAt.getTime()).toBeGreaterThan(stale.getTime());
  });
});
