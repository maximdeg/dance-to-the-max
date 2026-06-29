# The Skills in This Project — Explained for Non-Programmers

This document explains the "skills" that live in this project's `.claude/skills` folder.
It's written for someone who has **never programmed**. Every technical word is explained
the first time it shows up, and each skill comes with a plain-English example.

---

## First, what is a "skill"?

This project is worked on with the help of an AI assistant (Claude). A **skill** is a
short instruction manual written *for the AI*. It says: "When the human asks for X, here
is exactly how we like it done in this project."

A good real-world analogy: imagine you hire a new chef for your restaurant. The chef is
already a great cook (that's the AI's general ability), but your restaurant has its own
recipes, its own way of plating dishes, and its own rule that "we always wash the cutting
board between meat and vegetables." The skills are those house rules and recipes, written
down so every chef follows them the same way.

A few things worth knowing:

- A skill is just a text file (in **Markdown**, a simple text format that uses `#` for
  headings and `-` for bullet points). Nothing magic — it's a checklist the AI reads.
- The AI picks a skill automatically when your request matches what the skill is for, or
  you can call one on purpose by typing a slash command like `/do-work`.
- Some skills are marked "don't auto-run" — they only activate if you ask for them by name.

This project has **7 skills**. Here's the map:

| Skill | One-line purpose |
|-------|------------------|
| **do-work** | The main "build the thing" workflow, start to finish. |
| **install-effect-package** | The safe way to add one specific kind of building block. |
| **optimize-loader** | Make slow pages load faster. |
| **to-prd-project** | Turn a discussion into a written plan. |
| **to-issues-project** | Chop a plan into bite-sized to-do tickets. |
| **improve-codebase-architecture-project** | A daily robot that suggests one improvement. |
| **document-ai-hero-api** | Write/refresh the manual for a connected outside service. |

They fall into three groups:

1. **Building & fixing** — `do-work`, `install-effect-package`, `optimize-loader`
2. **Planning the work** — `to-prd-project`, `to-issues-project`, `improve-codebase-architecture-project`
3. **Writing documentation** — `document-ai-hero-api`

Before the skills, a quick tour of words you'll keep seeing.

---

## A starter glossary (read this once)

- **Code / codebase** — The collection of all the text files that, together, *are* the
  software. The "codebase" is the whole pile.
- **The app** — This particular software: a **Course Video Manager**. It helps someone
  build an online course made of *sections* → *lessons* → *videos*, and then publish it.
- **Database** — An organized digital filing cabinet where the app stores information
  (e.g. "Lesson 3 has these two videos"). Often shortened to **DB**.
- **Query** — A question you ask the database, e.g. "give me all videos in Lesson 3."
  Fetching too much, or asking the same question twice, makes the app slow.
- **Frontend** — The part of the app you *see and click* (buttons, lists, the page in
  your browser). The opposite is the **backend**: the behind-the-scenes machinery.
- **Bug** — A mistake in the code that makes the app behave wrong.
- **Feature** — A new capability you add to the app.
- **Test** — A small automatic check that proves a piece of the app does what it should.
  Think of a smoke detector: it sits there quietly and screams if something's wrong.
- **Commit** — Saving a snapshot of your changes into the project's history (using a tool
  called **Git**), with a note describing what you did. Like hitting "Save" but also
  recording *why* in a logbook everyone can read later.
- **GitHub** — A website where the project's code and its history live online, so the
  team can collaborate. (Git = the tool; GitHub = the shared website built on it.)
- **GitHub issue** — A ticket on GitHub. It can describe a bug to fix, a feature to
  build, or a plan to follow. The team's to-do list lives as issues.
- **TypeScript** — The programming language this project is written in. A close relative
  of JavaScript (the language of web browsers) but with built-in safety checks.

---

## Group 1 — Building & Fixing Things

### 1. `do-work` — the main "get it done" workflow

**What it's for:** Any time someone says "add this feature," "fix this bug," or "make
this change," this skill is the master recipe that carries the job from start to finish.

**The plain-English version:** It's a four-step routine, like a pre-flight checklist a
pilot runs every single time so nothing important gets skipped:

1. **Explore & Plan** — First look around and figure out *what* needs to change and
   *where*, before touching anything. (Measure twice, cut once.)
