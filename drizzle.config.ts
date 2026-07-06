import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./app/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    // Only needed for `db:push` / `db:migrate`; `db:generate` reads the schema.
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
});
