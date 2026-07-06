import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { requireSuperAdmin } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import {
  createDance,
  listDances,
  setDancePublished,
} from "~/services/Content";
import type { Route } from "./+types/admin.dances";

export function meta() {
  return [{ title: "Dances · Admin · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const dances = await runtime.runPromise(listDances());
  return { dances };
}

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");

  if (intent === "toggle-publish") {
    const id = String(form.get("danceId") ?? "");
    const publish = form.get("publish") === "true";
    await runtime.runPromise(
      setDancePublished(id, publish).pipe(Effect.either),
    );
    return { ok: true };
  }

  // intent === "create"
  const nameEs = String(form.get("nameEs") ?? "").trim();
  const nameEn = String(form.get("nameEn") ?? "").trim();
  const minTierRank = Number(form.get("minTierRank") ?? 1);
  const published = form.get("published") === "on";

  if (!nameEs || !nameEn) {
    return { error: "Both Spanish and English names are required." };
  }
  if (![1, 2, 3].includes(minTierRank)) {
    return { error: "Minimum tier must be 1, 2, or 3." };
  }

  await runtime.runPromise(
    createDance({ nameEs, nameEn, minTierRank, published }),
  );
  return { ok: true };
}

export default function AdminDances({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { dances } = loaderData;

  return (
    <main>
      <h1>Dances</h1>
      <p>
        <Link to="/admin/tags">Manage tags</Link>
      </p>

      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}

      <table>
        <thead>
          <tr>
            <th>Name (es / en)</th>
            <th>Min tier</th>
            <th>Published</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {dances.map((dance) => (
            <tr key={dance.id}>
              <td>
                <Link to={`/admin/dances/${dance.id}`}>
                  {dance.nameEs} / {dance.nameEn}
                </Link>
              </td>
              <td>T{dance.minTierRank}</td>
              <td>{dance.published ? "Yes" : "Draft"}</td>
              <td>
                <Form method="post">
                  <input type="hidden" name="intent" value="toggle-publish" />
                  <input type="hidden" name="danceId" value={dance.id} />
                  <input
                    type="hidden"
                    name="publish"
                    value={dance.published ? "false" : "true"}
                  />
                  <button type="submit">
                    {dance.published ? "Unpublish" : "Publish"}
                  </button>
                </Form>
              </td>
            </tr>
          ))}
          {dances.length === 0 ? (
            <tr>
              <td colSpan={4}>No dances yet.</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <h2>New dance</h2>
      <Form method="post">
        <input type="hidden" name="intent" value="create" />
        <label>
          Name (Spanish)
          <input type="text" name="nameEs" required />
        </label>
        <label>
          Name (English)
          <input type="text" name="nameEn" required />
        </label>
        <label>
          Minimum tier
          <input
            type="number"
            name="minTierRank"
            min={1}
            max={3}
            defaultValue={1}
            required
          />
        </label>
        <label>
          <input type="checkbox" name="published" /> Published
        </label>
        <button type="submit">Create dance</button>
      </Form>
    </main>
  );
}
