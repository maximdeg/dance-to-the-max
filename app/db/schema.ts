import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";

/**
 * Minimal table that exists purely to give the scaffold a real migration and a
 * schema-backed query for the health check. Domain tables (Accounts, Dances,
 * Videos, Tiers, …) arrive in their own slices.
 */
export const healthChecks = pgTable("health_checks", {
  id: serial("id").primaryKey(),
  checkedAt: timestamp("checked_at", { withTimezone: true }).notNull().defaultNow(),
});
