import { eq } from "drizzle-orm";
import { Effect, Either, Layer } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { passwordResetTokens } from "../db/schema";
import { signup, verifyCredentials } from "./Accounts";
import { Database } from "./Database";
import { Mailer, type PasswordResetEmail } from "./Mailer";
import {
  InvalidResetToken,
  requestPasswordReset,
  resetPassword,
} from "./PasswordReset";
import { establishSession, findSessionById } from "./Sessions";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

/** A Mailer that records what it was asked to send, for assertions. */
const makeCapturingMailer = () => {
  const sent: PasswordResetEmail[] = [];
  const layer = Layer.succeed(Mailer, {
    sendPasswordReset: (email) =>
      Effect.sync(() => {
        sent.push(email);
      }),
  });
  return { sent, layer };
};

/** Force every reset token on an account to look expired. */
const expireTokens = (dbLayer: TestLayer, accountId: string) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* Database;
      yield* Effect.promise(() =>
        db
          .update(passwordResetTokens)
          .set({ expiresAt: new Date(Date.now() - 1000) })
          .where(eq(passwordResetTokens.accountId, accountId)),
      );
    }).pipe(Effect.provide(dbLayer)),
  );

const newAccount = (dbLayer: TestLayer, email: string) =>
  Effect.runPromise(
    signup(email, "password123").pipe(Effect.provide(dbLayer)),
  );

describe("requestPasswordReset", () => {
  it("emails a token for a known account", async () => {
    const dbLayer = await makeTestDatabaseLayer();
    const { sent, layer: mailer } = makeCapturingMailer();
    await newAccount(dbLayer, "known@example.com");

    await Effect.runPromise(
      requestPasswordReset("KNOWN@example.com").pipe(
        Effect.provide(Layer.merge(dbLayer, mailer)),
      ),
    );

    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("known@example.com");
    expect(sent[0]?.token).toBeTruthy();
  });

  it("is a silent no-op for an unknown email (no enumeration)", async () => {
    const dbLayer = await makeTestDatabaseLayer();
    const { sent, layer: mailer } = makeCapturingMailer();

    await Effect.runPromise(
      requestPasswordReset("ghost@example.com").pipe(
        Effect.provide(Layer.merge(dbLayer, mailer)),
      ),
    );

    expect(sent).toHaveLength(0);
  });
});

describe("resetPassword", () => {
  it("sets a new password from a valid token and signs out all sessions", async () => {
    const dbLayer = await makeTestDatabaseLayer();
    const { sent, layer: mailer } = makeCapturingMailer();
    const account = await newAccount(dbLayer, "reset@example.com");
    const s1 = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(dbLayer)),
    );
    const s2 = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(dbLayer)),
    );

    await Effect.runPromise(
      requestPasswordReset("reset@example.com").pipe(
        Effect.provide(Layer.merge(dbLayer, mailer)),
      ),
    );
    const token = sent[0]!.token;

    const updated = await Effect.runPromise(
      resetPassword(token, "brandnew789").pipe(Effect.provide(dbLayer)),
    );
    expect(updated.id).toBe(account.id);

    // New password works, old one doesn't.
    await Effect.runPromise(
      verifyCredentials("reset@example.com", "brandnew789").pipe(
        Effect.provide(dbLayer),
      ),
    );
    const oldLogin = await Effect.runPromise(
      verifyCredentials("reset@example.com", "password123").pipe(
        Effect.provide(dbLayer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(oldLogin)).toBe(true);

    // A reset signs out every device.
    expect(
      await Effect.runPromise(
        findSessionById(s1.id).pipe(Effect.provide(dbLayer)),
      ),
    ).toBeNull();
    expect(
      await Effect.runPromise(
        findSessionById(s2.id).pipe(Effect.provide(dbLayer)),
      ),
    ).toBeNull();
  });

  it("rejects a token that has already been used", async () => {
    const dbLayer = await makeTestDatabaseLayer();
    const { sent, layer: mailer } = makeCapturingMailer();
    await newAccount(dbLayer, "reuse@example.com");
    await Effect.runPromise(
      requestPasswordReset("reuse@example.com").pipe(
        Effect.provide(Layer.merge(dbLayer, mailer)),
      ),
    );
    const token = sent[0]!.token;

    await Effect.runPromise(
      resetPassword(token, "firstchange1").pipe(Effect.provide(dbLayer)),
    );

    const second = await Effect.runPromise(
      resetPassword(token, "secondchange2").pipe(
        Effect.provide(dbLayer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(second)).toBe(true);
    if (Either.isLeft(second)) {
      expect(second.left).toBeInstanceOf(InvalidResetToken);
    }
  });

  it("rejects an expired token", async () => {
    const dbLayer = await makeTestDatabaseLayer();
    const { sent, layer: mailer } = makeCapturingMailer();
    const account = await newAccount(dbLayer, "expired@example.com");
    await Effect.runPromise(
      requestPasswordReset("expired@example.com").pipe(
        Effect.provide(Layer.merge(dbLayer, mailer)),
      ),
    );
    const token = sent[0]!.token;
    await expireTokens(dbLayer, account.id);

    const result = await Effect.runPromise(
      resetPassword(token, "willnotwork1").pipe(
        Effect.provide(dbLayer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidResetToken);
    }
  });

  it("rejects an unknown token", async () => {
    const dbLayer = await makeTestDatabaseLayer();

    const result = await Effect.runPromise(
      resetPassword("not-a-real-token", "whatever12").pipe(
        Effect.provide(dbLayer),
        Effect.either,
      ),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left).toBeInstanceOf(InvalidResetToken);
    }
  });
});
