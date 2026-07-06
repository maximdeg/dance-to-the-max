import { Form, Link } from "react-router";
import { requireSuperAdmin } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { createTag, listTags } from "~/services/Content";
import type { Route } from "./+types/admin.tags";

export function meta() {
  return [{ title: "Tags · Admin · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  await requireSuperAdmin(request);
  const tags = await runtime.runPromise(listTags());
  return { tags };
}

export async function action({ request }: Route.ActionArgs) {
  await requireSuperAdmin(request);
  const form = await request.formData();
  const labelEs = String(form.get("labelEs") ?? "").trim();
  const labelEn = String(form.get("labelEn") ?? "").trim();
  if (!labelEs || !labelEn) {
    return { error: "Both Spanish and English labels are required." };
  }
  await runtime.runPromise(createTag({ labelEs, labelEn }));
  return { ok: true };
}

export default function AdminTags({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { tags } = loaderData;

  return (
    <main>
      <p>
        <Link to="/admin/dances">← Dances</Link>
      </p>
      <h1>Tags</h1>
      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}

      <ul>
        {tags.map((tag) => (
          <li key={tag.id}>
            {tag.labelEs} / {tag.labelEn}
          </li>
        ))}
        {tags.length === 0 ? <li>No tags yet.</li> : null}
      </ul>

      <h2>New tag</h2>
      <Form method="post">
        <label>
          Label (Spanish)
          <input type="text" name="labelEs" required />
        </label>
        <label>
          Label (English)
          <input type="text" name="labelEn" required />
        </label>
        <button type="submit">Create tag</button>
      </Form>
    </main>
  );
}
