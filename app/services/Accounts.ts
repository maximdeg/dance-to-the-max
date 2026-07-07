import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import { accounts } from "~/db/schema";
import { Database } from "./Database";
import { hashPassword, verifyPassword } from "./password";
import { destroyOtherSessions } from "./Sessions";

export type Account = typeof accounts.$inferSelect;

export class EmailAlreadyInUse extends Data.TaggedError("EmailAlreadyInUse")<{
  readonly email: string;
}> {}

export class InvalidCredentials extends Data.TaggedError(
  "InvalidCredentials",
)<{}> {}

/** Correct credentials, but the Account has been blocked by an Admin. */
export class AccountBlocked extends Data.TaggedError("AccountBlocked")<{}> {}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * Create an Account. Public signup ALWAYS assigns the `subscriber` role — this
 * function takes no role argument, so there is no way for a Visitor to request
 * `admin`/`super_admin`. Elevation happens through separate, privileged flows.
 */
export const signup = (
  email: string,
  password: string,
): Effect.Effect<Account, EmailAlreadyInUse, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const normalized = normalizeEmail(email);

    const existing = yield* Effect.promise(() =>
      db.select().from(accounts).where(eq(accounts.email, normalized)).limit(1),
    );
    if (existing.length > 0) {
      return yield* new EmailAlreadyInUse({ email: normalized });
    }

    const passwordHash = yield* hashPassword(password);
    const inserted = yield* Effect.promise(() =>
      db
        .insert(accounts)
        .values({ email: normalized, passwordHash, role: "subscriber" })
        .returning(),
    );

    const account = inserted[0];
    if (!account) {
      return yield* Effect.dieMessage("account insert returned no row");
    }
    return account;
  });

export const verifyCredentials = (
  email: string,
  password: string,
): Effect.Effect<Account, InvalidCredentials | AccountBlocked, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const normalized = normalizeEmail(email);

    const rows = yield* Effect.promise(() =>
      db.select().from(accounts).where(eq(accounts.email, normalized)).limit(1),
    );
    const account = rows[0];
    // Verify a hash even when the account is missing would be ideal to avoid
    // user-enumeration timing; for v1 the same error is returned either way.
    if (!account) {
      return yield* new InvalidCredentials();
    }

    const ok = yield* verifyPassword(password, account.passwordHash);
    if (!ok) {
      return yield* new InvalidCredentials();
    }
    // Checked only after the password verifies, so blocked status is never
    // revealed to someone who doesn't already hold valid credentials.
    if (account.blocked) {
      return yield* new AccountBlocked();
    }
    return account;
  });

export const findAccountById = (
  id: string,
): Effect.Effect<Account | null, never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const rows = yield* Effect.promise(() =>
      db.select().from(accounts).where(eq(accounts.id, id)).limit(1),
    );
    return rows[0] ?? null;
  });

/**
 * Change the password of an authenticated Account after verifying the current
 * one. Every OTHER Session is invalidated (the caller passes the Session to
 * keep), so a password change signs the account out everywhere else.
 */
export const changePassword = (
  accountId: string,
  currentPassword: string,
  newPassword: string,
  keepSessionId: string,
): Effect.Effect<Account, InvalidCredentials, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;

    const account = yield* findAccountById(accountId);
    if (!account) {
      return yield* new InvalidCredentials();
    }

    const ok = yield* verifyPassword(currentPassword, account.passwordHash);
    if (!ok) {
      return yield* new InvalidCredentials();
    }

    const passwordHash = yield* hashPassword(newPassword);
    const updated = yield* Effect.promise(() =>
      db
        .update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.id, accountId))
        .returning(),
    );

    yield* destroyOtherSessions(accountId, keepSessionId);

    const next = updated[0];
    if (!next) {
      return yield* Effect.dieMessage("account update returned no row");
    }
    return next;
  });
