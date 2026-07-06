/**
 * Role predicates, kept pure and framework-free so they can be unit-tested and
 * reused by both server guards and UI. Roles form a hierarchy:
 * super_admin > admin > subscriber.
 */
export type Role = "subscriber" | "admin" | "super_admin";

/** Only the Super Admin authors content and configures dances/tiers/pricing. */
export const isSuperAdmin = (role: Role): boolean => role === "super_admin";

/** Admin or Super Admin — staff who can reach the admin surfaces. */
export const isStaff = (role: Role): boolean =>
  role === "admin" || role === "super_admin";
