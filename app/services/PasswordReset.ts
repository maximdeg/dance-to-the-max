import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { Data, Effect } from "effect";
import { accounts, passwordResetTokens } from "~/db/schema";
import type { Account } from "./Accounts";
import { Database } from "./Database";
import { Mailer } from "./Mailer";
import { hashPassword } from "./password";
import { destroyAccountSessions } from "./Sessions";

/** A reset token is valid for one hour after it is issued. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

export class InvalidResetToken extends Data.TaggedError(
  "InvalidResetToken",
)<{}> {}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

// The raw token has 256 bits of entropy, so a plain (unsalted) SHA-256 is a
// safe lookup key: it can't be reversed and needs no per-row salt.
const generateToken = (): string => randomBytes(32).toString("hex");
const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

/**
 * Start a password reset. If the email belongs to an Account, any outstanding
 * tokens are dropped, a fresh single-use token is stored (hashed) and emailed.
 * Unknown emails are a silent no-op so the endpoint can't be used to enumerate
 * accounts — either way the Effect succeeds with void.
 */
export const requestPasswordReset = (
  email: string,
): Effect.Effect<void, never, Database | Mailer> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const mailer = yield* Mailer;
    const normalized = normalizeEmail(email);

    const rows = yield* Effect.promise(() =>
      db.select().from(accounts).where(eq(accounts.email, normalized)).limit(1),
    );
    const account = rows[0];
    if (!account) return;

    // Only the most recent request should be redeemable.
    yield* Effect.promise(() =>
      db
        .delete(passwordResetTokens)
        .where(eq(passwordResetTokens.accountId, account.id)),
    );

    const token = generateToken();
    yield* Effect.promise(() =>
      db.insert(passwordResetTokens).values({
        accountId: account.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      }),
    );

    yield* mailer.sendPasswordReset({ to: account.email, token });
  });

/**
 * Redeem a reset token and set a new password. The token is claimed with a
 * single conditional UPDATE (unused AND unexpired) that atomically marks it
 * used, so a token works exactly once; expired, already-used, and unknown
 * tokens all fail with `InvalidResetToken`. On success every Session for the
 * Account is invalidated — a reset signs out all devices.
 */
export const resetPassword = (
  token: string,
  newPassword: string,
): Effect.Effect<Account, InvalidResetToken, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const now = new Date();

    const claimed = yield* Effect.promise(() =>
      db
        .update(passwordResetTokens)
        .set({ usedAt: now })
        .where(
          and(
            eq(passwordResetTokens.tokenHash, hashToken(token)),
            isNull(passwordResetTokens.usedAt),
            gt(passwordResetTokens.expiresAt, now),
          ),
        )
        .returning({ accountId: passwordResetTokens.accountId }),
    );
    const claim = claimed[0];
    if (!claim) {
      return yield* new InvalidResetToken();
    }

    const passwordHash = yield* hashPassword(newPassword);
    const updated = yield* Effect.promise(() =>
      db
        .update(accounts)
        .set({ passwordHash })
        .where(eq(accounts.id, claim.accountId))
        .returning(),
    );

    yield* destroyAccountSessions(claim.accountId);

    const account = updated[0];
    if (!account) {
      return yield* Effect.dieMessage("account update returned no row");
    }
    return account;
  });
