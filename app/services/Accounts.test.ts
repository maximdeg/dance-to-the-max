import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import {
  AccountBlocked,
  changePassword,
  EmailAlreadyInUse,
  InvalidCredentials,
  signup,
  verifyCredentials,
} from "./Accounts";
import { setAccountBlocked } from "./AdminConsole";
import { establishSession, findSessionById } from "./Sessions";

describe("signup", () => {
  it("creates an Account with the subscriber role and a normalized email", async () => {
    const layer = await makeTestDatabaseLayer();

    const account = await Effect.runPromise(
      signup("  New@Example.com ", "password123").pipe(Effect.provide(layer)),
    );

    // The role-assignment rule: public signup is always a subscriber and takes
    // no role argument, so Admin / Super Admin can never be requested here.
    expect(account.role).toBe("subscriber");
    expect(account.email).toBe("new@example.com");
    expect(account.passwordHash).not.toContain("password123");
  });

  it("rejects a duplicate email case-insensitively", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(
      signup("dup@example.com", "password123").pipe(Effect.provide(layer)),
    );

    const result = await Effect.runPromise(
      signup("DUP@Example.com", "password123").pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );

    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(EmailAlreadyInUse);
    }
  });
});

describe("verifyCredentials", () => {
  it("accepts the correct password and returns the Account", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(
      signup("user@example.com", "password123").pipe(Effect.provide(layer)),
    );

    const account = await Effect.runPromise(
      verifyCredentials("USER@example.com", "password123").pipe(
        Effect.provide(layer),
      ),
    );
    expect(account.email).toBe("user@example.com");
  });

  it("rejects a wrong password", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(
      signup("user@example.com", "password123").pipe(Effect.provide(layer)),
    );

    const result = await Effect.runPromise(
      verifyCredentials("user@example.com", "nope").pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
  });

  it("rejects an unknown email", async () => {
    const layer = await makeTestDatabaseLayer();

    const result = await Effect.runPromise(
      verifyCredentials("ghost@example.com", "whatever").pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
  });

  it("blocks a blocked Account from logging in, even with the right password", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("blocked@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await Effect.runPromise(
      setAccountBlocked(account.id, true).pipe(Effect.provide(layer)),
    );

    const result = await Effect.runPromise(
      verifyCredentials("blocked@example.com", "password123").pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(AccountBlocked);
    }
  });

  it("doesn't reveal blocked status to a wrong password", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("blocked2@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await Effect.runPromise(
      setAccountBlocked(account.id, true).pipe(Effect.provide(layer)),
    );

    const result = await Effect.runPromise(
      verifyCredentials("blocked2@example.com", "wrong").pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    // Wrong password → generic InvalidCredentials, not AccountBlocked.
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCredentials);
    }
  });
});

describe("changePassword", () => {
  it("changes the password and signs out every OTHER session", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("change@example.com", "password123").pipe(Effect.provide(layer)),
    );
    const current = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(layer)),
    );
    const other = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(layer)),
    );

    await Effect.runPromise(
      changePassword(
        account.id,
        "password123",
        "newpassword456",
        current.id,
      ).pipe(Effect.provide(layer)),
    );

    // New password works, old one no longer does.
    await Effect.runPromise(
      verifyCredentials("change@example.com", "newpassword456").pipe(
        Effect.provide(layer),
      ),
    );
    const oldLogin = await Effect.runPromise(
      verifyCredentials("change@example.com", "password123").pipe(
        Effect.provide(layer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(oldLogin)).toBe(true);

    // The device that changed it stays signed in; the other is signed out.
    const keptSession = await Effect.runPromise(
      findSessionById(current.id).pipe(Effect.provide(layer)),
    );
    const otherSession = await Effect.runPromise(
      findSessionById(other.id).pipe(Effect.provide(layer)),
    );
    expect(keptSession).not.toBeNull();
    expect(otherSession).toBeNull();
  });

  it("rejects a wrong current password without changing anything", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("guard@example.com", "password123").pipe(Effect.provide(layer)),
    );
    const current = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(layer)),
    );
    const other = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(layer)),
    );

    const result = await Effect.runPromise(
      changePassword(
        account.id,
        "wrong-password",
        "newpassword456",
        current.id,
      ).pipe(Effect.provide(layer), Effect.either),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidCredentials);
    }

    // Original password still valid and no session was touched.
    await Effect.runPromise(
      verifyCredentials("guard@example.com", "password123").pipe(
        Effect.provide(layer),
      ),
    );
    const otherSession = await Effect.runPromise(
      findSessionById(other.id).pipe(Effect.provide(layer)),
    );
    expect(otherSession).not.toBeNull();
  });
});
