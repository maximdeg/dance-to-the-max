# Dance To the Max

Streaming platform for ballroom dance instructional videos. Product docs live in
`PRD.md`, `CONTEXT.md`, `UBIQUITOUS_LANGUAGE.md`, and `docs/adr/`.

**Stack** (ADR-0006): TypeScript · React Router v7 (framework mode) · Effect ·
Postgres via Drizzle · Vitest. Deploys to **Vercel**.

## Prerequisites

- Node 22+
- A Postgres database (for running the app; tests need none)

## Setup

```bash
npm install
cp .env.example .env      # then set DATABASE_URL
npm run db:migrate        # apply migrations to your database
npm run dev               # http://localhost:5173
```

Check the health endpoint: `GET /healthz` → `200` with
`{"status":"healthy","database":"up",...}` when the DB is reachable, `503`
otherwise.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the app locally (Vite dev server). |
| `npm run typecheck` | `react-router typegen` then `tsc --noEmit`. |
| `npm test` | Run Vitest against in-memory PGLite (no database required). |
| `npm run build` | Production build (Vercel serverless output via the preset). |
| `npm start` | Serve the production build locally. |
| `npm run db:generate` | Generate a Drizzle migration from `app/db/schema.ts` into `drizzle/`. |
| `npm run db:migrate` | Apply the checked-in migrations to `DATABASE_URL`. |
| `npm run db:push` | Push the schema directly to `DATABASE_URL` (dev only). |

Migrations are checked into `drizzle/`. Tests apply them to PGLite, so CI needs
no database service.

## Architecture

- **Effect services** live in `app/services/` behind `Context.Tag`s (e.g.
  `Database`). Production layers (e.g. `DatabaseLive`) are wired into the runtime
  in `app/runtime.server.ts`; loaders/actions run their Effects through it.
- **Database**: Drizzle schema in `app/db/schema.ts`. Production uses `postgres.js`;
  tests provide a PGLite-backed `Database` layer under the same tag
  (`test/db.ts`), so service code is driver-agnostic.
- **i18n**: all UI copy resolves through the es/en catalog in `app/i18n/`.

## Deploying to Vercel

1. Import the repo in Vercel. The `@vercel/react-router` preset
   (`react-router.config.ts`) makes Vercel build and package the app
   automatically — no `vercel.json` needed.
2. Set `DATABASE_URL` in the Vercel project's environment variables. Use a
   **pooled** connection string (e.g. Neon's `-pooler` host) because serverless
   functions open many short-lived connections.
3. Run migrations against the production database as part of your release
   (`DATABASE_URL=... npm run db:migrate`).