2. **Implement** — Actually make the change.
3. **Feedback Loops** — Run the automatic checks and fix anything they complain about,
   *re-running until everything is clean*. Two checks, in order:
   - **Type checking** (`npm run typecheck`): a spell-checker for code. It catches
     mismatches like "you promised this would be a number but handed it a word" *before*
     the app ever runs. (`npm` is the tool that runs these commands; "run typecheck" is
     just the name of the check.)
   - **Tests** (`npm test`): runs all those smoke-detector checks to confirm nothing
     broke.
   - The rule is strict: if a check fails, **fix it and re-run before moving on**. You
     never push ahead with known problems.
4. **Commit** — Save the finished, verified work into the project history.

**The "TDD" sub-recipes.** Step 2 (Implement) sometimes pulls in one of two extra
guides. Both use **TDD — Test-Driven Development**. TDD flips the normal order: you
write the *test first* (which fails, because the feature doesn't exist yet), then write
just enough code to make the test pass. Like writing the answer key before the exam, so
you know exactly what "correct" looks like.

- **DB-TDD** (used when the change touches the **database**):
  - *Test through the front door.* Check behavior the same way the real app uses it —
    ask the actual question and check the actual answer — rather than poking at internal
    plumbing. (It even uses a tiny temporary in-memory database called **PGLite** so
    tests run fast and leave no mess.)
  - *Don't test what's already guaranteed.* The type-checker already proves some things;
    don't waste a test on those. Focus on things only real data can reveal — correct
    ordering, relationships after a change, tricky edge cases.
  - *One test at a time.* Write one failing test, make it pass, repeat. Each new test
    should teach you something. Writing twenty tests up front tends to produce twenty
    tests that don't really check anything.

  > Example: You add "list a lesson's videos in the order the author arranged them."
  > First you write a test that says *"given videos saved as B, A, C with the author's
  > order A, B, C — the app must return A, B, C."* It fails (feature isn't built). You
  > build the feature until that test passes. Done.

- **FRONTEND-TDD** (used for tricky on-screen behavior):
  - This kicks in for **complex state**. **State** just means "what the screen currently
    remembers" — which item is selected, what's typed in a box, which step you're on.
    Simple state is easy; *complex* state (many moving parts that affect each other) is
    where bugs breed.
  - A **reducer** is a tidy pattern for managing that memory: a single function that
    takes *(the current state, a thing that happened)* and returns *(the new state)*.
    Think of a vending machine: current state + "coin inserted" → new state. Keeping all
    those rules in one place makes them easy to test.
  - The recipe: pull the state logic into its **own file**, separate from the visual
    component, so it can be tested on its own (no need to actually open a browser). Then
    do the same one-test-at-a-time loop. Only once the logic is fully tested do you wire
    it into the visible part of the screen, keeping that visible part "thin" (it just
    shows things and reports clicks).
  - House rule: when a reducer is needed, use the project's chosen tool
    (`useEffectReducer`) rather than the default one, for consistency.

**Why it matters to a non-programmer:** This is the skill that guarantees quality. It's
the difference between a contractor who tidies up, inspects the work, and gets it
signed off — versus one who leaves nails on the floor.

---

### 2. `install-effect-package` — the safe way to add a building block

**What it's for:** A very specific, easy-to-get-wrong chore: adding a new **package** of
a certain family to the project.

**Decoding the terms:**

- **Package** — A pre-made bundle of code that someone else wrote and shared, so you
  don't reinvent it. Like buying a pre-built bookshelf instead of milling the wood
  yourself. Projects use dozens of them.
- **`@effect/...`** — A particular *family* of packages (named "Effect") that this
  project relies on heavily. The `@effect/` prefix is just the brand label.
- **Lockfile** — A precise inventory list of every package and exact version the project
  uses, so the app builds identically on everyone's computer. If this list gets corrupted,
  things break in confusing ways.
- **Peer dependency** — When package A says "I work *alongside* package B, you must have B
  too." Installing carelessly can accidentally knock B out of the inventory.

**The plain-English version:** When adding an Effect-family package, **always install it
with the `--force` option** (`npm install --force @effect/...`). The skill exists because
a different, tempting option (`--legacy-peer-deps`) *silently* corrupts the lockfile —
the install *looks* successful, but it quietly removed other Effect packages, and the
damage only surfaces much later as baffling errors. `--force` adds the new package while
leaving the existing inventory intact.

**Analogy:** You're adding one spice to a stocked pantry. One method (`--force`) sets the
new jar on the shelf and leaves everything else alone. The other method (`--legacy-peer-deps`)
quietly throws out three jars you already had — and you won't notice until a recipe fails
next week. This skill says: always use the safe method.

**Why it matters:** It prevents a whole category of mysterious, time-wasting breakage by
turning hard-won experience ("we got burned by this") into a one-line rule.

---

### 3. `optimize-loader` — make slow pages load faster

**What it's for:** When a page in the app is sluggish, this skill spells out the usual
culprits and how to fix them.

**Decoding the terms:**

- **Loader** — The bit of code that *gathers the data a page needs* right before the page
  appears. Open a lesson page, and the loader runs off to fetch that lesson's videos,
  titles, and so on. (This project uses a framework called **React Router**, where these
  data-gatherers are literally called "loaders.")
- **Why loaders get slow** — They talk to the database, and database trips take time. Too
  many trips, or trips that haul back more than needed, and the page crawls.

**The three classic slow-downs this skill hunts for — with kitchen analogies:**

1. **Re-fetching data you already have.** The loader fetches a video, then calls a helper
   that *fetches the very same video again* just to read one field. Fix: hand the helper
   the video you already grabbed.
   > Like walking to the fridge for milk, then walking back to the fridge for the *same*
   > milk because the recipe step "forgot" you were already holding it.

2. **Over-fetching nested details.** The page only needs each video's ID and name to draw
   a navigation menu — but the loader drags along every video's clips, transcripts,
   thumbnails, and more. Fix: make a "slim" version of the query that asks for *only the
   few fields actually needed.*
   > Like ordering the entire warehouse delivered to your door when you only wanted one
   > screw. Ask for the screw.

3. **Doing independent errands one-after-another instead of at the same time.** If the
   page needs "the next video" *and* "the previous video," and neither depends on the
   other, fetching them in sequence wastes time. Fix: fetch them **in parallel** (at
   once), so total time is the *longer* of the two, not the *sum*.
   > Like running the dishwasher and the washing machine at the same time instead of
   > waiting for one to finish before starting the other.

**Why it matters:** Slow pages frustrate users. This skill is a checklist that turns "the
page feels slow" into specific, repeatable fixes — and it's marked "use proactively,"
meaning the AI should watch for these patterns *while writing new code*, not just after a
complaint.

---

## Group 2 — Planning the Work

These three skills are about deciding *what* to build before building it. They lean on a
few shared ideas:

- **PRD — Product Requirements Document.** A written plan describing a problem and the
  intended solution, in plain terms, *before* any code is written. The blueprint, agreed
  on before construction starts.
- **In this project, a PRD lives as a GitHub issue** (a ticket), and big PRDs get broken
  into smaller **sub-issues** (smaller tickets attached underneath).
- **`gh`** — A command-line tool for talking to GitHub from the keyboard (creating
  issues, reading them, etc.). The skills use it to file and read tickets automatically.

### 4. `to-prd-project` — turn a conversation into a written plan

**What it's for:** You've been discussing an idea with the AI. This skill captures that
discussion as a proper PRD and posts it to GitHub as an issue.

**The plain-English version:**

1. It **looks around the codebase** to ground the plan in reality (and uses the project's
   own vocabulary from a file called `CONTEXT.md`, so everyone uses the same words — in
   this app, for instance, you say "Course," not "Project").
2. It **sketches the main pieces** to build, deliberately favoring **deep modules** — see
   the glossary in skill #6; the short version is "a lot of usefulness behind a simple,
   stable interface."
3. It **writes the PRD** to a fixed template so nothing's forgotten:
   - **Problem Statement** — what's wrong, from the user's point of view.
   - **Solution** — what we'll do about it, from the user's point of view.
   - **User Stories** — many small sentences in the form *"As a [type of person], I want
     [thing], so that [benefit]."* (e.g. *"As a course author, I want to reorder lessons
     by dragging, so that I can restructure quickly."*) These keep the focus on real
     needs.
   - **Implementation Decisions, Testing Decisions, Out of Scope, Further Notes** — the
     technical choices, what'll be tested, what we're explicitly *not* doing, and any
     loose ends.
4. It **posts the PRD** as a GitHub issue and hands you the link.

**Important guardrail:** It does *not* mark the issue "ready to be built" yet — that
happens only after the plan is chopped into sub-issues (the next skill).

**Analogy:** This is the architect drawing up blueprints from your kitchen-table
conversation about the extension you want — and filing them with the city — *before*
anyone picks up a hammer.

---

### 5. `to-issues-project` — chop a plan into bite-sized tickets

**What it's for:** Take an existing PRD (skill #4's output) and break it into a flat,
ordered list of small tickets, each one a self-contained chunk of work.

