# Ubiquitous Language — Dance To the Max

Glossary for v1 (lean validation MVP). The terse canonical version for tooling lives in `CONTEXT.md`; this file adds relationships, flagged ambiguities, and an example dialogue. Decisions are recorded in `docs/adr/` and `refinement-decisions.md`.

## People & access

| Term            | Definition                                                                                                       | Aliases to avoid                          |
| --------------- | --------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| **Account**     | An authentication identity: email + password, with exactly one Role.                                            | User, login, profile                      |
| **Role**        | An Account's permission level: Super Admin, Admin, or Subscriber.                                                | permission, type                          |
| **Subscriber**  | An Account with the Subscriber role — a dancer who can hold a Subscription.                                       | User, member, customer, bailarín, student |
| **Admin**       | An Account with the Admin role — staff who manage subscribers.                                                    | moderator                                 |
| **Super Admin** | An Account with the Super Admin role — the only role that uploads content and configures dances, tiers, pricing.  | owner, profesor                           |

## Content

| Term        | Definition                                                                                       | Aliases to avoid                         |
| ----------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| **Dance**   | A dance style (e.g. Waltz, Tango); the unit the paywall gates on.                                 | Category, style, course, folder          |
| **Level**   | A difficulty tier *within* a Dance: Primeras veces, Principiante, Intermedio, Avanzado, Max.      | Category, grade, **tier** (tier = subscription) |
| **Video**   | A single instructional video; belongs to one Dance and one Level, with 0..n Tags.                | clip, lesson, class                      |
| **Tag**     | A free-form label on a Video for filtering/search (e.g. "wedding", "competition", "social").      | Category (as a gating concept — that's Dance) |
| **Catalog** | The set of published Dances and Videos browsable in the app.                                      | library                                  |

## Subscription & billing

| Term               | Definition                                                                                              | Aliases to avoid                         |
| ------------------ | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| **Tier**           | One of 3 subscription levels (T1/T2/T3); each grants a cumulative set of Dances.                        | Package, paquete, plan, **level** (level = difficulty) |
| **Subscription**   | A Subscriber's agreement to one Tier on one Billing Period; has a status (trialing, active, past-due, cancelled). | membership, plan                  |
| **Billing Period** | A Subscription's cadence: monthly or annual (annual discounted).                                        | cycle                                    |
| **Trial**          | The free introductory window of a Subscription before the first charge.                                 | demo, free period                        |
| **Entitlement**    | The set of Dances a Subscriber may watch, derived from their Subscription's Tier.                       | access list, permissions                 |

## Session & playback

| Term           | Definition                                                                          | Aliases to avoid |
| -------------- | ----------------------------------------------------------------------------------- | ---------------- |
| **Session**    | An authenticated login on one browser/device; max 3 concurrent per Account.         | device, login    |
| **Playback**   | Streaming a Video to an entitled Subscriber via a Signed URL.                        | streaming, view  |
| **Signed URL** | A time-limited URL from the video provider authorizing playback of one Video.        | token link       |

## Engagement

| Term             | Definition                                                                                              | Aliases to avoid            |
| ---------------- | ------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Resume Point** | A Subscriber's last saved playback position (seconds) on one Video; one per Subscriber per Video.        | bookmark, history           |
| **Progress**     | Derived per-Video state (unstarted / in-progress / watched) + per-Dance/Level rollup; computed, not stored. | completion, achievement     |

## Public site

| Term               | Definition                                                                                                             | Aliases to avoid            |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| **Testimonial**    | A curated, Visitor-facing quote of praise on the public site (Home strip, Comentarios page); staff-authored marketing. | Comment, review, feedback   |
| **`Dance.history`** | A brief bilingual origin/history blurb per Dance, authored by the Super Admin and shown on the public ballroom page.   | bio, description            |

## Relationships

- An **Account** has exactly one **Role**.
- A **Subscriber** holds at most one active **Subscription** at a time.
- A **Subscription** is for exactly one **Tier** and one **Billing Period**.
- A **Tier** grants access to every **Dance** whose minimum tier ≤ that Tier (cumulative ladder: T1 ⊂ T2 ⊂ T3).
- A **Dance** contains many **Videos**; each **Video** belongs to exactly one **Dance** and one **Level**, and carries 0..n **Tags**.
- An **Account** may hold up to 3 concurrent **Sessions**.
- **Playback** of a **Video** is permitted only if the Subscriber's **Entitlement** includes the Video's **Dance** and the Subscription grants access (status trialing, active, or past-due).

## Flagged ambiguities

- **"Level" is overloaded.** Reserve **Level** for difficulty (Primeras veces…Max). A subscription package is a **Tier**. Never call a subscription a "level," and never call a difficulty a "tier."
- **"Category" was overloaded in the spec.** `specifications.md` called the difficulty values "categorías" — those are **Levels**. The free-form labels for filtering are **Tags**. Avoid the bare word "category."
- **"Package" / "paquete"** from the spec is a **Tier**.
- **"User" is ambiguous** — say **Account** (auth identity) or **Subscriber** (the dancer/customer).
- **"Device" vs "Session."** v1 caps concurrent **Sessions** (3), not registered devices. Device management (named devices, remote logout) is a later concept.
- **"Dance" is the gating unit, not "category."** A Dance is the style; Tiers unlock Dances.

## Example dialogue

> **Dev:** "When a **Subscriber** opens a **Video**, what do we check before issuing the **Signed URL**?"
> **Domain expert:** "Their **Subscription** must be trialing or active, and their **Tier** must include that **Video**'s **Dance**. The **Level** doesn't matter for access — levels just organise videos inside a dance."
> **Dev:** "So a Tier-1 **Subscriber** can watch the *Max* **Level** of a Tier-1 **Dance**?"
> **Domain expert:** "Yes. Gating is by **Dance**, not difficulty. If the dance is in their tier, every level of it is open."
> **Dev:** "And if they're already streaming on three **Sessions** and log in on a fourth?"
> **Domain expert:** "The fourth is blocked, or it evicts the oldest — we cap at three concurrent **Sessions**. That's not the device-management feature; that comes later."
