# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project state

This is a **greenfield project**. The repository currently contains only `specifications.md` — there is no source code, build system, dependency manifest, test suite, or git history yet. No technology stack has been chosen.

Because of this:
- There are **no build/lint/test commands** to document yet. When the stack is chosen, add the real commands here.
- Read these in order; later docs refine earlier ones:
  1. `CONTEXT.md` — canonical domain glossary (use these exact terms; e.g. **Tier** = subscription, **Level** = difficulty — never mix them).
  2. `UBIQUITOUS_LANGUAGE.md` — the glossary plus entity relationships, flagged ambiguities, and an example dialogue.
  3. `docs/adr/` — architecture decision records (the deliberate deviations from the raw spec, e.g. hosted video provider, 3 dance-gated tiers).
  4. `refinement-decisions.md` — the running log of v1 product decisions + the backlog of deferred issues.
  5. `specifications.md` — the original Spanish wishlist (full vision; **superseded by the above for v1 scope**).

## Product overview

**Dance To the Max** is a streaming platform for ballroom dance instructional videos. It serves two distinct audiences through two separate front-end experiences:

- **Dancers (users)** — watch public streaming content, comment, like, manage their own account.
- **Teachers (admins)** — moderate, respond, and give private feedback.

## Architecturally significant requirements

These constraints span multiple features and should shape data model and service boundaries from the start:

- **Role hierarchy:** `super admin` > `admin` > `user`, plus a **premium** user tier. Only the **super admin** uploads public streaming videos. Regular admins moderate and respond but do not publish public content.
- **Two separate platforms/apps:** one for users (dancers), one for admins (teachers). Treat these as distinct surfaces sharing a backend.
- **3-device limit per user** (flagged high-complexity in the spec): enforce a hard cap of 3 concurrent connected devices per account. Pair with active-session visibility and remote logout in the profile.
- **Premium feedback loop** (high-complexity): premium users submit private videos to admins; admins review them on a private panel, leaving private comments and notes attached to the submitted video. Keep this private-submission flow fully separate from the public streaming catalog and its public comments.
- **Public catalog metadata:** every public streaming video tracks view count and like count. Content is organized in **folders by level** and tagged with **categories**: `Primeras veces`, `Principiante`, `Intermedio`, `Avanzado`, `Max`.
- **Public interaction:** users comment on public videos; admins reply to those comments. Distinguish public comment threads from the premium private-notes channel.
- **Monetization:** 4 package types; free trial period; promo/discount codes; monthly and annual billing (annual discounted); user-facing invoice portal.

## Secondary features (from spec)

Plan the data model so these fit without rework: playlists, continue-watching (resume from last position), favorites/watchlist, search by category/level/keyword, adaptive quality, progress counters, achievements/badges, notifications, social sharing. Admin side: per-video stats, usage reports, a transcoding queue with status (pending/processing/ready), comment moderation, and user management (block, change plan, view active devices). Security: optional 2FA for admins and activity logs for auditing.