**Decoding the key idea — "vertical slice" (a.k.a. tracer bullet):**

Software has *layers*, stacked like a cake:
- the **database** (where data is stored),
- the **API** (the backend rules that move data around),
- the **UI** (the buttons and screens you see),
- and **tests** proving it works.

A **horizontal slice** would be "build the entire database layer for the whole feature" —
but that delivers nothing you can actually *use* until much later. A **vertical slice**
instead cuts a *thin column down through every layer at once*: a small but **complete,
demoable** piece of the feature.

> Example: For a "drag to reorder lessons" feature, a vertical slice might be *"reorder
> two lessons and have it stick after refresh"* — touching the database, the backend, the
> screen, and a test, all for that one narrow path. You can actually try it. Later slices
> add drag handles, animations, undo, etc.

**The plain-English version of what the skill does:**

1. **Reads the PRD** carefully — the PRD is the boss; it won't invent extra scope. If the
   PRD is unclear, it asks you *before* slicing.
2. **Checks** the PRD doesn't already have sub-tickets (to avoid duplicates).
3. **Drafts the slices** in *execution order* — so if slice B depends on slice A, A comes
   first. Each slice must be small enough to finish in one focused work session.
4. **Quizzes you**: shows the proposed list and asks "is this the right size and order?
   anything to merge, split, or drop?" — and revises until you approve.
