import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import {
  EmailAlreadyInUse,
  signup,
  verifyCredentials,
} from "./Accounts";

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
});
