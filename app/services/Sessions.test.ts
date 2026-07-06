import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import { createSession, destroySession, findSessionById } from "./Sessions";

describe("sessions", () => {
  it("creates a session, finds it, and destroys it on logout", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("session@example.com", "password123").pipe(Effect.provide(layer)),
    );

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
