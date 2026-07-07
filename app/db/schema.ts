import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
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

/**
 * A Video's difficulty within a Dance. The declaration order is the display and
 * sort order (Primeras veces → Max), which Postgres preserves for `ORDER BY`.
 */
export const level = pgEnum("level", [
  "primeras_veces",
  "principiante",
  "intermedio",
  "avanzado",
  "max",
]);

/**
 * A Dance style — the unit the paywall gates on. Bilingual name (es/en columns,
 * since Locales are fixed at es/en). `minTierRank` is the lowest Tier rank that
 * unlocks it; the Tier rows themselves are seeded later (#8). `published` is one
 * half of the two-level Catalog publish rule (the Video is the other).
 */
export const dances = pgTable("dances", {
  id: uuid("id").primaryKey().defaultRandom(),
  nameEs: text("name_es").notNull(),
  nameEn: text("name_en").notNull(),
  minTierRank: integer("min_tier_rank").notNull().default(1),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * An instructional Video. Belongs to exactly one Dance and carries exactly one
 * Level; Tags are attached many-to-many via `videoTags`. `providerAssetId` is a
 * manual reference to the hosted video for now (real upload comes later).
 */
export const videos = pgTable(
  "videos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    danceId: uuid("dance_id")
      .notNull()
      .references(() => dances.id, { onDelete: "cascade" }),
    level: level("level").notNull(),
    titleEs: text("title_es").notNull(),
    titleEn: text("title_en").notNull(),
    descriptionEs: text("description_es").notNull().default(""),
    descriptionEn: text("description_en").notNull().default(""),
    providerAssetId: text("provider_asset_id").notNull().default(""),
    published: boolean("published").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("videos_dance_id_idx").on(table.danceId)],
);

/** A free-form, bilingual label used to filter and search Videos. */
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    labelEs: text("label_es").notNull(),
    labelEn: text("label_en").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("tags_label_es_unique").on(table.labelEs)],
);

/** Join table for the Video ↔ Tag many-to-many relationship. */
export const videoTags = pgTable(
  "video_tags",
  {
    videoId: uuid("video_id")
      .notNull()
      .references(() => videos.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.videoId, table.tagId] })],
);

/**
 * A subscription Tier (T1/T2/T3). `rank` is the cumulative ladder position — a
 * higher rank unlocks every Dance a lower rank does, plus more. Prices are in
 * integer cents; the Tier rows are seeded canonical reference data (`db:seed`).
 */
export const tiers = pgTable(
  "tiers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rank: integer("rank").notNull(),
    nameEs: text("name_es").notNull(),
    nameEn: text("name_en").notNull(),
    monthlyPriceCents: integer("monthly_price_cents").notNull(),
    annualPriceCents: integer("annual_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("tiers_rank_unique").on(table.rank)],
);

/**
 * Subscription lifecycle status. trialing/active/past_due all grant access;
 * canceled ends it (see the Entitlement check).
 */
export const subscriptionStatus = pgEnum("subscription_status", [
  "trialing",
  "active",
  "past_due",
  "canceled",
]);

export const billingPeriod = pgEnum("billing_period", ["monthly", "annual"]);

/**
 * A Subscriber's agreement to one Tier on one Billing Period, carrying a
 * lifecycle status. One per Account for now (created manually/seeded until
 * Stripe lands in #10/#11).
 */
export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    tierId: uuid("tier_id")
      .notNull()
      .references(() => tiers.id, { onDelete: "restrict" }),
    status: subscriptionStatus("status").notNull(),
    billingPeriod: billingPeriod("billing_period").notNull(),
    // The payment provider's own id for this subscription — the key webhook
    // events correlate against. Null for rows created before Stripe / seeded.
    providerSubscriptionId: text("provider_subscription_id"),
    // End of the current paid (or trial) period; advanced by webhook events.
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("subscriptions_account_unique").on(table.accountId),
    uniqueIndex("subscriptions_provider_sub_unique").on(
      table.providerSubscriptionId,
    ),
  ],
);
