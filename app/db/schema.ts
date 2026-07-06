import {
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Minimal table that exists purely to give the scaffold a real migration and a
 * schema-backed query for the health check.
 */
export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Role hierarchy: super_admin > admin > subscriber. Public signup only ever
 * creates `subscriber`s; elevated roles are assigned by other flows.
 */
export const accountRole = pgEnum("account_role", [
  "subscriber",
  "admin",
  "super_admin",
]);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Stored lowercased; the unique index enforces one Account per email.
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: accountRole("role").notNull().default("subscriber"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("accounts_email_unique").on(table.email)],
);

/**
 * A persisted login Session. The signed cookie only carries this row's id, so
 * logout and the 3-concurrent-Session cap (#4) are enforced server-side by
 * inserting/deleting rows here. `lastSeenAt` is the activity clock the cap uses
 * to pick the least-recently-active Session to evict and to expire idle ones.
 */
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  // Serves the cap's per-account queries: purge-expired, count, and
  // oldest-first eviction all filter by account_id and order by last_seen_at.
  (table) => [
    index("sessions_account_last_seen_idx").on(
      table.accountId,
      table.lastSeenAt,
    ),
  ],
);

/**
 * Single-use, time-limited password-reset tokens (#5). Only the SHA-256 hash of
 * the token is stored — the raw token lives only in the email — so a database
 * leak can't be replayed. `usedAt` enforces single use; `expiresAt` the TTL.
 */
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("password_reset_tokens_hash_unique").on(table.tokenHash),
  ],
);
