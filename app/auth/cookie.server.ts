import { createCookieSessionStorage } from "react-router";

// The cookie only carries the opaque `sessionId` of a row in the `sessions`
// table — never the account id or role directly. A long maxAge keeps the
// Subscriber logged in across visits.
const cookieSessionStorage = createCookieSessionStorage<{ sessionId: string }>({
  cookie: {
    name: "__dttm_session",
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secrets: [process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me"],
  },
});

export async function readSessionIdCookie(
  request: Request,
): Promise<string | undefined> {
  const cookie = await cookieSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  return cookie.get("sessionId");
}

/** Returns a `Set-Cookie` header value that stores the given session id. */
export async function serializeSessionIdCookie(
  sessionId: string,
): Promise<string> {
  const cookie = await cookieSessionStorage.getSession();
  cookie.set("sessionId", sessionId);
  return cookieSessionStorage.commitSession(cookie);
}

/** Returns a `Set-Cookie` header value that clears the session cookie. */
export async function serializeClearedSessionCookie(
  request: Request,
): Promise<string> {
  const cookie = await cookieSessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  return cookieSessionStorage.destroySession(cookie);
}
