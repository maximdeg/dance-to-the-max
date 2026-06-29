# Dance To the Max

The domain context for a web-first subscription streaming platform for ballroom dance instruction (v1: lean validation MVP). This is the canonical glossary; relationships, ambiguities, and an example dialogue live in `UBIQUITOUS_LANGUAGE.md`, and decisions in `docs/adr/`.

## Language

### People & access

**Account**:
An authentication identity (email + password) with exactly one Role.
_Avoid_: User, login, profile

**Role**:
An Account's permission level — Super Admin, Admin, or Subscriber.

**Subscriber**:
An Account with the Subscriber role; a dancer who can hold a Subscription.
_Avoid_: User, member, customer, bailarín, student

**Admin**:
An Account with the Admin role; staff who manage subscribers.
_Avoid_: moderator

**Super Admin**:
An Account with the Super Admin role; the only role that uploads content and configures dances, tiers, and pricing.
_Avoid_: owner

### Content

**Dance**:
A dance style (e.g. Waltz, Tango); the unit the paywall gates on.
_Avoid_: Category, style, course, folder

**Level**:
A difficulty tier within a Dance — Primeras veces, Principiante, Intermedio, Avanzado, Max.
_Avoid_: Category, grade, tier

**Video**:
A single instructional video; belongs to one Dance and one Level, with zero or more Tags.
_Avoid_: clip, lesson, class

**Tag**:
A free-form label on a Video for filtering and search.
_Avoid_: Category

**Catalog**:
The published Dances and Videos browsable in the app.
_Avoid_: library

### Subscription & billing

**Tier**:
One of three subscription levels (T1/T2/T3); each grants a cumulative set of Dances.
_Avoid_: Package, paquete, plan, level

**Subscription**:
A Subscriber's agreement to one Tier on one Billing Period, with a status (trialing, active, past-due, cancelled).
_Avoid_: membership, plan

**Billing Period**:
A Subscription's cadence — monthly or annual.
_Avoid_: cycle

**Trial**:
The free introductory window before a Subscription's first charge.
_Avoid_: demo, free period

**Entitlement**:
The set of Dances a Subscriber may watch, derived from their Tier.
_Avoid_: access list, permissions

### Session & playback

**Session**:
An authenticated login on one browser/device; max three concurrent per Account.
_Avoid_: device, login

**Playback**:
Streaming a Video to an entitled Subscriber via a Signed URL.
_Avoid_: view, streaming

**Signed URL**:
A time-limited URL from the video provider authorizing playback of one Video.
_Avoid_: token link
