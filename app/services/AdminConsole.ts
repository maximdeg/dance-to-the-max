import { asc, eq, ilike } from "drizzle-orm";
import { Data, Effect } from "effect";
import { accounts, subscriptions, tiers } from "~/db/schema";
import type { Role } from "~/auth/roles";
import { findAccountById, type Account } from "./Accounts";
import { Database } from "./Database";
import type { SubscriptionStatus } from "./Entitlement";
import { destroyAccountSessions } from "./Sessions";

export class AccountNotFound extends Data.TaggedError("AccountNotFound")<{
  readonly id: string;
}> {}

/** The Super Admin is the owner and can't be blocked or re-roled from here. */
export class CannotModifySuperAdmin extends Data.TaggedError(
  "CannotModifySuperAdmin",
)<{ readonly id: string }> {}

/** A row in the support console: an Account plus its Subscription snapshot. */
export interface AccountSummary {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
  readonly blocked: boolean;
  readonly createdAt: Date;
  readonly tierName: string | null;
  readonly tierRank: number | null;
  readonly status: SubscriptionStatus | null;
}

/** The roles the console can assign — never `super_admin` (no self-serve owner). */
export type AssignableRole = "admin" | "subscriber";

/**
 * List Accounts for the console, each with its Tier + Subscription status (null
 * when they've never subscribed). A non-empty `query` filters by email
 * substring (case-insensitive). Ordered by email.
 */
export const searchAccounts = (
  query: string,
): Effect.Effect<AccountSummary[], never, Database> =>
  Effect.gen(function* () {
    const db = yield* Database;
    const q = query.trim();
    const rows = yield* Effect.promise(() =>
      db
        .select({
          id: accounts.id,
          email: accounts.email,
          role: accounts.role,
          blocked: accounts.blocked,
          createdAt: accounts.createdAt,
          tierNameEs: tiers.nameEs,
          tierNameEn: tiers.nameEn,
          tierRank: tiers.rank,
          status: subscriptions.status,
        })
        .from(accounts)
        .leftJoin(subscriptions, eq(subscriptions.accountId, accounts.id))
        .leftJoin(tiers, eq(subscriptions.tierId, tiers.id))
        .where(q ? ilike(accounts.email, `%${q}%`) : undefined)
        .orderBy(asc(accounts.email)),
    );
    return rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      blocked: row.blocked,
      createdAt: row.createdAt,
      tierName: row.tierNameEs ? `${row.tierNameEs} / ${row.tierNameEn}` : null,
      tierRank: row.tierRank,
      status: row.status,
    }));
  });

/**
 * Block or unblock an Account. Blocking also ends every Session it holds, so a
 * currently-signed-in Account is logged out immediately and (with the login
 * check) can't get back in. The Super Admin can't be blocked.
 */
export const setAccountBlocked = (
  accountId: string,
  blocked: boolean,
): Effect.Effect<
  Account,
  AccountNotFound | CannotModifySuperAdmin,
  Database
> =>
  Effect.gen(function* () {
    const account = yield* findAccountById(accountId);
    if (!account) return yield* new AccountNotFound({ id: accountId });
    if (account.role === "super_admin") {
      return yield* new CannotModifySuperAdmin({ id: accountId });
    }

    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(accounts)
        .set({ blocked })
        .where(eq(accounts.id, accountId))
        .returning(),
    );
    if (blocked) yield* destroyAccountSessions(accountId);

    const next = updated[0];
    if (!next) return yield* Effect.dieMessage("account update returned no row");
    return next;
  });

/**
 * Set an Account's role to `admin` (promote) or `subscriber` (demote). The
 * Super Admin is untouchable, and `super_admin` is not an assignable target, so
 * the console can never mint or remove an owner.
 */
export const setAccountRole = (
  accountId: string,
  role: AssignableRole,
): Effect.Effect<
  Account,
  AccountNotFound | CannotModifySuperAdmin,
  Database
> =>
  Effect.gen(function* () {
    const account = yield* findAccountById(accountId);
    if (!account) return yield* new AccountNotFound({ id: accountId });
    if (account.role === "super_admin") {
      return yield* new CannotModifySuperAdmin({ id: accountId });
    }

    const db = yield* Database;
    const updated = yield* Effect.promise(() =>
      db
        .update(accounts)
        .set({ role })
        .where(eq(accounts.id, accountId))
        .returning(),
    );
    const next = updated[0];
    if (!next) return yield* Effect.dieMessage("account update returned no row");
    return next;
  });
