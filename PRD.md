# PRD — Dance To the Max (v1: Lean Validation MVP)

> Synthesized from the `grill-me` / `grill-with-docs` sessions. Uses the canonical vocabulary in `CONTEXT.md` / `UBIQUITOUS_LANGUAGE.md` and respects `docs/adr/0001–0006`. Decisions log: `refinement-decisions.md`. Original wishlist: `specifications.md`.
> _Also filed as a GitHub issue; per-slice sub-issues track the build._

## Problem Statement

A ballroom dance studio has instructional video content but no way to sell access to it online. Dancers who want to learn at home can't subscribe and stream lessons, and the studio can't earn from its content, control who watches, or stop one paid account from being shared endlessly. Above all, there's no validated evidence that people will *pay* for online access — so any large build is a gamble.

## Solution

A responsive web app where a dancer signs up with email and password, picks one of **three subscription Tiers**, optionally starts a free **Trial**, pays via secure checkout, and immediately streams the **Dances** their Tier unlocks — each Dance's **Videos** organized by difficulty **Level** (Primeras veces → Max) and filterable by **Tag**. Each **Account** can stream on up to three concurrent **Sessions**. A **Super Admin** uploads Videos and configures Dances, Tiers, and prices; an **Admin** supports Subscribers. The release is deliberately lean: it does only what's needed to prove willingness-to-pay.

## User Stories

**Discovering & subscribing**
1. As a Visitor, I want to see the three Tiers and which Dances each unlocks, so that I can choose what to buy.
2. As a Visitor, I want to sign up with email and password, so that I can create an Account.
3. As a Visitor, I want to start a free Trial when I subscribe, so that I can try the content before being charged.
4. As a Visitor, I want to choose monthly or annual billing (annual discounted), so that I can pick my level of commitment.
5. As a Visitor, I want to pay through a secure checkout, so that I can become a Subscriber.

**Browsing & watching**
6. As a Subscriber, I want to browse the Catalog by Dance, so that I can pick a style to learn.
7. As a Subscriber, I want a Dance's Videos grouped by Level (Primeras veces → Max), so that I can start at the right difficulty.
8. As a Subscriber, I want to filter and search Videos by Level and Tag, so that I can find relevant content fast.
9. As a Subscriber, I want any Level of any Dance my Tier includes to be watchable, so that I can progress at my own pace.
10. As a Subscriber, I want Videos to stream with adaptive quality, so that playback is smooth on my connection.
11. As a Subscriber, I want Dances outside my Tier shown as locked with an upgrade prompt, so that I know what upgrading would give me.

**Account, sessions & billing**
12. As a Subscriber, I want to be logged in on up to three devices/browsers at once, so that my household setups work.
13. As a Subscriber, when I sign in on a fourth device, I want my least-recently-used Session ended with clear feedback, so that I understand the 3-device limit.
14. As a Subscriber, I want to stay signed in across visits, so that I don't re-authenticate constantly.
15. As a Subscriber, I want to change my password from my profile, so that I can keep my Account secure.
16. As a Subscriber, I want to reset my password by email, so that I can regain access if I forget it.
17. As a Subscriber, I want to upgrade my Tier and immediately access the newly unlocked Dances, so that I get more content when I choose.
18. As a Subscriber, I want to downgrade or cancel and keep access until the end of my paid period, so that I control my spending fairly.
19. As a Subscriber whose payment fails, I want a short grace period with automatic retries before losing access, so that a temporary card problem doesn't cut me off.
20. As a Subscriber, I want to see my current Tier, billing period, and renewal date, so that I know my status.

**Super Admin (content & pricing)**
21. As a Super Admin, I want to create and manage Dances, so that the Catalog reflects what we teach.
22. As a Super Admin, I want to set each Dance's minimum Tier, so that the cumulative Tier ladder matches our pricing.
23. As a Super Admin, I want to upload a Video and assign it a Dance, a Level, and Tags, so that it appears in the right place.
24. As a Super Admin, I want uploaded Videos transcoded and delivered via Signed URLs, so that content streams securely and adaptively.
25. As a Super Admin, I want to configure the three Tiers and their monthly/annual prices, so that I can sell access.
26. As a Super Admin, I want to publish and unpublish Videos and Dances, so that I control what is live.

