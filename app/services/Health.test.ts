import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { makeTestDatabaseLayer } from "../../test/db";
import { checkHealth } from "./Health";

describe("checkHealth", () => {
  it("reports healthy when the database and schema are reachable", async () => {
    const layer = await makeTestDatabaseLayer();

    const report = await Effect.runPromise(
      checkHealth.pipe(Effect.provide(layer)),
    );

    expect(report.status).toBe("healthy");
    expect(report.database).toBe("up");
    expect(report.timestamp).toEqual(expect.any(String));
  });

  it("fails when the schema has not been migrated", async () => {
    const layer = await makeTestDatabaseLayer({ migrated: false });

    const result = await Effect.runPromise(
      checkHealth.pipe(Effect.provide(layer), Effect.either),
    );

    expect(result._tag).toBe("Left");
  });
});
