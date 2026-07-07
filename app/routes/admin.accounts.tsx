import { Effect, Either } from "effect";
import { Form, Link } from "react-router";
import { requireStaff, requireSuperAdmin } from "~/auth/auth.server";
import { runtime } from "~/runtime.server";
import { searchAccounts, setAccountBlocked, setAccountRole } from "~/services/AdminConsole";
import type { Route } from "./+types/admin.accounts";

export function meta() {
  return [{ title: "Accounts · Admin · Dance To the Max" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const staff = await requireStaff(request);
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const accounts = await runtime.runPromise(searchAccounts(query));

  return {
    query,
    isSuperAdmin: staff.role === "super_admin",
    currentAccountId: staff.id,
    accounts: accounts.map((account) => ({
      id: account.id,
      email: account.email,
      role: account.role,
      blocked: account.blocked,
      tierName: account.tierName,
      status: account.status,
    })),
  };
}

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = String(form.get("intent") ?? "");
  const accountId = String(form.get("accountId") ?? "");

  // Role changes are Super-Admin-only; a plain Admin gets a 403 here.
  if (intent === "promote" || intent === "demote") {
    await requireSuperAdmin(request);
    const role = intent === "promote" ? "admin" : "subscriber";
    const result = await runtime.runPromise(
      setAccountRole(accountId, role).pipe(Effect.either),
    );
    return Either.isLeft(result)
      ? { error: "Couldn't change that account's role." }
      : { ok: intent === "promote" ? "Promoted to admin." : "Demoted to subscriber." };
  }

  // Block / unblock is available to all staff.
  await requireStaff(request);
  if (intent !== "block" && intent !== "unblock") {
    return { error: "Unknown action." };
  }
  const result = await runtime.runPromise(
    setAccountBlocked(accountId, intent === "block").pipe(Effect.either),
  );
  return Either.isLeft(result)
    ? { error: "Couldn't update that account." }
    : { ok: intent === "block" ? "Account blocked." : "Account unblocked." };
}

export default function AdminAccounts({
  loaderData,
  actionData,
}: Route.ComponentProps) {
  const { accounts, query, isSuperAdmin, currentAccountId } = loaderData;

  return (
    <main>
      <h1>Accounts</h1>
      <p>
        <Link to="/admin/dances">Manage dances</Link>
      </p>

      {actionData?.error ? <p role="alert">{actionData.error}</p> : null}
      {actionData?.ok ? <p role="status">{actionData.ok}</p> : null}

      <Form method="get">
        <label>
          Search by email
          <input type="search" name="q" defaultValue={query} />
        </label>
        <button type="submit">Search</button>
        {query ? <Link to="/admin/accounts">Clear</Link> : null}
      </Form>

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Tier</th>
            <th>Subscription</th>
            <th>Status</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => {
            const isSelf = account.id === currentAccountId;
            const isOwner = account.role === "super_admin";
            return (
              <tr key={account.id}>
                <td>{account.email}</td>
                <td>{account.role}</td>
                <td>{account.tierName ?? "—"}</td>
                <td>{account.status ?? "—"}</td>
                <td>{account.blocked ? "Blocked" : "Active"}</td>
                <td>
                  {!isOwner && !isSelf ? (
                    <Form method="post" style={{ display: "inline" }}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <button
                        type="submit"
                        name="intent"
                        value={account.blocked ? "unblock" : "block"}
                      >
                        {account.blocked ? "Unblock" : "Block"}
                      </button>
                    </Form>
                  ) : null}{" "}
                  {isSuperAdmin && !isOwner && account.role === "subscriber" ? (
                    <Form method="post" style={{ display: "inline" }}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <button type="submit" name="intent" value="promote">
                        Make admin
                      </button>
                    </Form>
                  ) : null}{" "}
                  {isSuperAdmin && account.role === "admin" ? (
                    <Form method="post" style={{ display: "inline" }}>
                      <input type="hidden" name="accountId" value={account.id} />
                      <button type="submit" name="intent" value="demote">
                        Remove admin
                      </button>
                    </Form>
                  ) : null}
                </td>
              </tr>
            );
          })}
          {accounts.length === 0 ? (
            <tr>
              <td colSpan={6}>No accounts match.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </main>
  );
}
