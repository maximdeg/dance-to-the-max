import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { Effect, Either } from "effect";
import { describe, expect, it } from "vitest";
import { accounts } from "~/db/schema";
import type { Role } from "~/auth/roles";
import { makeTestDatabaseLayer } from "../../test/db";
import { signup } from "./Accounts";
import {
  deleteComment,
  listThread,
  postComment,
  replyToComment,
} from "./Comments";
import { createDance, createVideo } from "./Content";
import { Database } from "./Database";
import { createSubscription } from "./Subscriptions";
import { listTiers, seedTiers } from "./Tiers";

type TestLayer = Awaited<ReturnType<typeof makeTestDatabaseLayer>>;

const run = <A, E>(layer: TestLayer, effect: Effect.Effect<A, E, Database>) =>
  effect.pipe(Effect.provide(layer));

const setRole = (layer: TestLayer, accountId: string, role: Role) =>
  Effect.runPromise(
    Effect.gen(function* () {
      const db = yield* Database;
      yield* Effect.promise(() =>
        db.update(accounts).set({ role }).where(eq(accounts.id, accountId)),
      );
    }).pipe(Effect.provide(layer)),
  );

const gap = () => new Promise((resolve) => setTimeout(resolve, 5));

/** A published Video on a Tier-1 Dance, an entitled Subscriber, an outsider
 * (no subscription), and an Admin. */
const setup = async (layer: TestLayer) => {
  await Effect.runPromise(run(layer, seedTiers()));
  const tiers = await Effect.runPromise(run(layer, listTiers()));
  const dance = await Effect.runPromise(
    run(
      layer,
      createDance({ nameEs: "Tango", nameEn: "Tango", minTierRank: 1, published: true }),
    ),
  );
  const video = await Effect.runPromise(
    run(
      layer,
      createVideo({
        danceId: dance.id,
        level: "principiante",
        titleEs: "Básico",
        titleEn: "Basic",
        descriptionEs: "",
        descriptionEn: "",
        providerAssetId: "asset-1",
        published: true,
        tagIds: [],
      }),
    ),
  );

  const subscriber = await Effect.runPromise(
    run(layer, signup("sub@example.com", "password123")),
  );
  await Effect.runPromise(
    run(
      layer,
      createSubscription({
        accountId: subscriber.id,
        tierId: tiers.find((t) => t.rank === 1)!.id,
        status: "active",
        billingPeriod: "monthly",
      }),
    ),
  );

  const outsider = await Effect.runPromise(
    run(layer, signup("out@example.com", "password123")),
  );
  const admin = await Effect.runPromise(
    run(layer, signup("admin@example.com", "password123")),
  );
  await setRole(layer, admin.id, "admin");

  return { video, subscriber, outsider, admin };
};

describe("postComment / listThread entitlement", () => {
  it("lets an entitled Subscriber post and read a Comment", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);

    const comment = await Effect.runPromise(
      run(layer, postComment(subscriber.id, video.id, "How do I lead this?")),
    );
    expect(comment.body).toBe("How do I lead this?");

    const thread = await Effect.runPromise(
      run(layer, listThread(subscriber.id, video.id)),
    );
    expect(thread).toHaveLength(1);
    expect(thread[0]?.authorId).toBe(subscriber.id);
    expect(thread[0]?.body).toBe("How do I lead this?");
  });

  it("refuses posting and reading to an account without access", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, outsider } = await setup(layer);

    const posted = await Effect.runPromise(
      run(layer, postComment(outsider.id, video.id, "hi").pipe(Effect.either)),
    );
    expect(Either.isLeft(posted)).toBe(true);
    if (Either.isLeft(posted)) expect(posted.left._tag).toBe("CommentNotAllowed");

    const read = await Effect.runPromise(
      run(layer, listThread(outsider.id, video.id).pipe(Effect.either)),
    );
    expect(Either.isLeft(read)).toBe(true);
    if (Either.isLeft(read)) expect(read.left._tag).toBe("CommentNotAllowed");
  });

  it("renders top-level Comments newest-first", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);

    await Effect.runPromise(run(layer, postComment(subscriber.id, video.id, "first")));
    await gap();
    await Effect.runPromise(run(layer, postComment(subscriber.id, video.id, "second")));
    await gap();
    await Effect.runPromise(run(layer, postComment(subscriber.id, video.id, "third")));

    const thread = await Effect.runPromise(
      run(layer, listThread(subscriber.id, video.id)),
    );
    expect(thread.map((c) => c.body)).toEqual(["third", "second", "first"]);
  });

  it("lets staff read the thread without a Subscription", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber, admin } = await setup(layer);
    await Effect.runPromise(run(layer, postComment(subscriber.id, video.id, "hi")));

    const thread = await Effect.runPromise(
      run(layer, listThread(admin.id, video.id)),
    );
    expect(thread).toHaveLength(1);
  });
});