**Admin (support)**
27. As an Admin, I want to find and view Subscribers, so that I can support them.
28. As an Admin, I want to see a Subscriber's Tier and Subscription status, so that I can answer billing questions.
29. As an Admin, I want to deactivate or block an Account, so that I can handle abuse.

**Returning & unsubscribed**
30. As a returning person whose Subscription has lapsed, I want to log in and re-subscribe to my existing Account, so that I keep my history and settings.
31. As a logged-in Subscriber with no active Subscription, I want to see the plan picker and my account settings rather than locked content, so that I understand I must subscribe to watch.

**Staff & roles**
32. As a Super Admin, I want to promote an Account to Admin (and demote it back), so that I can delegate Subscriber support without sharing my own credentials.

**Localization**
33. As a Visitor or Subscriber, I want to switch the app between Spanish and English, so that I can use it in my language.
34. As a Super Admin, I want to enter each Dance name and Video title/description in both Spanish and English, so that content reads correctly in either language.

**Public site (pre-login)**
35. As a Visitor, I want a public landing page that explains what Dance To the Max is, so that I understand the product before signing up.
36. As a Visitor, I want to read a biography of Max, so that I trust the instructor behind the content.
37. As a Visitor, I want to learn what ballroom dance is and how it originated, so that I'm drawn into the discipline.
38. As a Visitor, I want clear calls-to-action from the public site into signup / plans, so that I can start subscribing.

## Implementation Decisions

- **Shape.** Responsive web app (web-first; ADR-0001): a single web client over a backend API and a database. No native apps in v1.
- **Modules (favor deep modules behind small interfaces):**
  - **Identity** — signup, login, password change/reset; an Account has exactly one Role (Super Admin / Admin / Subscriber). Public signup always assigns `Subscriber`. The first Super Admin is seeded at deployment; the Super Admin promotes/demotes Admins from the console. No self-serve path to elevated roles.
  - **Session** — issues and tracks Sessions; enforces the 3-concurrent-login cap (ADR-0004): a 4th login evicts the least-recently-active Session; Sessions expire after ~30 days of inactivity; logout frees a slot. The cap counts logins, not simultaneous streams.
  - **Catalog** — Dance, Video, Level, Tag; browse/filter/search; publish state. A Video has exactly one Dance, one Level, and 0..n Tags. A Video is live iff `Video.published` AND `Dance.published` (Dance is the master switch); a published Dance with no published Videos is hidden from the Subscriber Catalog but visible to the Super Admin.
  - **Entitlement** — derives the set of Dances a Subscriber may watch from their Subscription's Tier. The core access check: *a Subscriber may play a Video iff their Subscription grants access (status ∈ {`trialing`, `active`, `past-due`}) AND the Video's Dance minimum-Tier ≤ the Subscriber's Tier rank.* A `past-due` Subscription keeps access through the dunning/retry window; access is removed only on `canceled`.
  - **Subscription/Billing** — Tier configuration; Subscription lifecycle (`trialing → active → past-due → cancelled`); Billing Period (monthly/annual). Delegates checkout, Trials, proration, and dunning to a payment provider (Stripe recommended) and consumes its **webhooks** to set Subscription status.
  - **Playback** — after the Entitlement check passes, requests a short-lived Signed URL from the hosted video provider for that Video.
  - **Admin console** — Subscriber management (Admin); content + Tier/price configuration + upload (Super Admin).
  - **Localization** (ADR-0005) — bilingual ES/EN UI with a language switcher; content metadata (Dance names, Video titles/descriptions, Tag labels) stored per Locale. Fixed Level values stay canonical with translated display labels; Video audio/subtitles are not localized.
  - **Public site (pre-login)** — bilingual marketing pages a Visitor sees before auth: a landing explaining the app, an About page with Max's biography, and a "What is Ballroom" page (definition + history). Copy lives in the i18n string catalog (no CMS in v1); pages link into signup / the plan-picker.
