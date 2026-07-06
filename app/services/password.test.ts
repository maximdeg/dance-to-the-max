import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("stores a hash, never the plaintext, and verifies it", async () => {
    const hash = await Effect.runPromise(hashPassword("correct horse battery"));

    expect(hash).not.toContain("correct horse battery");
    expect(hash).toContain(":"); // salt:hash

    expect(
      await Effect.runPromise(verifyPassword("correct horse battery", hash)),
    ).toBe(true);
    expect(await Effect.runPromise(verifyPassword("wrong", hash))).toBe(false);
  });

  it("uses a random salt, so the same password hashes differently", async () => {
    const a = await Effect.runPromise(hashPassword("same-password"));
    const b = await Effect.runPromise(hashPassword("same-password"));
    expect(a).not.toBe(b);
  });
});