5. **Publishes** each slice as a GitHub sub-issue attached to the PRD, each with a
   **title**, a **"what to build"** description, and **acceptance criteria** (a checklist
   of "this is done when…" conditions).

**Why "one session each" matters:** This project can have the AI implement sub-issues
**one at a time, automatically**, each in its own run. So each slice has to stand on its
own. The order of the list literally controls the order the work gets done.

**Analogy:** The architect's full blueprint (the PRD) gets turned into a numbered punch
list for the builders — "1. pour foundation, 2. frame the wall, 3. wire the outlets" —
where each item is small, clearly "done or not done," and in the right sequence.

---

### 6. `improve-codebase-architecture-project` — the daily improvement robot

**What it's for:** This one runs **unattended** — automatically, on a schedule, with *no
human in the conversation*. Once a day it surveys the codebase, picks **one** worthwhile
improvement, and files it as a PRD ticket for humans to consider later.

**Decoding the central idea — "deep" vs. "shallow" modules:**

- **Module** — Any self-contained unit of code with two sides: an **interface** (how you
  *use* it from outside — the buttons and labels, so to speak) and an **implementation**
  (the messy machinery *inside*).
- **Deep module** — A *small, simple* interface hiding a *lot* of useful behavior. Great,
  because users get a lot of power without having to understand the internals.
  > Like a car's accelerator pedal: one simple input, enormous machinery underneath. You
  > don't need to know how the engine works to drive.
- **Shallow module** — One whose interface is nearly as complicated as its insides. It
  barely earns its keep; it just passes work along.
  > Like a "light switch" that, to use it, requires you to also know the wiring diagram —
  > it didn't actually simplify anything.
- **The deletion test** (a clever check the skill uses): *imagine deleting this module.*
  If complexity just vanishes, it was a useless pass-through. If the same complexity
  reappears, copy-pasted across everywhere that used it, then it was genuinely pulling its
  weight.

The skill hunts for chances to turn shallow modules into deep ones, because deep modules
are easier to test and easier for an AI (or human) to navigate.

**The plain-English version of how it runs:**

1. **Reads every past proposal** it has already filed, so it doesn't repeat itself.
2. **Explores the codebase** looking for friction — places where understanding one idea
   means jumping between many tiny files, or where modules are shallow.
