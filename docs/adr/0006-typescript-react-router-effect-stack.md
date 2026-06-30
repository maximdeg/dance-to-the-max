# TypeScript / React Router / Effect stack

v1 is built as a TypeScript full-stack app on **React Router v7** (loaders + actions), with **Effect** for service and business logic, **Postgres via Drizzle**, and **Vitest** for tests; **Stripe** handles billing and a **hosted video provider** handles streaming. Chosen for single-language, type-safe full-stack development and because the team's installed engineering skills assume exactly this stack (`optimize-loader` targets React Router loaders; `install-effect-package`, `migrate-to-shoehorn`, `do-work`, `tdd` all presume TS + Effect + Vitest).

## Consequences

Effect + React Router carry a learning curve and a smaller hiring pool than mainstream choices (e.g. Next.js), accepted in exchange for tooling fit and end-to-end type safety. The installed skills (`do-work` etc.) become directly applicable.