describe("replyToComment authorization", () => {
  it("lets an Admin reply, nested chronologically under the Comment", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber, admin } = await setup(layer);
    const comment = await Effect.runPromise(
      run(layer, postComment(subscriber.id, video.id, "question?")),
    );

    await Effect.runPromise(
      run(layer, replyToComment(admin.id, comment.id, "answer!")),
    );

    const thread = await Effect.runPromise(
      run(layer, listThread(subscriber.id, video.id)),
    );
    expect(thread[0]?.replies.map((r) => r.body)).toEqual(["answer!"]);
  });

  it("refuses a reply from a non-staff Subscriber", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber } = await setup(layer);
    const comment = await Effect.runPromise(
      run(layer, postComment(subscriber.id, video.id, "q")),
    );

    const result = await Effect.runPromise(
      run(layer, replyToComment(subscriber.id, comment.id, "x").pipe(Effect.either)),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left._tag).toBe("NotAuthorized");
  });

  it("refuses replying to a missing Comment or to a reply", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber, admin } = await setup(layer);
    const comment = await Effect.runPromise(
      run(layer, postComment(subscriber.id, video.id, "q")),
    );
    const reply = await Effect.runPromise(
      run(layer, replyToComment(admin.id, comment.id, "a")),
    );

    const missing = await Effect.runPromise(
      run(layer, replyToComment(admin.id, randomUUID(), "x").pipe(Effect.either)),
    );
    expect(Either.isLeft(missing)).toBe(true);

    // Replying to a reply is not allowed (one level only).
    const toReply = await Effect.runPromise(
      run(layer, replyToComment(admin.id, reply.id, "x").pipe(Effect.either)),
    );
    expect(Either.isLeft(toReply)).toBe(true);
    if (Either.isLeft(toReply)) expect(toReply.left._tag).toBe("CommentNotFound");
  });
});

describe("deleteComment authorization", () => {
  it("lets the author delete their own Comment, cascading its replies", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber, admin } = await setup(layer);
    const comment = await Effect.runPromise(
      run(layer, postComment(subscriber.id, video.id, "mine")),
    );
    await Effect.runPromise(
      run(layer, replyToComment(admin.id, comment.id, "reply")),
    );

    await Effect.runPromise(run(layer, deleteComment(subscriber.id, comment.id)));

    const thread = await Effect.runPromise(
      run(layer, listThread(subscriber.id, video.id)),
    );
    expect(thread).toHaveLength(0);
  });

  it("refuses deleting someone else's Comment", async () => {
    const layer = await makeTestDatabaseLayer();
    const { video, subscriber, admin } = await setup(layer);
    const comment = await Effect.runPromise(
      run(layer, postComment(subscriber.id, video.id, "mine")),
    );

    // Even an Admin can't delete another's Comment through this op (that's #18).
    const result = await Effect.runPromise(
      run(layer, deleteComment(admin.id, comment.id).pipe(Effect.either)),
    );
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isLeft(result)) expect(result.left._tag).toBe("NotAuthorized");

    const thread = await Effect.runPromise(
      run(layer, listThread(subscriber.id, video.id)),
    );
    expect(thread).toHaveLength(1);
  });
});
