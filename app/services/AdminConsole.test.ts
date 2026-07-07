import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { accounts } from "~/db/schema";
import type { Role } from "~/auth/roles";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import {
  searchAccounts,
  setAccountBlocked,
  setAccountRole,
} from "./AdminConsole";
import { Database } from "./Database";
import { establishSession, findSessionById } from "./Sessions";
import { createSubscription } from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

/** Set an Account's role directly — for fixtures the console can't create. */
const setRoleDirect = (layer: TestLayer, accountId: string, role: Role) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* Database;
      yield* Effect.promise(() =>
        db.update(accounts).set({ role }).where(eq(accounts.id, accountId)),
      );
    }).pipe(Effect.provide(layer)),
  );

const run = <A, E>(layer: TestLayer, effect: Effect.Effect<A, E, Database>) =>
  Effect.runPromise(effect.pipe(Effect.either, Effect.provide(layer)));

describe("searchAccounts", () => {
  it("lists Accounts with their Tier + Subscription status, and filters by email", async () => {
    const layer = await makeTestDatabaseLayer();
    await Effect.runPromise(seedTiers().pipe(Effect.provide(layer)));
    const tiers = await Effect.runPromise(
      listTiers().pipe(Effect.provide(layer)),
    );
    const alice = await Effect.runPromise(
      signup("alice@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await Effect.runPromise(
      signup("bob@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await Effect.runPromise(
      createSubscription({
        accountId: alice.id,
        tierId: tiers.find((t) => t.rank === 2)!.id,
        status: "active",
        billingPeriod: "monthly",
      }).pipe(Effect.provide(layer)),
    );

    const all = await Effect.runPromise(
      searchAccounts("").pipe(Effect.provide(layer)),
    );
    expect(all).toHaveLength(2);
    const aliceRow = all.find((a) => a.email === "alice@example.com");
    expect(aliceRow?.tierRank).toBe(2);
    expect(aliceRow?.status).toBe("active");
    const bobRow = all.find((a) => a.email === "bob@example.com");
    expect(bobRow?.tierName).toBeNull();
    expect(bobRow?.status).toBeNull();

    const filtered = await Effect.runPromise(
      searchAccounts("ALI").pipe(Effect.provide(layer)),
    );
    expect(filtered.map((a) => a.email)).toEqual(["alice@example.com"]);
  });
});

describe("setAccountBlocked", () => {
  it("blocks an Account and ends its sessions; unblocks again", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("target@example.com", "password123").pipe(Effect.provide(layer)),
    );
    const session = await Effect.runPromise(
      establishSession(account.id).pipe(Effect.provide(layer)),
    );

    const blocked = await run(layer, setAccountBlocked(account.id, true));
    expect(Either.isRight(blocked)).toBe(true);
    if (Either.isRight(blocked)) expect(blocked.right.blocked).toBe(true);
    // Blocking logs the Account out everywhere.
    const gone = await Effect.runPromise(
      findSessionById(session.id).pipe(Effect.provide(layer)),
    );
    expect(gone).toBeNull();

    const unblocked = await run(layer, setAccountBlocked(account.id, false));
    expect(Either.isRight(unblocked)).toBe(true);
    if (Either.isRight(unblocked)) expect(unblocked.right.blocked).toBe(false);
  });

  it("refuses to block the Super Admin", async () => {
    const layer = await makeTestDatabaseLayer();
    const owner = await Effect.runPromise(
      signup("owner@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await setRoleDirect(layer, owner.id, "super_admin");

    const result = await run(layer, setAccountBlocked(owner.id, true));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("CannotModifySuperAdmin");
    }
  });
});

describe("setAccountRole", () => {
  it("promotes a Subscriber to admin and demotes back", async () => {
    const layer = await makeTestDatabaseLayer();
    const account = await Effect.runPromise(
      signup("staff@example.com", "password123").pipe(Effect.provide(layer)),
    );

    const promoted = await run(layer, setAccountRole(account.id, "admin"));
    expect(Either.isRight(promoted)).toBe(true);
    if (Either.isRight(promoted)) expect(promoted.right.role).toBe("admin");

    const demoted = await run(layer, setAccountRole(account.id, "subscriber"));
    expect(Either.isRight(demoted)).toBe(true);
    if (Either.isRight(demoted)) expect(demoted.right.role).toBe("subscriber");
  });

  it("refuses to change the Super Admin's role", async () => {
    const layer = await makeTestDatabaseLayer();
    const owner = await Effect.runPromise(
      signup("owner2@example.com", "password123").pipe(Effect.provide(layer)),
    );
    await setRoleDirect(layer, owner.id, "super_admin");

    const result = await run(layer, setAccountRole(owner.id, "subscriber"));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("CannotModifySuperAdmin");
    }
  });

  it("reports an unknown Account", async () => {
    const layer = await makeTestDatabaseLayer();
    const result = await run(layer, setAccountRole(randomUUID(), "admin"));
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) {
      expect(result.left._tag).toBe("AccountNotFound");
    }
  });
});
