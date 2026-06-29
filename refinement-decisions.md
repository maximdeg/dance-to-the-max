# Dance To the Max — Refinement Decisions

Running log from the `grill-me` session. Source of truth feeding `ubiquitous-language` → `domain-modeling` → `to-prd`. Original wishlist lives in `specifications.md`.

## Decisions

1. **Delivery platform — Web-first.** v1 is a responsive web app (desktop/tablet/phone browsers). Native iOS/Android deferred to a later phase. Consequences: the 3-device limit is defined over concurrent browser/login sessions; true offline downloads and native push notifications are phase-2.

2. **v1 scope — Lean validation MVP.** v1 = auth + content catalog + video playback + subscription paywall (the 4 packages). Deferred to later: public comments & admin replies, likes, the premium video-feedback loop, badges/achievements, live calendar, social sharing, 2FA, offline, reports, transcoding queue, rich admin tooling. Everything deferred stays in the eventual model but is out of v1.

3. **Content taxonomy — three axes (gating = Dance).** *Dance* = the dance style (e.g. Waltz, Tango, …) — the axis the paywall gates on. *Level* = the 5 difficulty tiers (Primeras veces, Principiante, Intermedio, Avanzado, Max), organizing videos *within* each dance. *Category* = free-form **tags** (e.g. "wedding", "competition", "social") for filtering/search, not gated. A video has one Dance, one Level, and zero-or-more tags. Implies the v1 catalog supports browse-by-dance + filter-by-level/tag (basic search).

4. **Pricing — 3 subscription tiers (revises spec's "4 packages").** Each higher tier unlocks more *dances*, giving access to more videos. Gating is by dance, not by difficulty level.

5. **Tier structure — cumulative ladder.** Tier 1 = starter set of dances; Tier 2 = Tier 1 + more dances; Tier 3 = all dances. Each tier is a superset of the one below. Access check = "is this dance included in the user's tier?".

6. **Billing model — monthly + annual + free trial.** Both billing periods, annual discounted. A free trial drives signups; keep it short (7-day) or card-required to avoid binge-and-cancel. Trial length & price points TBD.

7. **Device limiting — lightweight 3-session cap in v1.** Enforce max 3 active sessions per account (block/evict the 4th login). No device-list / remote-logout / "sesiones activas" UI in v1 — deferred to a later phase.

8. **Video infrastructure — hosted provider.** Use a hosted video provider (Mux / Bunny Stream / Cloudflare Stream) for transcoding, adaptive HLS, thumbnails, and signed expiring playback URLs. Paywall enforced via signed URLs. No self-built transcoding queue in v1. Specific provider TBD.

9. **Auth — email + password, self-serve.** Email is the identifier; users self-register and flow into checkout. Password reset via email. Username and social login (Google/Apple) deferred.

10. **Roles — three (Super Admin / Admin / Subscriber).** Only **Super Admin** uploads/publishes content and manages dances & tiers. **Admin** helps manage (e.g. users/subscriptions; moderation later when comments exist). **Subscriber** = paying user. Premium (perk-bearing) role deferred until the video-feedback loop is built.

## v1 in one paragraph
A responsive web app where a visitor signs up with email + password, picks one of **3 cumulative subscription tiers** (monthly or annual, with a free trial), and pays via self-serve checkout. Their tier unlocks a set of **dances**; each dance contains videos organized by **difficulty level** (Primeras veces → Max). Videos stream from a **hosted video provider** via signed URLs, gated by the user's tier. Each account is limited to **3 concurrent sessions**. A **Super Admin** uploads videos and manages dances/tiers; an **Admin** helps manage users. Everything else from the spec (comments, likes, premium video-feedback loop, badges, live calendar, social sharing, 2FA, offline, reports, full device management, transcoding queue) is **deferred** but stays in the eventual model.

## Backlog — issues to file later (do not block the PRD; data/config, not structure)
- **ISSUE: "Billing & subscription details"** — trial mechanics (length, card-required, access scope, conversion) AND subscription lifecycle (cancel → access to period end; failed payment → dunning grace then lock; upgrade → immediate/prorated; downgrade → next renewal). Assume standard SaaS behavior until decided.
- **ISSUE: "Tier & content lineup"** — the full list of Dances, each Dance's min-tier assignment (T1 ⊂ T2 ⊂ T3), and price points per tier. **Working default:** tier→dance mapping is configurable data (Super Admin sets a min-tier per Dance), not hardcoded.
- **ISSUE: "Video provider selection"** — pick the specific hosted provider (Mux / Bunny Stream / Cloudflare Stream) and signed-URL setup.
- Admin's concrete v1 capabilities (with comments/moderation deferred): assume user/subscription management + read-only catalog; Super Admin owns uploads & dance/tier config.

## Note — taxonomy (resolved)
Three axes confirmed: **Dance** (style, gating) · **Level** (difficulty, organization) · **Category/tags** (free-form, filtering/search, not gated). A video = one Dance + one Level + 0..n tags.
- How many dances total and the per-tier split (T1/T2/T3).
- The full list of Dances (styles) offered.
- Whether tiers also carry feature perks (e.g. premium video-feedback) or are content-only.
- Exact Level values confirmed as the 5 difficulty tiers.
- Is the 3-device limit in the v1 lean MVP, or deferred?
- Auth specifics: email vs username; self-signup vs admin-provisioned; free trial.
- Billing: payment provider; monthly + annual.
- v1 content upload: super-admin-only? transcoding needed at launch?
