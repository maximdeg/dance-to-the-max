import { Effect } from "effect";
import { redirect } from "react-router";
import { runtime } from "~/runtime.server";
import { findAccountById, type Account } from "~/services/Accounts";
import {
  destroySession,
  establishSession,
  resolveSession,
} from "~/services/Sessions";
import {
  readSessionIdCookie,
  serializeClearedSessionCookie,
  serializeSessionIdCookie,
} from "./cookie.server";
import { isStaff, isSuperAdmin } from "./roles";

/**
 * Resolve the logged-in Account for a request, or `null`. Reads the session id
 * from the cookie, looks up the DB-backed Session, then the Account.
 */
export async function getAuthenticatedAccount(
  request: Request,
): Promise<Account | null> {
  const sessionId = await readSessionIdCookie(request);
  if (!sessionId) return null;

  return runtime.runPromise(
    Effect.gen(function* () {
      const session = yield* resolveSession(sessionId);
      if (!session) return null;
      return yield* findAccountById(session.accountId);
    }),
  );
}

/** Like `getAuthenticatedAccount`, but redirects to `/login` when signed out. */
export async function requireAccount(request: Request): Promise<Account> {
  const account = await getAuthenticatedAccount(request);
  if (!account) throw redirect("/login");
  return account;
}

/** The id of the request's current Session, if any (from the signed cookie). */
export async function getCurrentSessionId(
  request: Request,
): Promise<string | undefined> {
  return readSessionIdCookie(request);
}

/**
 * Require the request come from a signed-in Super Admin. Redirects a Visitor to
 * `/login`; a signed-in non-Super-Admin gets a 403 (they're authenticated but
 * not authorized for the admin surfaces).
 */
export async function requireSuperAdmin(request: Request): Promise<Account> {
  const account = await requireAccount(request);
  if (!isSuperAdmin(account.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return account;
}

/**
 * Require the request come from signed-in staff (Admin or Super Admin) — the
 * gate for the support console. A Visitor is redirected to `/login`; a
 * Subscriber gets a 403.
 */
export async function requireStaff(request: Request): Promise<Account> {
  const account = await requireAccount(request);
  if (!isStaff(account.role)) {
    throw new Response("Forbidden", { status: 403 });
  }
  return account;
}

/**
 * Create a login Session (enforcing the 3-concurrent-Session cap) and return
 * the `Set-Cookie` header value.
 */
export async function startSession(accountId: string): Promise<string> {
  const session = await runtime.runPromise(establishSession(accountId));
  return serializeSessionIdCookie(session.id);
}

/** Destroy the current Session (if any) and return a cleared `Set-Cookie`. */
export async function endSession(request: Request): Promise<string> {
  const sessionId = await readSessionIdCookie(request);
  if (sessionId) {
    await runtime.runPromise(destroySession(sessionId));
  }
  return serializeClearedSessionCookie(request);
}