- **Tier → Dance mapping is data, not code** (ADR-0003): each Dance carries a configurable minimum Tier; the cumulative ladder (T1 ⊂ T2 ⊂ T3) is derived.
- **Video delivery** (ADR-0002): upload → provider transcodes → store the provider asset id; playback is authorized per-Video via expiring Signed URLs. No self-built transcoding queue.
- **Auth.** Email is the identifier; password reset via emailed token; sessions persist across visits.
- **Account lifecycle.** An Account is created at signup, independently of any Subscription (signup and checkout are separate steps). An Account has zero or one active Subscription; with none, its Entitlement is empty and it sees the plan-picker/paywall + account settings but cannot watch. Cancellation never deletes the Account — history is retained and the Subscriber can re-subscribe.
- **Schema (conceptual, no file paths):** Account(email, passwordHash, role); Session(accountId, createdAt, lastSeenAt); Dance(name{es,en}, minTierRank, published); Video(danceId, level, tags[], title{es,en}, description{es,en}, providerAssetId, published); Tag(label{es,en}); Tier(rank 1–3, monthlyPrice, annualPrice); Subscription(subscriberId, tierId, billingPeriod, status, currentPeriodEnd, providerSubscriptionId). Localized text fields carry one value per Locale (es/en).

## Testing Decisions

- **Test at the highest seam — the backend domain operations / API — not UI internals.** Assert external behavior ("can *this* Subscriber play *this* Video?"), not implementation; don't test what the type system already guarantees.
- **Entitlement check** (highest-value, pure logic): table-driven tests over (Subscription status, Tier rank, Dance minimum-Tier) covering the cumulative ladder and the `trialing`/`past-due`/`cancelled` edges.
- **Subscription lifecycle**: drive the billing module at its **webhook seam** with simulated provider events (`trial_will_end`, `payment_failed`, `canceled`, `updated`) and assert the resulting status and resulting access. Mock the payment provider at its service interface — never call the real one in tests.
- **Session cap**: exercise the login operation repeatedly and assert the 4th login succeeds and ends the least-recently-active Session.
- **Catalog**: query operations return the correct Videos by Dance/Level/Tag and respect the two-level publish rule (a Video is live iff `Video.published` AND `Dance.published`).
- **Playback / Signed URL** and the **payment provider** are integration boundaries — stub them at their interfaces.

## Out of Scope

Deferred (still in the eventual model, not in v1):
- Public comments & Admin replies; likes and view counts.
- The premium video-feedback loop (Subscribers submit Videos; Admins leave private notes).
- Badges/achievements, progress counters, continue-watching/resume, playlists, favorites/watchlist.
- Live class calendar/events; notifications; social sharing.
- 2FA; activity/audit logs.
- Offline downloads and native mobile apps (ADR-0001).
- Video subtitles/captions and localized audio — Videos remain in their original spoken language; bilingual v1 covers UI + content metadata only (ADR-0005).
- Full device management — named device list, "sesiones activas" panel, remote logout. Only the 3-Session cap ships in v1 (ADR-0004).
- Self-built transcoding queue (using a hosted provider; ADR-0002).
- Usage/reporting dashboards beyond the minimum; promo codes/discounts; a custom invoice portal (rely on the provider's hosted billing portal).

## Further Notes

- **Backlog issues to file** (from `refinement-decisions.md`): (1) *Billing & subscription details* — trial length/card-required/access scope + lifecycle specifics; (2) *Tier & content lineup* — the Dance list, each Dance's minimum Tier, and price points; (3) *Video provider selection* — choose Mux / Bunny Stream / Cloudflare Stream and signed-URL setup.
- **Open data** (don't block design): trial length, prices, the Dance lineup, the provider.
- **UI language** is resolved: bilingual ES/EN with localized content metadata (ADR-0005). Video subtitles deferred.
- **Vocabulary discipline:** use `CONTEXT.md` terms exactly. Most importantly, **Tier** = subscription and **Level** = difficulty — never interchange them; avoid the bare word "category."
