# Dance To the Max

The domain context for a web-first subscription streaming platform for ballroom dance instruction (v1: lean validation MVP). This is the canonical glossary; relationships, ambiguities, and an example dialogue live in `UBIQUITOUS_LANGUAGE.md`, and decisions in `docs/adr/`.

## Language

### People & access

**Visitor**:
An unauthenticated prospect browsing the public/plan pages; has no Account yet.
_Avoid_: guest, lead, user

**Account**:
An authentication identity (email + password) with exactly one Role. Created at signup, independently of any Subscription; retained on cancellation.
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
The Subscriber-facing set of live content; a Video appears only when both it and its Dance are published.
_Avoid_: library

**Locale**:
A supported language for the UI and content metadata — Spanish (es) or English (en).
_Avoid_: language, i18n

### Subscription & billing

**Tier**:
One of three subscription levels (T1/T2/T3); each grants a cumulative set of Dances.
_Avoid_: Package, paquete, plan, level

**Subscription**:
A Subscriber's agreement to one Tier on one Billing Period. Status is trialing, active, or past-due (all three grant access) or canceled (access ends).
_Avoid_: membership, plan

**Billing Period**:
A Subscription's cadence — monthly or annual.
_Avoid_: cycle

**Trial**:
The free introductory window before a Subscription's first charge.
_Avoid_: demo, free period

**Entitlement**:
The set of Dances a Subscriber may watch — the Dances in their Tier — available while their Subscription grants access (trialing, active, or past-due).
_Avoid_: access list, permissions

### Session & playback

**Session**:
An authenticated login on one browser/device (not a simultaneous video stream). An Account may hold at most three concurrent Sessions.
_Avoid_: device, login, stream

**Playback**:
Streaming a Video to an entitled Subscriber via a Signed URL.
_Avoid_: view, streaming

**Signed URL**:
A time-limited URL from the video provider authorizing playback of one Video.
_Avoid_: token link

### Public site

**Testimonial**:
A curated, Visitor-facing quote of praise shown on the public site (the Home funnel strip and the Comentarios page) as social proof. Marketing content authored by staff and stored in the i18n string catalog — not a Subscriber-posted Comment.
_Avoid_: Comment, review, feedback