3. **Filters out duplicates** aggressively (when in doubt, it skips — to avoid spamming
   the to-do list).
4. **Picks the single best candidate** from a few it brainstorms, ranked by how much
   benefit it unlocks versus how much effort it costs.
5. **Writes it up as a PRD** (same template as skill #4) plus an extra "Architecture
   review" section — including a **before/after diagram** (drawn with **Mermaid**, a way
   to write diagrams as plain text that GitHub turns into pictures).
6. **Emits a structured result** for the automation to publish. It is strictly
   **read-only** — it never changes code itself; it only *suggests*.

**Analogy:** A diligent building inspector who walks the property every morning, and each
day leaves *one* well-reasoned note — "the load-bearing wall here would be simpler and
safer rebuilt like this" — without ever swinging a hammer or repeating yesterday's note.

---

## Group 3 — Writing Documentation

### 7. `document-ai-hero-api` — keep the manual for a connected service up to date

**What it's for:** This app talks to a separate outside service called the **AI Hero
API**. This skill reads that service's source code and writes (or refreshes) a human
manual describing how to talk to it.

**Decoding the terms:**

- **API — Application Programming Interface.** The agreed-upon set of "requests you're
  allowed to make" to another piece of software, and what it sends back. It's a *menu*
  for programs: "you may order these dishes, here's what each costs and contains." Apps
  talk to *each other* through APIs.
- **Endpoint** — One specific item on that menu. For example, "create a new post" or
  "get a video's status." Each endpoint has an address and rules.
- **REST endpoint** vs. **tRPC procedure** — Two different *styles* of menu item; you
  don't need the distinction, just know they're both "things you can ask the service to
  do."
- **Auth (authentication)** — How the service checks you're allowed in. Examples it
  notes: a **Bearer token** (a digital access pass you attach to each request) and
  **OAuth** (a standard "log in with…" handshake).
- **Source code** — The original human-written text files of a program. This skill reads
  the *other* project's source to learn its menu firsthand, rather than guessing.

**The plain-English version:**

1. **Makes sure it's allowed to read** the other project's files (it adds the needed
   read-permission first — a safety setting so the AI can only read where it's been
   granted access).
2. **Scans the other service's code** for every endpoint: its address, what information
   you must send, what comes back, what login it requires, and any side effects (e.g.
   "this also kicks off a video upload").
3. **Cross-references with this app** — checks how *this* project actually uses those
   endpoints, and **flags anything that changed** on the service's side that might now
   break this app. (This early warning is the real payoff.)
4. **Writes the manual** to `docs/ai-hero-api.md` using a fixed template (`TEMPLATE.md`),
   so it always has the same predictable layout.
5. **Prints a summary**: how many endpoints documented, any breaking changes spotted, and
   any new endpoints this app isn't using yet.

This skill is marked **"don't auto-run"** — it only activates when a person explicitly
asks for it, because reading another whole project is a deliberate, heavier task.

**Analogy:** Your kitchen orders ingredients from a particular supplier. This skill walks
over to the supplier, reads their current catalog cover to cover, writes you a clean
in-house copy, and — crucially — taps you on the shoulder to say *"heads up, the flour
you rely on was discontinued."*

---

## Putting it together: how the skills team up

These skills aren't islands — they hand off to each other:

```
  Have an idea / problem
          │
          ▼
   to-prd-project ............ writes the plan (a PRD ticket)
          │
          ▼
   to-issues-project ......... chops the plan into small, ordered tickets
          │
          ▼
   do-work ................... builds each ticket properly
       ├─ DB-TDD ............. (if it touches the database)
       ├─ FRONTEND-TDD ...... (if it's tricky on-screen behavior)
       ├─ install-effect-package ... (if a new Effect building block is needed)
       └─ optimize-loader ... (if a page needs to be fast)
          │
          ▼
   verified & committed to the project history

   Running quietly on the side:
     • improve-codebase-architecture-project — files one improvement idea per day
     • document-ai-hero-api — keeps the outside-service manual current (on request)
```

**The big picture:** Together these skills encode this team's hard-won habits — *plan it
before building it, slice it small, build it test-first, keep it fast and tidy, and write
the experience down so the same mistakes aren't repeated.* They turn "how we do things
here" from knowledge trapped in someone's head into a checklist the AI follows every
time.
